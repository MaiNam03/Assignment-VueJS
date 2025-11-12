const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

const defaultHeaders = {
  'Content-Type': 'application/json',
}

let authToken = null

export const setAuthToken = (token) => {
  authToken = token
}

const parseResponseBody = async (response) => {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    return text
  }
}

const buildPath = (resource, id) =>
  id !== undefined && id !== null
    ? `/${resource}/${encodeURIComponent(String(id))}`
    : `/${resource}`

const request = async (path, options = {}) => {
  const { skipAuth = false, ...rest } = options
  const headers = {
    ...defaultHeaders,
    ...(rest.headers ?? {}),
  }

  if (!skipAuth) {
    if (!authToken) {
      throw new Error('Missing authentication token')
    }
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
  })

  const payload = await parseResponseBody(response)

  if (!response.ok) {
    const message =
      (payload && payload.message) ||
      (typeof payload === 'string' ? payload : null) ||
      `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

export const api = {
  login: (credentials) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    }),
  fetchProducts: () => request(buildPath('products')),
  createProduct: (payload) =>
    request(buildPath('products'), {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProduct: (id, payload) =>
    request(buildPath('products', id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteProduct: (id) =>
    request(buildPath('products', id), {
      method: 'DELETE',
    }),
  fetchCustomers: () => request(buildPath('customers')),
  createCustomer: (payload) =>
    request(buildPath('customers'), {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCustomer: (id, payload) =>
    request(buildPath('customers', id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteCustomer: (id) =>
    request(buildPath('customers', id), {
      method: 'DELETE',
    }),
  fetchOrders: () => request(buildPath('orders')),
  updateOrder: (id, payload) =>
    request(buildPath('orders', id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteOrder: (id) =>
    request(buildPath('orders', id), {
      method: 'DELETE',
    }),
}
