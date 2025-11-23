const express = require('express')
const cors = require('cors')
const { randomUUID } = require('crypto')
const { connectDatabase, disconnectDatabase } = require('./server/database.cjs')
const { Product, Customer, Order, User } = require('./server/models.cjs')

const app = express()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  }),
)
app.options('*', cors())
app.use(express.json())

const rolePermissions = {
  admin: {
    products: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    customers: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    orders: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    users: ['GET'],
  },
  sales: {
    products: ['GET'],
    customers: ['GET', 'POST', 'PATCH'],
    orders: ['GET', 'POST', 'PATCH'],
  },
}

const protectedResources = new Set(['products', 'customers', 'orders', 'users'])

const createToken = (payload) =>
  Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Date.now(),
    }),
  ).toString('base64')

const decodeToken = (token) => {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString())
  } catch (error) {
    throw new Error('Invalid token')
  }
}

const isMethodAllowed = (role, resource, method) => {
  if (method === 'OPTIONS') {
    return true
  }
  const rules = rolePermissions[role]
  if (!rules) {
    return false
  }
  const allowedMethods = rules[resource]
  if (!allowedMethods) {
    return false
  }
  return allowedMethods.includes(method)
}

const extractResource = (urlPath = '') => {
  const segments = urlPath.split('?')[0].split('/').filter(Boolean)
  return segments[0] || ''
}

const respondUnauthorized = (res, message = 'Yeu cau dang nhap') =>
  res.status(401).json({ message })

const respondForbidden = (res, message = 'Khong co quyen thuc hien hanh dong nay') =>
  res.status(403).json({ message })

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

const sanitizePayload = (payload = {}) => {
  if (payload === null || typeof payload !== 'object') {
    return {}
  }
  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (key === '_id' || key === '__v') {
      return acc
    }
    acc[key] = value
    return acc
  }, {})
}

const formatDocument = (doc) => {
  if (!doc) {
    return doc
  }
  const plain = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc }
  if (!plain.id && plain._id) {
    plain.id = plain._id.toString()
  }
  delete plain._id
  delete plain.__v
  return plain
}

const ensureId = (value) => {
  if (value === undefined || value === null) {
    return undefined
  }
  return String(value)
}

const createCrudRouter = (resourceLabel, Model) => {
  const router = express.Router()

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const documents = await Model.find().lean()
      res.json(documents.map(formatDocument))
    }),
  )

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const document = await Model.findOne({ id: ensureId(req.params.id) }).lean()
      if (!document) {
        return res.status(404).json({ message: `${resourceLabel} khong ton tai` })
      }
      return res.json(formatDocument(document))
    }),
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const payload = sanitizePayload(req.body)
      payload.id = ensureId(payload.id) || randomUUID()
      const created = await Model.create(payload)
      res.status(201).json(formatDocument(created))
    }),
  )

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const payload = sanitizePayload(req.body)
      delete payload.id
      const updated = await Model.findOneAndUpdate(
        { id: ensureId(req.params.id) },
        payload,
        { new: true, runValidators: true },
      ).lean()

      if (!updated) {
        return res.status(404).json({ message: `${resourceLabel} khong ton tai` })
      }
      return res.json(formatDocument(updated))
    }),
  )

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const deleted = await Model.findOneAndDelete({ id: ensureId(req.params.id) })
      if (!deleted) {
        return res.status(404).json({ message: `${resourceLabel} khong ton tai` })
      }
      return res.status(204).end()
    }),
  )

  return router
}

app.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Vui long nhap day du tai khoan va mat khau' })
    }

    const user = await User.findOne({ username: String(username).trim() }).lean()
    if (!user || user.password !== password) {
      return respondUnauthorized(res, 'Tai khoan hoac mat khau khong dung')
    }

    const token = createToken({
      id: user.id,
      role: user.role,
      username: user.username,
    })

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    })
  }),
)

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  if (req.path === '/login') {
    return next()
  }

  const resource = extractResource(req.path)
  if (!resource || !protectedResources.has(resource)) {
    return next()
  }

  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return respondUnauthorized(res, 'Thieu token xac thuc')
  }

  const token = authHeader.slice(7)
  let session
  try {
    session = decodeToken(token)
  } catch (error) {
    return respondUnauthorized(res, 'Token khong hop le')
  }

  if (!isMethodAllowed(session.role, resource, req.method)) {
    return respondForbidden(res)
  }

  req.user = session
  return next()
})

app.use('/products', createCrudRouter('San pham', Product))
app.use('/customers', createCrudRouter('Khach hang', Customer))
app.use('/orders', createCrudRouter('Don hang', Order))

const usersRouter = express.Router()
usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await User.find().lean()
    res.json(users.map(formatDocument))
  }),
)
app.use('/users', usersRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use((error, _req, res, _next) => {
  console.error('API error:', error)
  const message = error?.message || 'Co loi xay ra tren server'
  res.status(error?.statusCode || 500).json({ message })
})

const PORT = process.env.PORT || 4000

const startServer = async () => {
  try {
    await connectDatabase()
    app.listen(PORT, () => {
      console.log(`Mongo-powered API is running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Khong the khoi dong server:', error)
    process.exit(1)
  }
}

const shutdown = async () => {
  await disconnectDatabase()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

startServer()
