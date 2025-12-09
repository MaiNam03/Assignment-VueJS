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
    users: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
  staff: {
    products: ['GET'],
    customers: ['GET', 'POST', 'PATCH'],
    orders: ['GET', 'POST', 'PATCH'],
  },
  sales: {
    products: ['GET'],
    customers: ['GET', 'POST', 'PATCH'],
    orders: ['GET', 'POST', 'PATCH'],
  },
  customer: {
    products: ['GET'],
    orders: ['GET', 'POST', 'PATCH'],
  },
}

const protectedResources = new Set(['products', 'customers', 'orders', 'users'])

const normalizeRole = (role) => {
  if (role === 'sales') {
    return 'staff'
  }
  return role
}

const allowedUserRoles = new Set(['admin', 'staff', 'customer'])

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
  const resolvedRole = normalizeRole(role)
  const rules = rolePermissions[resolvedRole]
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

const presentUser = (user) => {
  const formatted = formatDocument(user)
  if (formatted?.role) {
    formatted.role = normalizeRole(formatted.role)
  }
  return formatted
}

const ensureId = (value) => {
  if (value === undefined || value === null) {
    return undefined
  }
  return String(value)
}

const buildCustomerFromUser = (user = {}) => ({
  id: ensureId(user.id) || randomUUID(),
  name: user.name || user.username || 'Khach hang',
  email: user.email || `${(user.username || 'customer').trim()}@example.com`,
  phone: user.phone || '0000000000',
  tier: 'Standard',
  address: user.address || '',
  notes: user.notes || '',
  totalOrders: 0,
  totalSpend: 0,
  joinedAt: user.createdAt || new Date().toISOString(),
})

const ensureCustomerForUser = async (user) => {
  if (!user || normalizeRole(user.role) !== 'customer') return
  await Customer.findOneAndUpdate(
    { id: ensureId(user.id) },
    buildCustomerFromUser(user),
    { upsert: true, new: true },
  )
}

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeSearchText = (value) => String(value || '').trim().toLowerCase()

const isOrderOwnedByUser = (order, user) => {
  if (!order || !user) {
    return false
  }
  const matchesById =
    order.customerId && ensureId(order.customerId) === ensureId(user.id)
  const matchesByUsername =
    order.username &&
    normalizeSearchText(order.username) === normalizeSearchText(user.username)
  const matchesByName =
    order.customer &&
    normalizeSearchText(order.customer) === normalizeSearchText(user.name)

  return Boolean(matchesById || matchesByUsername || matchesByName)
}

const buildOrderOwnershipQuery = (user) => {
  if (!user) {
    return {}
  }
  const conditions = []
  if (user.id) {
    conditions.push({ customerId: ensureId(user.id) })
  }
  if (user.username) {
    conditions.push({
      username: new RegExp(`^${escapeRegex(user.username)}$`, 'i'),
    })
  }
  if (user.name) {
    conditions.push({
      customer: new RegExp(`^${escapeRegex(user.name)}$`, 'i'),
    })
  }
  return conditions.length ? { $or: conditions } : {}
}

const hasAnotherAdmin = async (excludeUserId) => {
  const query = { role: 'admin' }
  if (excludeUserId) {
    query.id = { $ne: ensureId(excludeUserId) }
  }
  const existingAdmin = await User.findOne(query).lean()
  return Boolean(existingAdmin)
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

    const userRole = normalizeRole(user.role)
    await ensureCustomerForUser(user)
    const token = createToken({
      id: user.id,
      role: userRole,
      username: user.username,
    })

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: userRole,
      },
    })
  }),
)

