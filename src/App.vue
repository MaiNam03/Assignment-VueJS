<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AddCustomerModal from './components/AddCustomerModal.vue'
import AddProductModal from './components/AddProductModal.vue'
import CustomerTable from './components/CustomerTable.vue'
import OrderTable from './components/OrderTable.vue'
import OverviewDashboard from './components/OverviewDashboard.vue'
import ProductTable from './components/ProductTable.vue'
import { api, setAuthToken } from './services/api'

const products = ref([])

const orders = ref([])

const customers = ref([])

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

const loginForm = reactive({
  username: '',
  password: '',
})

const authError = ref('')
const isAuthenticating = ref(false)

const roleLabels = {
  admin: 'Quản trị viên',
  sales: 'Nhân viên bán hàng',
}

const currentRoleLabel = computed(() =>
  currentUser.value?.role ? roleLabels[currentUser.value.role] ?? currentUser.value.role : 'Chưa xác định',
)

const resetDataCollections = () => {
  products.value = []
  orders.value = []
  customers.value = []
}

const bootstrapData = async () => {
  if (!isAuthenticated.value) {
    resetDataCollections()
    return
  }

  try {
    const [productData, orderData, customerData] = await Promise.all([
      api.fetchProducts(),
      api.fetchOrders(),
      api.fetchCustomers(),
    ])
    products.value = productData
    orders.value = orderData
    customers.value = customerData
  } catch (error) {
    console.error('Failed to load data from db.json', error)
    window.alert('Khong the tai du lieu. Vui long kiem tra server API va thong tin dang nhap.')
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
    authError.value = 'Vui long nhap day du tai khoan va mat khau'
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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('authToken', response.token)
      window.localStorage.setItem('currentUser', JSON.stringify(response.user))
    }
    loginForm.password = ''
    await bootstrapData()
  } catch (error) {
    authError.value = error.message || 'Dang nhap that bai'
  } finally {
    isAuthenticating.value = false
  }
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
  resetDataCollections()
}

const canManageProducts = computed(() => currentUser.value?.role === 'admin')
const canManageCustomers = computed(() =>
  ['admin', 'sales'].includes(currentUser.value?.role),
)
const canDeleteCustomers = computed(() => currentUser.value?.role === 'admin')
const canManageOrders = computed(() =>
  ['admin', 'sales'].includes(currentUser.value?.role),
)
const canDeleteOrders = computed(() => currentUser.value?.role === 'admin')

const activeModule = ref('overview')

const moduleTabs = [
  { key: 'overview', label: 'Thống kê' },
  { key: 'products', label: 'Quản lý sản phẩm' },
  { key: 'orders', label: 'Quản lý đơn hàng' },
  { key: 'customers', label: 'Quản lý khách hàng' },
]

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

const categories = computed(() => {
  const unique = new Set(products.value.map((product) => product.category))
  return Array.from(unique)
})

const defaultCustomerTiers = ['Standard', 'Thân thiết', 'VIP']
const customerTiers = computed(() => {
  const unique = new Set(defaultCustomerTiers)
  customers.value.forEach((customer) => unique.add(customer.tier))
  return Array.from(unique)
})

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
</script>

<template>
  <div class="min-h-screen bg-slate-100 px-4 py-10">
    <div
      v-if="!isAuthenticated"
      class="mx-auto w-full max-w-md rounded-3xl bg-white p-8 shadow-card ring-1 ring-slate-100"
    >
      <div class="mb-6 text-center space-y-2">
        <p class="text-2xl font-semibold text-slate-900">Dang nhap he thong</p>
        <p class="text-sm text-slate-500">
          Su dung tai khoan duoc cap de quan ly san pham, don hang va khach hang.
        </p>
      </div>
      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="mb-1 block text-sm font-semibold text-slate-600" for="login-username">
            Tai khoan
          </label>
          <input
            id="login-username"
            v-model.trim="loginForm.username"
            type="text"
            placeholder="VD: admin"
            class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-semibold text-slate-600" for="login-password">
            Mat khau
          </label>
          <input
            id="login-password"
            v-model.trim="loginForm.password"
            type="password"
            placeholder="••••••••"
            class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <p v-if="authError" class="text-sm font-semibold text-rose-600">{{ authError }}</p>
        <button
          type="submit"
          class="w-full rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isAuthenticating"
        >
          {{ isAuthenticating ? 'Dang kiem tra...' : 'Dang nhap' }}
        </button>
      </form>
      <p class="mt-4 text-center text-xs text-slate-500">
        Tai khoan mau: admin/admin123 hoac sales/sales123
      </p>
    </div>

    <div v-else class="mx-auto flex w-full max-w-6xl flex-col gap-8">
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
            Dang xuat
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
              Xoá
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
            :orders="orders"
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
              Xoá
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

      <section v-else class="flex flex-col gap-6 lg:flex-row">
        <div class="w-full space-y-6 lg:w-3/4">
          <CustomerTable
            :customers="customers"
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
                Xoá
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
  </div>
</template>
