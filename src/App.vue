<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AddCustomerModal from './components/AddCustomerModal.vue'
import AddProductModal from './components/AddProductModal.vue'
import CustomerTable from './components/CustomerTable.vue'
import OrderTable from './components/OrderTable.vue'
import OverviewDashboard from './components/OverviewDashboard.vue'
import ProductTable from './components/ProductTable.vue'
import CustomerPortal from './components/CustomerPortal.vue'
import UserManagement from './components/UserManagement.vue'
import { api, setAuthToken } from './services/api'

const products = ref([])

const orders = ref([])

const customers = ref([])

const users = ref([])

const normalizeText = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const readStoredSession = () => {
  if (typeof window === 'undefined') {
    return { token: '', user: null }
  }
  try {
    const token = window.localStorage.getItem('authToken') ?? ''
    const userRaw = window.localStorage.getItem('currentUser')
    const user = userRaw ? JSON.parse(userRaw) : null
    return { token, user }
  } catch (error) {
    return { token: '', user: null }
  }
}

const { token: initialToken, user: initialUser } = readStoredSession()

const authToken = ref(initialToken)
const currentUser = ref(initialUser)

if (authToken.value) {
  setAuthToken(authToken.value)
}

const isAuthenticated = computed(() => Boolean(authToken.value && currentUser.value))
const effectiveRole = computed(() => {
  const role = currentUser.value?.role
  if (!role) {
    return ''
  }
  return role === 'sales' ? 'staff' : role
})

const loginForm = reactive({
  name: '',
  username: '',
  password: '',
  phone: '',
})

const authError = ref('')
const isAuthenticating = ref(false)
const isSyncingCustomers = ref(false)
const showLoginModal = ref(false)
const authMode = ref('login')

const roleLabels = {
  admin: 'Quan tri vien',
  staff: 'Nhan vien',
  sales: 'Nhan vien',
  customer: 'Khach hang',
}

const currentRoleLabel = computed(() =>
  effectiveRole.value ? roleLabels[effectiveRole.value] ?? effectiveRole.value : 'Chua xac dinh',
)

const assignableRoles = [
  { value: 'staff', label: 'Nhan vien' },
  { value: 'customer', label: 'Khach hang' },
]

const isLoadingUsers = ref(false)
const isLoadingOrders = ref(false)
const creatingUser = ref(false)
const savingUserId = ref('')
const deletingUserId = ref('')
const placingCustomerOrder = ref(false)
const cancellingCustomerOrderId = ref('')
const showThankYou = ref(false)
const thankYouSummary = ref(null)

const resetDataCollections = () => {
  products.value = []
  orders.value = []
  customers.value = []
  users.value = []
  isLoadingUsers.value = false
  isLoadingOrders.value = false
  cancellingCustomerOrderId.value = ''
}

const loadOrdersForCurrentRole = async () => {
  if (!isAuthenticated.value) {
    orders.value = []
    isLoadingOrders.value = false
    return
  }

  const role = effectiveRole.value
  const requestOptions = role === 'customer' ? { query: { mine: '1' } } : {}

  isLoadingOrders.value = true
  try {
    const orderData = await api.fetchOrders(requestOptions)
    orders.value = orderData
  } catch (error) {
    console.error('Failed to load orders', error)
    if (role === 'customer') {
      window.alert(error.message || 'Khong the tai danh sach don hang cua ban.')
    }
  } finally {
    isLoadingOrders.value = false
  }
}

const bootstrapData = async () => {
  resetDataCollections()
  const role = effectiveRole.value
  const loaders = []

  loaders.push(
    api
      .fetchProducts({ skipAuth: !isAuthenticated.value })
      .then((productData) => {
        products.value = productData
      })
      .catch((error) => {
        console.error('Failed to load products', error)
      }),
  )

  if (isAuthenticated.value) {
    loaders.push(loadOrdersForCurrentRole())

    if (['admin', 'staff'].includes(role)) {
      loaders.push(
        api.fetchCustomers().then((customerData) => {
          customers.value = customerData
        }),
      )
    }

    if (role === 'admin') {
      isLoadingUsers.value = true
      loaders.push(
        api
          .fetchUsers()
          .then((userData) => {
            users.value = userData
          })
          .finally(() => {
            isLoadingUsers.value = false
          }),
      )
    } else {
      isLoadingUsers.value = false
    }
  } else {
    isLoadingUsers.value = false
    isLoadingOrders.value = false
  }

  try {
    await Promise.all(loaders)
  } catch (error) {
    console.error('Failed to load data from API', error)
    window.alert('Không thể tải dữ liệu. Vui lòng kiểm tra server API và thông tin đăng nhập.')
  }
}

onMounted(bootstrapData)

const notifyActionError = (message, error) => {
  console.error(message, error)
  window.alert(message)
}

const requirePermission = (condition, message) => {
  if (condition) {
    return true
  }
  window.alert(message)
  return false
}

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    authError.value = 'Vui lòng nhập đầy đủ tài khoản và mật khẩu'
    return
  }

  authError.value = ''
  isAuthenticating.value = true
  try {
    const response = await api.login({
      username: loginForm.username,
      password: loginForm.password,
    })
    authToken.value = response.token
    currentUser.value = response.user
    setAuthToken(response.token)
    showLoginModal.value = false
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('authToken', response.token)
      window.localStorage.setItem('currentUser', JSON.stringify(response.user))
    }
    loginForm.password = ''
    activeModule.value = response.user.role === 'customer' ? 'shop' : 'overview'
    await bootstrapData()
  } catch (error) {
    authError.value = error.message || 'Đăng nhập thất bại'
  } finally {
    isAuthenticating.value = false
  }
}