app.post(
  '/register',
  asyncHandler(async (req, res) => {
    const payload = sanitizePayload(req.body)
    const username = String(payload.username || '').trim()
    const password = String(payload.password || '').trim()
    const name = String(payload.name || '').trim()

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Vui long nhap day du ten, tai khoan va mat khau' })
    }

    const existingUsername = await User.findOne({ username }).lean()
    if (existingUsername) {
      return res.status(409).json({ message: 'Ten tai khoan da ton tai' })
    }

    const created = await User.create({
      id: ensureId(payload.id) || randomUUID(),
      username,
      password,
      name,
      role: 'customer',
      email: payload.email || '',
      phone: payload.phone || '',
      address: payload.address || '',
      notes: payload.notes || '',
    })

    await ensureCustomerForUser(created)

    const token = createToken({
      id: created.id,
      role: 'customer',
      username: created.username,
    })

    return res.status(201).json({
      token,
      user: {
        id: created.id,
        name: created.name,
        username: created.username,
        role: 'customer',
      },
    })
  }),
)

app.use(
  asyncHandler(async (req, res, next) => {
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204)
    }

    if (req.path === '/login' || req.path === '/register') {
      return next()
    }

    const resource = extractResource(req.path)
    if (!resource || !protectedResources.has(resource)) {
      return next()
    }

    if (resource === 'products' && req.method === 'GET') {
      return next()
    }

    if (resource === 'orders' && req.method === 'POST') {
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

    const user = await User.findOne({ id: ensureId(session.id) }).lean()
    if (!user) {
      return respondUnauthorized(res, 'Tai khoan khong ton tai')
    }

    const resolvedRole = normalizeRole(user.role)

    if (!isMethodAllowed(resolvedRole, resource, req.method)) {
      return respondForbidden(res)
    }

    req.user = {
      ...session,
      role: resolvedRole,
      name: user.name,
      username: user.username,
    }
    return next()
  }),
)

app.use('/products', createCrudRouter('San pham', Product))
app.use('/customers', createCrudRouter('Khach hang', Customer))

const ordersRouter = express.Router()

ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query =
      req.user?.role === 'customer' ? buildOrderOwnershipQuery(req.user) : {}
    const orders = await Order.find(query).lean()
    res.json(orders.map(formatDocument))
  }),
)

ordersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ id: ensureId(req.params.id) }).lean()
    if (!order) {
      return res.status(404).json({ message: 'Don hang khong ton tai' })
    }
    if (req.user?.role === 'customer' && !isOrderOwnedByUser(order, req.user)) {
      return respondForbidden(res, 'Ban khong co quyen xem don hang nay')
    }
    return res.json(formatDocument(order))
  }),
)

ordersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = sanitizePayload(req.body)
    payload.id = ensureId(payload.id) || randomUUID()
    const created = await Order.create(payload)
    res.status(201).json(formatDocument(created))
  }),
)

ordersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const payload = sanitizePayload(req.body)
    delete payload.id
    const orderId = ensureId(req.params.id)

    const existing = await Order.findOne({ id: orderId }).lean()
    if (!existing) {
      return res.status(404).json({ message: 'Don hang khong ton tai' })
    }

    if (req.user?.role === 'customer') {
      if (!isOrderOwnedByUser(existing, req.user)) {
        return respondForbidden(res, 'Ban khong co quyen sua don hang nay')
      }

      if (payload.status !== 'cancelled') {
        return respondForbidden(res, 'Chi co the huy don hang cua ban.')
      }

      if (['cancelled', 'delivered'].includes(existing.status)) {
        return res
          .status(400)
          .json({ message: 'Don hang da duoc xu ly, khong the huy.' })
      }

      const cancelled = await Order.findOneAndUpdate(
        { id: orderId },
        { status: 'cancelled' },
        { new: true, runValidators: true },
      ).lean()
      return res.json(formatDocument(cancelled))
    }

    const updated = await Order.findOneAndUpdate(
      { id: orderId },
      payload,
      { new: true, runValidators: true },
    ).lean()

    if (!updated) {
      return res.status(404).json({ message: 'Don hang khong ton tai' })
    }

    return res.json(formatDocument(updated))
  }),
)

ordersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await Order.findOneAndDelete({ id: ensureId(req.params.id) })
    if (!deleted) {
      return res.status(404).json({ message: 'Don hang khong ton tai' })
    }
    return res.status(204).end()
  }),
)

