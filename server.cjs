const path = require('path');
const jsonServer = require('json-server');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

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
};

const createToken = (payload) =>
  Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Date.now(),
    }),
  ).toString('base64');

const decodeToken = (token) => {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const isMethodAllowed = (role, resource, method) => {
  if (method === 'OPTIONS') {
    return true;
  }
  const rules = rolePermissions[role];
  if (!rules) {
    return false;
  }
  const allowed = rules[resource];
  if (!allowed) {
    return false;
  }
  return allowed.includes(method);
};

const extractResource = (urlPath = '') => {
  const segments = urlPath.split('?')[0].split('/').filter(Boolean);
  return segments[0] || '';
};

const respondUnauthorized = (res, message = 'Yeu cau dang nhap') =>
  res.status(401).json({ message });

const respondForbidden = (res, message = 'Khong co quyen thuc hien hanh dong nay') =>
  res.status(403).json({ message });

server.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui long nhap day du tai khoan va mat khau' });
  }

  const user = router.db.get('users').find({ username }).value();
  if (!user || user.password !== password) {
    return respondUnauthorized(res, 'Tai khoan hoac mat khau khong dung');
  }

  const token = createToken({ id: user.id, role: user.role, username: user.username });
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    },
  });
});

server.use((req, res, next) => {
  if (req.path === '/login') {
    return next();
  }

  const resource = extractResource(req.path);
  const protectedResources = ['products', 'customers', 'orders', 'users'];

  if (!resource || !protectedResources.includes(resource)) {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return respondUnauthorized(res, 'Thieu token xac thuc');
  }

  const token = authHeader.slice(7);
  let session;
  try {
    session = decodeToken(token);
  } catch (error) {
    return respondUnauthorized(res, 'Token khong hop le');
  }

  if (!isMethodAllowed(session.role, resource, req.method)) {
    return respondForbidden(res);
  }

  req.user = session;
  return next();
});

server.use(router);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Role-based json-server is running at http://localhost:${PORT}`);
});