const handleRegister = async () => {
  if (!loginForm.name || !loginForm.username || !loginForm.password || !loginForm.phone) {
    authError.value = 'Vui lòng nhập đầy đủ họ tên, số điện thoại, tài khoản và mật khẩu'
    return
  }
  authError.value = ''
  isAuthenticating.value = true
  try {
    const response = await api.register({
      name: loginForm.name,
      phone: loginForm.phone,
      username: loginForm.username,
      password: loginForm.password,
    })
    authToken.value = response.token
    currentUser.value = response.user
    setAuthToken(response.token)
    if (response.user?.role === 'customer') {
      users.value = [response.user, ...users.value]
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('authToken', response.token)
      window.localStorage.setItem('currentUser', JSON.stringify(response.user))
    }
    loginForm.password = ''
    loginForm.name = ''
    loginForm.phone = ''
    activeModule.value = 'shop'
    await bootstrapData()
    window.alert('Đăng ký thành công! Bạn đã được đăng nhập.')
  } catch (error) {
    authError.value = error.message || 'Đăng ký thất bại'
  } finally {
    isAuthenticating.value = false
  }
}

const closeLoginModal = () => {
  showLoginModal.value = false
  authError.value = ''
  loginForm.password = ''
  loginForm.name = ''
  loginForm.phone = ''
  authMode.value = 'login'
}

const handleLogout = () => {
  authToken.value = ''
  currentUser.value = null
  setAuthToken(null)
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('authToken')
    window.localStorage.removeItem('currentUser')
  }
  loginForm.username = ''
  loginForm.password = ''
  activeModule.value = 'shop'
  isLoadingUsers.value = false
  creatingUser.value = false
  savingUserId.value = ''
  deletingUserId.value = ''
  showLoginModal.value = false
  resetDataCollections()
}

const canViewProducts = computed(
  () => !isAuthenticated.value || ['admin', 'staff', 'customer'].includes(effectiveRole.value),
)
const canManageProducts = computed(() => effectiveRole.value === 'admin')
const canManageCustomers = computed(() => ['admin', 'staff'].includes(effectiveRole.value))
const canDeleteCustomers = computed(() => effectiveRole.value === 'admin')
const canManageOrders = computed(() => ['admin', 'staff'].includes(effectiveRole.value))
const canDeleteOrders = computed(() => effectiveRole.value === 'admin')
const canManageUsers = computed(() => effectiveRole.value === 'admin')

const activeModule = ref('overview')

const moduleTabs = computed(() => {
  const tabs = []
  if (effectiveRole.value === 'customer') {
    tabs.push({ key: 'shop', label: 'Mua hàng' })
    return tabs
  }
  tabs.push({ key: 'overview', label: 'Thống kê' })
  tabs.push({ key: 'products', label: 'Quản lý sản phẩm' })
  tabs.push({ key: 'orders', label: 'Quản lý đơn hàng' })
  tabs.push({ key: 'customers', label: 'Quản lý khách hàng' })
  if (effectiveRole.value === 'admin') {
    tabs.push({ key: 'users', label: 'Quản lý tài khoản' })
  }
  return tabs
})
watch(
  moduleTabs,
  (tabs) => {
    if (!tabs.find((tab) => tab.key === activeModule.value)) {
      activeModule.value = tabs[0]?.key ?? 'overview'
    }
  },
  { immediate: true },
)
const handleCreateUser = async (payload) => {
  if (
    !requirePermission(
      canManageUsers.value,
      'Chi admin moi duoc phep tao va cap quyen tai khoan.',
    )
  ) {
    return
  }
  creatingUser.value = true
  try {
    const created = await api.createUser(payload)
    users.value = [created, ...users.value]
  } catch (error) {
    notifyActionError(error.message || 'Khong the tao tai khoan moi.', error)
  } finally {
    creatingUser.value = false
  }
}

const handleUpdateUserRole = async ({ id, role }) => {
  if (
    !requirePermission(
      canManageUsers.value,
      'Chi admin moi duoc phep thay doi vai tro tai khoan.',
    )
  ) {
    return
  }
  savingUserId.value = id
  try {
    const updated = await api.updateUser(id, { role })
    users.value = users.value.map((user) => (user.id === id ? updated : user))
    if (currentUser.value?.id === id) {
      currentUser.value = { ...currentUser.value, role: updated.role }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('currentUser', JSON.stringify(currentUser.value))
      }
    }
  } catch (error) {
    notifyActionError(error.message || 'Khong the cap nhat vai tro tai khoan.', error)
  } finally {
    savingUserId.value = ''
  }
}

const handleDeleteUser = async (userId) => {
  if (
    !requirePermission(
      canManageUsers.value,
      'Chi admin moi duoc phep xoa tai khoan nguoi dung.',
    )
  ) {
    return
  }
  if (currentUser.value?.id === userId) {
    window.alert('Khong the xoa tai khoan dang dang nhap.')
    return
  }
  const target = users.value.find((user) => user.id === userId)
  if (!target) {
    return
  }
  if (!window.confirm(`Xoa tai khoan "${target.username}"?`)) {
    return
  }
  deletingUserId.value = userId
  try {
    await api.deleteUser(userId)
    users.value = users.value.filter((user) => user.id !== userId)
  } catch (error) {
    notifyActionError(error.message || 'Khong the xoa tai khoan.', error)
  } finally {
    deletingUserId.value = ''
  }
}