app.use('/orders', ordersRouter)

const usersRouter = express.Router()
usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await User.find().lean()
    res.json(users.map(presentUser))
  }),
)

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = sanitizePayload(req.body)
    const username = String(payload.username || '').trim()
    const password = String(payload.password || '').trim()
    const name = String(payload.name || '').trim()
    const role = normalizeRole(payload.role)

    if (!username || !password || !name || !role) {
      return res
        .status(400)
        .json({ message: 'Vui long nhap day du ten, tai khoan, mat khau va vai tro' })
    }

    if (!allowedUserRoles.has(role)) {
      return res.status(400).json({ message: 'Vai tro khong hop le' })
    }

    if (role === 'admin' && (await hasAnotherAdmin())) {
      return res
        .status(409)
        .json({ message: 'Chi duoc phep ton tai 1 tai khoan admin duy nhat' })
    }

    const existingUsername = await User.findOne({ username }).lean()
    if (existingUsername) {
      return res.status(409).json({ message: 'Ten tai khoan da ton tai' })
    }

    const created = await User.create({
      id: ensureId(payload.id) || randomUUID(),
      username,
      password,
      name,
      role,
      email: payload.email || '',
      phone: payload.phone || '',
      address: payload.address || '',
      notes: payload.notes || '',
    })

    await ensureCustomerForUser(created)

    return res.status(201).json(presentUser(created))
  }),
)

usersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const payload = sanitizePayload(req.body)
    delete payload.id
    delete payload.username
    const userId = ensureId(req.params.id)

    const existing = await User.findOne({ id: userId }).lean()
    if (!existing) {
      return res.status(404).json({ message: 'Tai khoan khong ton tai' })
    }

    const updates = {}

    if (payload.name !== undefined) {
      const trimmedName = String(payload.name || '').trim()
      if (!trimmedName) {
        return res.status(400).json({ message: 'Ten nguoi dung khong duoc de trong' })
      }
      updates.name = trimmedName
    }

    if (payload.password !== undefined) {
      const trimmedPassword = String(payload.password || '').trim()
      if (!trimmedPassword) {
        return res.status(400).json({ message: 'Mat khau khong duoc de trong' })
      }
      updates.password = trimmedPassword
    }

    if (payload.role !== undefined) {
      const nextRole = normalizeRole(payload.role)
      if (!allowedUserRoles.has(nextRole)) {
        return res.status(400).json({ message: 'Vai tro khong hop le' })
      }

      const currentRole = normalizeRole(existing.role)
      if (nextRole === 'admin') {
        const anotherAdmin = await hasAnotherAdmin(existing.id)
        if (anotherAdmin) {
          return res
            .status(409)
            .json({ message: 'Chi duoc phep ton tai 1 tai khoan admin duy nhat' })
        }
      } else if (currentRole === 'admin') {
        const anotherAdmin = await hasAnotherAdmin(existing.id)
        if (!anotherAdmin) {
          return res
            .status(400)
            .json({ message: 'Khong the bo quyen admin cua tai khoan duy nhat' })
        }
      }

      updates.role = nextRole
    }

    if (!Object.keys(updates).length) {
      return res.json(presentUser(existing))
    }

    const updated = await User.findOneAndUpdate({ id: userId }, updates, {
      new: true,
      runValidators: true,
    }).lean()
    await ensureCustomerForUser(updated)
    return res.json(presentUser(updated))
  }),
)

usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = ensureId(req.params.id)
    const target = await User.findOne({ id: userId }).lean()
    if (!target) {
      return res.status(404).json({ message: 'Tai khoan khong ton tai' })
    }

    if (normalizeRole(target.role) === 'admin' && !(await hasAnotherAdmin(target.id))) {
      return res
        .status(400)
        .json({ message: 'Khong the xoa tai khoan admin duy nhat' })
    }

    await User.deleteOne({ id: userId })
    await Customer.deleteOne({ id: userId })
    return res.status(204).end()
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