const orderStatuses = [
  {
    value: 'pending',
    label: 'Chờ xác nhận',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  {
    value: 'processing',
    label: 'Đang xử lý',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  {
    value: 'shipped',
    label: 'Đang giao',
    badge: 'bg-sky-100 text-sky-700',
    dot: 'bg-sky-500',
  },
  {
    value: 'delivered',
    label: 'Đã giao',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  {
    value: 'cancelled',
    label: 'Đã huỷ',
    badge: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
  },
]


const showProductModal = ref(false)
const productModalMode = ref('create')
const editingProduct = ref(null)
const previewProduct = ref(null)

const showCustomerModal = ref(false)
const customerModalMode = ref('create')
const editingCustomer = ref(null)
const previewCustomer = ref(null)

const previewOrder = ref(null)

const defaultProductCategories = [
  'Mon an',
  'Do uong',
  'Trang mieng',
  'Salad',
  'Khai vi',
  'Bakery',
]

const categories = computed(() => {
  const unique = new Set(defaultProductCategories)
  products.value.forEach((product) => {
    if (product.category) {
      unique.add(product.category)
    }
  })
  return Array.from(unique)
})

const defaultCustomerTiers = ['Standard', 'Thân thiết', 'VIP']
const customerTiers = computed(() => {
  const unique = new Set(defaultCustomerTiers)
  customers.value.forEach((customer) => unique.add(customer.tier))
  return Array.from(unique)
})

const resolvedOrders = computed(() =>
  orders.value.map((order) => {
    const orderName = normalizeText(order.customer)
    const orderPhone = normalizeText(order.phone)
    const matchedCustomer =
      users.value.find((u) => {
        if (u.role !== 'customer') return false
        const nameMatch = orderName && normalizeText(u.name) === orderName
        const usernameMatch = orderName && normalizeText(u.username) === orderName
        const phoneMatch = orderPhone && normalizeText(u.phone) === orderPhone
        const idMatch = order.customerId && u.id === order.customerId
        return nameMatch || usernameMatch || phoneMatch || idMatch
      }) || null

      return {
        ...order,
        customerId: order.customerId || matchedCustomer?.id || order.customer,
        customer: matchedCustomer?.name || order.customer || 'Khách hàng',
        username: order.username || matchedCustomer?.username || '',
        phone: order.phone || matchedCustomer?.phone || '',
        email: order.email || matchedCustomer?.email || '',
        address: order.address || matchedCustomer?.address || '',
      }
    }),
)

const isOrderOwnedByCurrentCustomer = (order) => {
  if (!order || effectiveRole.value !== 'customer' || !currentUser.value) {
    return false
  }
  const orderCustomerId = order.customerId ? String(order.customerId) : ''
  const userId = currentUser.value?.id ? String(currentUser.value.id) : ''
  const orderCustomer = normalizeText(order.customer)
  const orderUsername = normalizeText(order.username)
  const currentName = normalizeText(currentUser.value?.name)
  const currentUsername = normalizeText(currentUser.value?.username)

  return (
    (!!userId && orderCustomerId === userId) ||
    (!!currentUsername && orderUsername === currentUsername) ||
    (!!currentName && orderCustomer === currentName)
  )
}

const customerOrders = computed(() =>
  resolvedOrders.value
    .filter((order) => isOrderOwnedByCurrentCustomer(order))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
)

const orderStats = computed(() => {
  const stats = new Map()
  resolvedOrders.value.forEach((order) => {
    const keys = [
      order.customerId,
      normalizeText(order.customer),
      normalizeText(order.username),
      normalizeText(order.phone),
      order.email,
    ].filter(Boolean)
    if (!keys.length) {
      keys.push(order.id)
    }
    keys.forEach((key) => {
      if (!stats.has(key)) {
        stats.set(key, { orders: 0, spend: 0 })
      }
      const entry = stats.get(key)
      entry.orders += 1
      entry.spend += order.total || 0
    })
  })
  return stats
})

const customerAccounts = computed(() => {
  const result = []
  const seen = new Set()

  const getStats = ({ id, name, username, phone, email }) => {
    const keys = [
      id,
      normalizeText(name),
      normalizeText(username),
      normalizeText(phone),
      email,
    ].filter(Boolean)
    const stat = keys.map((k) => orderStats.value.get(k)).find(Boolean)
    return stat || { orders: 0, spend: 0 }
  }

  const pushEntry = (entry) => {
    const key =
      entry.id ||
      normalizeText(entry.email) ||
      normalizeText(entry.phone) ||
      normalizeText(entry.name)
    if (seen.has(key)) return
    seen.add(key)
    result.push(entry)
  }

  // Ưu tiên tài khoản người dùng (users)
  users.value
    .filter((u) => u.role === 'customer')
    .forEach((u) => {
      const stat = getStats(u)
      pushEntry({
        id: u.id,
        name: u.name || u.username || 'Khách hàng',
        email: u.email || '',
        phone: u.phone || '',
        totalOrders: stat.orders,
        totalSpend: stat.spend,
        tier: u.tier || 'Standard',
        joinedAt: u.createdAt || new Date().toISOString(),
        address: u.address || '',
        notes: u.notes || '',
      })
    })

  // Bổ sung từ collection customers (nếu có) và tính lại thống kê từ orders
  customers.value.forEach((c) => {
    const stat = getStats(c)
    pushEntry({
      id: c.id,
      name: c.name || 'Khách hàng',
      email: c.email || '',
      phone: c.phone || '',
      totalOrders: stat.orders || c.totalOrders || 0,
      totalSpend: stat.spend || c.totalSpend || 0,
      tier: c.tier || 'Standard',
      joinedAt: c.joinedAt || new Date().toISOString(),
      address: c.address || '',
      notes: c.notes || '',
    })
  })

  return result
})

const syncCustomersFromAccounts = async () => {
  if (!canManageCustomers.value) {
    window.alert('Bạn không có quyền đồng bộ khách hàng.')
    return
  }
  if (!customerAccounts.value.length) {
    window.alert('Không có dữ liệu khách hàng để đồng bộ.')
    return
  }
  isSyncingCustomers.value = true
  try {
    const existing = await api.fetchCustomers()
    await Promise.all(existing.map((c) => api.deleteCustomer(c.id)))

    const newCustomers = []
    for (const account of customerAccounts.value) {
      const payload = {
        id: account.id,
        name: account.name || 'Khách hàng',
        email:
          account.email ||
          `${(account.username || account.name || 'customer').replace(/\s+/g, '').toLowerCase()}@example.com`,
        phone: account.phone || '0000000000',
        tier: account.tier || 'Standard',
        address: account.address || '',
        notes: account.notes || '',
        totalOrders: account.totalOrders || 0,
        totalSpend: account.totalSpend || 0,
        joinedAt: account.joinedAt || new Date().toISOString(),
      }
      const created = await api.createCustomer(payload)
      newCustomers.push(created)
    }
    customers.value = newCustomers
    window.alert('Đồng bộ khách hàng thành công.')
  } catch (error) {
    console.error('Sync customers failed', error)
    window.alert(error.message || 'Không thể đồng bộ khách hàng.')
  } finally {
    isSyncingCustomers.value = false
  }
}


const getOrderStatusInfo = (value) =>
  orderStatuses.find((status) => status.value === value) ?? {
    label: 'Không xác định',
    badge: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  }

const previewOrderStatus = computed(() =>
  previewOrder.value ? getOrderStatusInfo(previewOrder.value.status) : null,
)

const getTierBadgeClass = (tier) => {
  switch (tier) {
    case 'VIP':
      return 'bg-amber-100 text-amber-700'
    case 'Thân thiết':
      return 'bg-sky-100 text-sky-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value ?? 0)

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : ''

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : ''

const handleToggleStatus = async (productId) => {
  if (
    !requirePermission(
      canManageProducts.value,
      'Ban khong co quyen cap nhat trang thai san pham. Hay dang nhap bang tai khoan admin.',
    )
  ) {
    return
  }
  const targetProduct = products.value.find((product) => product.id === productId)
  if (!targetProduct) {
    return
  }

  const nextStatus = targetProduct.status === 'available' ? 'unavailable' : 'available'

  try {
    const updatedProduct = await api.updateProduct(productId, { status: nextStatus })
    products.value = products.value.map((product) =>
      product.id === productId ? updatedProduct : product,
    )
    if (previewProduct.value?.id === productId) {
      previewProduct.value = updatedProduct
    }
  } catch (error) {
    notifyActionError('Khong the cap nhat trang thai san pham.', error)
  }
}

const openCreateProductModal = () => {
  if (
    !requirePermission(
      canManageProducts.value,
      'Ban khong co quyen them san pham. Hay dang nhap bang tai khoan admin.',
    )
  ) {
    return
  }
  productModalMode.value = 'create'
  editingProduct.value = null
  activeModule.value = 'products'
  showProductModal.value = true
}

const openEditProductModal = (product) => {
  if (
    !requirePermission(
      canManageProducts.value,
      'Ban khong co quyen chinh sua san pham. Hay dang nhap bang tai khoan admin.',
    )
  ) {
    return
  }
  productModalMode.value = 'edit'
  editingProduct.value = { ...product }
  previewProduct.value = product
  activeModule.value = 'products'
  showProductModal.value = true
}

const handleProductModalSave = async ({ mode, id, ...productPayload }) => {
  if (
    !requirePermission(
      canManageProducts.value,
      'Ban khong co quyen luu san pham. Hay dang nhap bang tai khoan admin.',
    )
  ) {
    return
  }
  try {
    if (mode === 'edit' && id !== null) {
      const updatedProduct = await api.updateProduct(id, productPayload)
      products.value = products.value.map((product) =>
        product.id === id ? updatedProduct : product,
      )
      if (previewProduct.value?.id === id) {
        previewProduct.value = updatedProduct
      }
    } else {
      const createdProduct = await api.createProduct({
        ordersCount: 0,
        revenue: 0,
        ...productPayload,
      })
      products.value = [createdProduct, ...products.value]
    }
    showProductModal.value = false
  } catch (error) {
    notifyActionError('Khong the luu san pham.', error)
  }
}

const handleViewProduct = (product) => {
  previewProduct.value = product
}

const handleDeleteProduct = async (productId) => {
  if (
    !requirePermission(
      canManageProducts.value,
      'Ban khong co quyen xoa san pham. Hay dang nhap bang tai khoan admin.',
    )
  ) {
    return
  }
  const target = products.value.find((product) => product.id === productId)
  if (!target) {
    return
  }
  if (!window.confirm(`Bạn có chắc muốn xoá sản phẩm "${target.name}"?`)) {
    return
  }
  try {
    await api.deleteProduct(productId)
    products.value = products.value.filter((product) => product.id !== productId)
    if (previewProduct.value?.id === productId) {
      previewProduct.value = null
    }
  } catch (error) {
    notifyActionError('Khong the xoa san pham.', error)
  }
}

const handleViewOrder = (order) => {
  previewOrder.value = order
}

const handleUpdateOrderStatus = async ({ id, status }) => {
  if (
    !requirePermission(
      canManageOrders.value,
      'Ban khong co quyen cap nhat don hang.',
    )
  ) {
    return
  }
  try {
    const updatedOrder = await api.updateOrder(id, { status })
    orders.value = orders.value.map((order) =>
      order.id === id ? updatedOrder : order,
    )
    if (previewOrder.value?.id === id) {
      previewOrder.value = updatedOrder
    }
  } catch (error) {
    notifyActionError('Khong the cap nhat trang thai don hang.', error)
  }
}

const handleDeleteOrder = async (orderId) => {
  if (
    !requirePermission(
      canDeleteOrders.value,
      'Chi admin moi duoc phep xoa don hang.',
    )
  ) {
    return
  }
  const target = orders.value.find((order) => order.id === orderId)
  if (!target) {
    return
  }
  if (!window.confirm(`Xoá đơn hàng ${orderId}?`)) {
    return
  }
  try {
    await api.deleteOrder(orderId)
    orders.value = orders.value.filter((order) => order.id !== orderId)
    if (previewOrder.value?.id === orderId) {
      previewOrder.value = null
    }
  } catch (error) {
    notifyActionError('Khong the xoa don hang.', error)
  }
}

const openCreateCustomerModal = () => {
  if (
    !requirePermission(
      canManageCustomers.value,
      'Ban khong co quyen them khach hang. Hay dang nhap bang tai khoan duoc cap quyen.',
    )
  ) {
    return
  }
  customerModalMode.value = 'create'
  editingCustomer.value = null
  activeModule.value = 'customers'
  showCustomerModal.value = true
}

const openEditCustomerModal = (customer) => {
  if (
    !requirePermission(
      canManageCustomers.value,
      'Ban khong co quyen chinh sua khach hang.',
    )
  ) {
    return
  }
  customerModalMode.value = 'edit'
  editingCustomer.value = { ...customer }
  previewCustomer.value = customer
  activeModule.value = 'customers'
  showCustomerModal.value = true
}

const handleCustomerModalSave = async (payload) => {
  if (
    !requirePermission(
      canManageCustomers.value,
      'Ban khong co quyen luu khach hang.',
    )
  ) {
    return
  }
  try {
    if (payload.mode === 'edit' && payload.id !== null) {
      const updatedCustomer = await api.updateCustomer(payload.id, {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        tier: payload.tier,
        address: payload.address,
        notes: payload.notes,
      })
      customers.value = customers.value.map((customer) =>
        customer.id === payload.id ? updatedCustomer : customer,
      )
      if (previewCustomer.value?.id === payload.id) {
        previewCustomer.value = updatedCustomer
      }
    } else {
      const createdCustomer = await api.createCustomer({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        tier: payload.tier,
        address: payload.address,
        notes: payload.notes,
        totalOrders: 0,
        totalSpend: 0,
        joinedAt: new Date().toISOString(),
      })
      customers.value = [createdCustomer, ...customers.value]
    }
    showCustomerModal.value = false
  } catch (error) {
    notifyActionError('Khong the luu khach hang.', error)
  }
}

const handleViewCustomer = (customer) => {
  previewCustomer.value = customer
}

const handleCustomerDelete = async (customerId) => {
  if (
    !requirePermission(
      canDeleteCustomers.value,
      'Chi admin moi duoc phep xoa khach hang.',
    )
  ) {
    return
  }
  const target = customers.value.find((customer) => customer.id === customerId)
  if (!target) {
    return
  }
  if (!window.confirm(`Xoá khách hàng "${target.name}" khỏi danh sách?`)) {
    return
  }
  try {
    await api.deleteCustomer(customerId)
    customers.value = customers.value.filter((customer) => customer.id !== customerId)
    if (previewCustomer.value?.id === customerId) {
      previewCustomer.value = null
    }
  } catch (error) {
    notifyActionError('Khong the xoa khach hang.', error)
  }
}

const handleCustomerPlaceOrder = async (payload) => {
  if (isAuthenticated.value && effectiveRole.value !== 'customer') {
    window.alert('Chi tai khoan khach hang moi duoc phep mua hang.')
    return
  }
  placingCustomerOrder.value = true
  try {
    const currentName = currentUser.value?.name || currentUser.value?.username || ''
    const orderPayload = {
      customerId: currentUser.value?.id || '',
      customer: currentName || payload.customer || 'Khach hang',
      username: currentUser.value?.username || '',
      items: payload.items,
      total: payload.total,
      address: payload.address || currentUser.value?.address || '',
      phone: payload.phone || currentUser.value?.phone || '',
      email: currentUser.value?.email || '',
      payment: payload.payment || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    const created = await api.createOrder(orderPayload, { skipAuth: !isAuthenticated.value })
    if (Array.isArray(orders.value)) {
      const newOrder = created || orderPayload
      orders.value = [newOrder, ...orders.value]
    }
    thankYouSummary.value = {
      total: payload.total,
      address: payload.address || currentUser.value?.address || '',
      phone: payload.phone || currentUser.value?.phone || '',
      items: payload.items,
    }
    showThankYou.value = true
  } catch (error) {
    notifyActionError(error.message || 'Khong the dat hang.', error)
  } finally {
    placingCustomerOrder.value = false
  }
}

const handleRefreshCustomerOrders = async () => {
  if (!isAuthenticated.value || effectiveRole.value !== 'customer') {
    return
  }
  await loadOrdersForCurrentRole()
}

const handleCustomerCancelOrder = async (orderId) => {
  if (!isAuthenticated.value || effectiveRole.value !== 'customer') {
    window.alert('Ban can dang nhap tai khoan khach hang de quan ly don hang.')
    return
  }
  const target = orders.value.find((order) => order.id === orderId)
  if (!target) {
    window.alert('Khong tim thay don hang can huy.')
    return
  }
  if (['cancelled', 'delivered'].includes(target.status)) {
    window.alert('Don hang da duoc xu ly, khong the huy.')
    return
  }
  if (!window.confirm(`Ban muon huy don h…ng ${orderId}?`)) {
    return
  }
  cancellingCustomerOrderId.value = orderId
  try {
    const updated = await api.updateOrder(orderId, { status: 'cancelled' })
    orders.value = orders.value.map((order) =>
      order.id === orderId ? updated : order,
    )
    if (previewOrder.value?.id === orderId) {
      previewOrder.value = updated
    }
  } catch (error) {
    notifyActionError(error.message || 'Khong the huy don hang.', error)
  } finally {
    cancellingCustomerOrderId.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#f5f5f7] px-4 py-0">
    <div
      v-if="!isAuthenticated || effectiveRole === 'customer'"
      class="flex w-full flex-col gap-8"
    >
      <CustomerPortal
        v-if="!showThankYou"
        :products="products"
        :orders="customerOrders"
        :orders-loading="isLoadingOrders"
        :order-statuses="orderStatuses"
        :submitting="placingCustomerOrder"
        :is-authenticated="isAuthenticated"
        :current-user="currentUser"
        :cancelling-order-id="cancellingCustomerOrderId"
        @place-order="handleCustomerPlaceOrder"
        @open-login="showLoginModal = true"
        @refresh-orders="handleRefreshCustomerOrders"
        @cancel-order="handleCustomerCancelOrder"
        @logout="handleLogout"
      />
      <div
        v-else
        class="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-slate-100"
      >
        <p class="text-2xl font-semibold text-slate-900">Cảm ơn quý khách!</p>
        <p class="text-sm text-slate-600">
          Đơn hàng của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ xác nhận và giao hàng sớm nhất.
        </p>
        <div class="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <div class="flex items-center justify-between">
            <span class="font-semibold">Tổng giá trị</span>
            <span class="text-primary">{{ formatCurrency(thankYouSummary?.total || 0) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-semibold">Địa chỉ giao</span>
            <span class="text-right text-slate-600">{{ thankYouSummary?.address || 'Chưa cung cấp' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-semibold">SĐT liên hệ</span>
            <span class="text-right text-slate-600">{{ thankYouSummary?.phone || 'Chưa cung cấp' }}</span>
          </div>
          <div class="text-left text-xs text-slate-500">Món đã đặt: {{ thankYouSummary?.items }}</div>
        </div>
        <div class="flex flex-col gap-3">
          <button
            type="button"
            class="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
            @click="showThankYou = false"
          >
            Tiếp tục mua hàng
          </button>
          <p class="text-xs text-slate-500">Bạn có thể xem và thêm sản phẩm khác bất cứ lúc nào.</p>
        </div>
      </div>
    </div>
    <div v-else class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <div
        class="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6"
      >
        <nav
          class="flex w-full flex-wrap items-center gap-2 rounded-full bg-white p-1 shadow-card ring-1 ring-slate-100 lg:flex-nowrap"
        >
          <button
            v-for="tab in moduleTabs"
            :key="tab.key"
            type="button"
            class="flex-1 rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="
              activeModule === tab.key
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : 'text-slate-500 hover:bg-slate-100'
            "
            @click="activeModule = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>
        <div
          class="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-100"
        >
          <div>
            <p class="text-sm font-semibold text-slate-900">{{ currentUser?.name }}</p>
            <p class="text-xs text-slate-500">
              {{ currentRoleLabel }}
              <span class="ml-1 text-slate-400">@{{ currentUser?.username }}</span>
            </p>
          </div>
          <button
            type="button"
            class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            @click="handleLogout"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <OverviewDashboard
        v-if="activeModule === 'overview'"
        :products="products"
        :orders="orders"
        :customers="customers"
      />

      <section v-else-if="activeModule === 'products'" class="flex flex-col gap-6 lg:flex-row">
        <div class="w-full space-y-6 lg:w-3/4">
          <ProductTable
            :products="products"
            :categories="categories"
            :page-size="5"
            :can-manage="canManageProducts"
            @toggle-status="handleToggleStatus"
            @add-new="openCreateProductModal"
            @view="handleViewProduct"
            @edit="openEditProductModal"
            @delete="handleDeleteProduct"
          />
        </div>

        <aside
          class="w-full rounded-3xl border border-transparent bg-gradient-to-b from-white via-white to-slate-100 p-6 shadow-card ring-1 ring-slate-100 lg:sticky lg:top-10 lg:w-1/4"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Sản phẩm đã chọn</h2>
            <button
              v-if="previewProduct"
              type="button"
              class="text-xs font-semibold text-primary"
              @click="previewProduct = null"
            >
              Xóa
            </button>
          </div>
          <div v-if="previewProduct" class="space-y-4">
            <img
              :src="previewProduct.image"
              :alt="previewProduct.name"
              class="w-full rounded-2xl object-cover"
            />
            <div class="flex items-start justify-between">
              <div>
                <h3 class="text-xl font-semibold text-slate-900">
                  {{ previewProduct.name }}
                </h3>
                <p class="text-sm text-slate-500">{{ previewProduct.description }}</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                @click="openEditProductModal(previewProduct)"
              >
                Chỉnh sửa
              </button>
            </div>
            <div class="flex flex-wrap gap-2 text-sm font-semibold text-slate-600">
              <span class="rounded-full bg-slate-100 px-3 py-1">
                {{ previewProduct.category }}
              </span>
              <span class="rounded-full bg-primary/10 px-3 py-1 text-primary">
                {{ formatCurrency(previewProduct.price) }}
              </span>
              <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                Đã bán {{ previewProduct.ordersCount }} lần
              </span>
              <span class="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200">
                Doanh thu {{ formatCurrency(previewProduct.revenue) }}
              </span>
              <span
                class="rounded-full px-3 py-1"
                :class="
                  previewProduct.status === 'available'
                    ? 'bg-status-available/10 text-status-available'
                    : 'bg-status-unavailable/20 text-status-unavailable'
                "
              >
                {{ previewProduct.status === 'available' ? 'Đang bán' : 'Tạm ngưng' }}
              </span>
            </div>
          </div>
          <div v-else class="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
            <p class="text-sm text-slate-500">
              Nhấn vào biểu tượng 👁 hoặc ✏️ để xem chi tiết sản phẩm tại đây.
            </p>
          </div>
        </aside>
      </section>

      <section v-else-if="activeModule === 'orders'" class="flex flex-col gap-6 lg:flex-row">
        <div class="w-full space-y-6 lg:w-3/4">
          <OrderTable
            :orders="resolvedOrders"
            :statuses="orderStatuses"
            :page-size="6"
            :can-update-status="canManageOrders"
            :can-delete="canDeleteOrders"
            @view="handleViewOrder"
            @update-status="handleUpdateOrderStatus"
            @delete="handleDeleteOrder"
          />
        </div>

        <aside
          class="w-full rounded-3xl border border-transparent bg-gradient-to-b from-white via-white to-slate-100 p-6 shadow-card ring-1 ring-slate-100 lg:sticky lg:top-10 lg:w-1/4"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Đơn hàng đã chọn</h2>
            <button
              v-if="previewOrder"
              type="button"
              class="text-xs font-semibold text-primary"
              @click="previewOrder = null"
            >
              Xóa
            </button>
          </div>
          <div v-if="previewOrder" class="space-y-4">
            <div class="rounded-2xl border border-slate-200 p-4">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-slate-900">{{ previewOrder.id }}</p>
                <span
                  v-if="previewOrderStatus"
                  class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  :class="previewOrderStatus.badge"
                >
                  <span class="inline-block h-2 w-2 rounded-full" :class="previewOrderStatus.dot" />
                  {{ previewOrderStatus.label }}
                </span>
              </div>
              <p class="mt-2 text-sm text-slate-500">
                Đặt lúc {{ formatDateTime(previewOrder.createdAt) }}
              </p>
              <p class="mt-2 text-sm font-semibold text-primary">
                {{ formatCurrency(previewOrder.total) }}
              </p>
            </div>

            <div class="space-y-2 text-sm text-slate-600">
              <p>
                <span class="font-semibold text-slate-900">Khách hàng:</span>
                {{ previewOrder.customer }}
              </p>
              <p>
                <span class="font-semibold text-slate-900">Sản phẩm:</span>
                {{ previewOrder.items }}
              </p>
              <p>
                <span class="font-semibold text-slate-900">Thanh toán:</span>
                {{ previewOrder.payment }}
              </p>
              <p>
                <span class="font-semibold text-slate-900">Giao đến:</span>
                {{ previewOrder.address }}
              </p>
            </div>
          </div>
          <div v-else class="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
            <p class="text-sm text-slate-500">
              Chọn một đơn hàng để xem chi tiết, cập nhật trạng thái và thông tin giao hàng.
            </p>
          </div>
        </aside>
      </section>

      <section
        v-else-if="activeModule === 'customers'"
        class="flex flex-col gap-6 lg:flex-row"
      >
        <div class="w-full space-y-6 lg:w-3/4">
          <div class="flex justify-end">
            <button
              v-if="canManageCustomers"
              type="button"
              class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-60"
              :disabled="isSyncingCustomers"
              @click="syncCustomersFromAccounts"
            >
              {{ isSyncingCustomers ? 'Đang đồng bộ...' : 'Đồng bộ khách hàng' }}
            </button>
          </div>
          <CustomerTable
            :customers="customerAccounts"
            :tiers="customerTiers"
            :page-size="6"
            :can-manage="canManageCustomers"
            :can-delete="canDeleteCustomers"
            @add-new="openCreateCustomerModal"
            @view="handleViewCustomer"
            @edit="openEditCustomerModal"
            @delete="handleCustomerDelete"
          />
        </div>

        <aside
          class="w-full rounded-3xl border border-transparent bg-gradient-to-b from-white via-white to-slate-100 p-6 shadow-card ring-1 ring-slate-100 lg:sticky lg:top-10 lg:w-1/4"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Khách hàng đã chọn</h2>
            <div class="flex items-center gap-2">
              <button
                v-if="previewCustomer"
                type="button"
                class="text-xs font-semibold text-primary"
                @click="openEditCustomerModal(previewCustomer)"
              >
                Sửa
              </button>
              <button
                v-if="previewCustomer"
                type="button"
                class="text-xs font-semibold text-slate-400"
                @click="previewCustomer = null"
              >
                Xóa
              </button>
            </div>
          </div>
          <div v-if="previewCustomer" class="space-y-4">
            <div class="flex items-start gap-3">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
              >
                {{
                  previewCustomer.name
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()
                }}
              </div>
              <div class="flex-1">
                <p class="text-lg font-semibold text-slate-900">
                  {{ previewCustomer.name }}
                </p>
                <p class="text-sm text-slate-500">{{ previewCustomer.email }}</p>
              </div>
            </div>
            <div class="space-y-2 text-sm text-slate-600">
              <p>
                <span class="font-semibold text-slate-900">Liên hệ:</span>
                {{ previewCustomer.phone }}
              </p>
              <p>
                <span class="font-semibold text-slate-900">Địa chỉ:</span>
                {{ previewCustomer.address || 'Chưa cập nhật' }}
              </p>
              <p>
                <span class="font-semibold text-slate-900">Gia nhập:</span>
                {{ formatDate(previewCustomer.joinedAt) }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2 text-sm font-semibold text-slate-600">
              <span class="rounded-full bg-slate-100 px-3 py-1">
                {{ previewCustomer.totalOrders }} đơn
              </span>
              <span class="rounded-full bg-primary/10 px-3 py-1 text-primary">
                {{ formatCurrency(previewCustomer.totalSpend) }}
              </span>
              <span class="rounded-full px-3 py-1" :class="getTierBadgeClass(previewCustomer.tier)">
                {{ previewCustomer.tier }}
              </span>
            </div>
            <p class="rounded-2xl bg-white/60 p-4 text-sm text-slate-500">
              {{ previewCustomer.notes || 'Không có ghi chú thêm.' }}
            </p>
          </div>
          <div v-else class="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
            <p class="text-sm text-slate-500">
              Theo dõi thông tin khách hàng, phân hạng và lịch sử bằng cách chọn từ danh sách.
            </p>
          </div>
        </aside>
      </section>

      <section v-else-if="activeModule === 'users'" class="flex flex-col gap-6">
        <UserManagement
          :users="users"
          :assignable-roles="assignableRoles"
          :creating="creatingUser"
          :saving-user-id="savingUserId"
          :deleting-user-id="deletingUserId"
          :is-loading="isLoadingUsers"
          @create="handleCreateUser"
          @update-role="handleUpdateUserRole"
          @delete="handleDeleteUser"
        />
      </section>
    </div>

    <AddProductModal
      :visible="showProductModal"
      :categories="categories"
      :mode="productModalMode"
      :product="editingProduct"
      @close="showProductModal = false"
      @save="handleProductModalSave"
    />

    <AddCustomerModal
      :visible="showCustomerModal"
      :mode="customerModalMode"
      :customer="editingCustomer"
      :tiers="customerTiers"
      @close="showCustomerModal = false"
      @save="handleCustomerModalSave"
    />

    <div
      v-if="showLoginModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div class="w-full max-w-lg overflow-hidden rounded-3xl bg-white/95 shadow-2xl ring-1 ring-slate-100 backdrop-blur">
        <div class="flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-4 text-white">
          <div>
            <p class="text-xl font-semibold">Tài khoản</p>
          </div>
          <button
            type="button"
            class="text-[13px] font-semibold text-white/80 hover:text-white"
            @click="closeLoginModal"
          >
            Đóng
          </button>
        </div>
        <div class="space-y-5 px-8 py-6">
          <div class="flex gap-2 rounded-full bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              class="flex-1 rounded-full px-4 py-2 transition"
              :class="authMode === 'login' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-primary'"
              @click="authMode = 'login'"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              class="flex-1 rounded-full px-4 py-2 transition"
              :class="authMode === 'register' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-primary'"
              @click="authMode = 'register'"
            >
              Đăng ký
            </button>
          </div>

          <form class="space-y-4" @submit.prevent="authMode === 'login' ? handleLogin() : handleRegister()">
            <div v-if="authMode === 'register'">
              <label class="mb-1 block text-sm font-semibold text-slate-700" for="login-name">
                Họ tên
              </label>
              <input
                id="login-name"
                v-model.trim="loginForm.name"
                type="text"
                placeholder="Nhập họ tên"
                class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div v-if="authMode === 'register'">
              <label class="mb-1 block text-sm font-semibold text-slate-700" for="login-phone">
                Số điện thoại
              </label>
              <input
                id="login-phone"
                v-model.trim="loginForm.phone"
                type="tel"
                placeholder="Nhập số điện thoại"
                class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-semibold text-slate-700" for="login-username">
                Tài khoản
              </label>
              <input
                id="login-username"
                v-model.trim="loginForm.username"
                type="text"
                placeholder="Ví dụ: admin"
                class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-semibold text-slate-700" for="login-password">
                Mật khẩu
              </label>
              <input
                id="login-password"
                v-model.trim="loginForm.password"
                type="password"
                placeholder="••••••"
                class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <p v-if="authError" class="text-sm font-semibold text-rose-600">{{ authError }}</p>
            <button
              type="submit"
              class="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isAuthenticating"
            >
              {{
                isAuthenticating
                  ? 'Đang xử lý...'
                  : authMode === 'login'
                    ? 'Đăng nhập'
                    : 'Đăng ký'
              }}
            </button>
            <div class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2 text-[12px] font-semibold text-slate-500">
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>



