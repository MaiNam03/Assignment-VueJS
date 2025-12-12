<script setup>
import { computed, reactive, ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import brandLogo from '../../logo/logo.png'
import brandLogoAlt from '../../logo/logo-fpt-polytechnic-inkythuatso-09-13-08-21-removebg-preview.png'

const props = defineProps({
  products: {
    type: Array,
    default: () => [],
  },
  orders: {
    type: Array,
    default: () => [],
  },
  orderStatuses: {
    type: Array,
    default: () => [],
  },
  ordersLoading: {
    type: Boolean,
    default: false,
  },
  cancellingOrderId: {
    type: String,
    default: '',
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  isAuthenticated: {
    type: Boolean,
    default: false,
  },
  currentUser: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits([
  'place-order',
  'open-login',
  'logout',
  'refresh-orders',
  'cancel-order',
])

const customerPages = [
  { key: 'home', label: 'Trang chủ' },
  { key: 'cart', label: 'Giỏ hàng' },
]

const activePage = ref('home')
const selectedProductId = ref('')
const cartItems = ref([])
const activeCategory = ref('Tất cả')
const activeSlideIndex = ref(0)
let slideTimer = null
const addedProductIds = ref([])
const searchTerm = ref('')
const searchFocused = ref(false)

const normalizeCategory = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const checkoutForm = reactive({
  address: '',
  phone: '',
  payment: 'COD',
  note: '',
})

const availableProducts = computed(() =>
  props.products.filter(
    (product) =>
      (product.status === 'available' || !product.status) &&
      normalizeCategory(product.category) !== 'mi y',
  ),
)

const productCategories = computed(() => {
  const categories = new Set()
  availableProducts.value.forEach((product) => {
    if (product.category) {
      categories.add(product.category)
    }
  })
  return Array.from(categories)
})

const categoryOptions = computed(() => ['Tất cả', ...productCategories.value])

const quickNavCategories = computed(() => categoryOptions.value.slice(0, 6))

const heroSlides = computed(() => availableProducts.value.slice(0, 6))

const filteredProducts = computed(() => {
  const base =
    activeCategory.value === 'Tất cả'
      ? availableProducts.value
      : availableProducts.value.filter((product) => product.category === activeCategory.value)
  return base.filter(matchesSearch)
})

const selectedProduct = computed(
  () => availableProducts.value.find((product) => product.id === selectedProductId.value) || null,
)

const cartTotal = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
)

const customerOrders = computed(() =>
  [...(props.orders || [])].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  ),
)

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value ?? 0)

const fallbackStatus = {
  label: 'Dang cap nhat',
  badge: 'bg-slate-100 text-slate-600',
  dot: 'bg-slate-400',
}

const getStatusInfo = (status) =>
  props.orderStatuses.find((item) => item.value === status) || fallbackStatus

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

const canCancelOrder = (order) =>
  props.isAuthenticated &&
  order &&
  ['pending', 'processing'].includes(order.status)

const handleCancelOrder = (order) => {
  if (!order || !canCancelOrder(order)) return
  emit('cancel-order', order.id)
}

const flashAdded = (id) => {
  addedProductIds.value = addedProductIds.value.filter((x) => x !== id)
  addedProductIds.value.push(id)
  setTimeout(() => {
    addedProductIds.value = addedProductIds.value.filter((x) => x !== id)
  }, 1200)
}

const isRecentlyAdded = (id) => addedProductIds.value.includes(id)

const matchesSearch = (product) => {
  const keyword = normalizeCategory(searchTerm.value)
  if (!keyword) return true
  const name = normalizeCategory(product.name)
  const category = normalizeCategory(product.category)
  return name.includes(keyword) || category.includes(keyword)
}

const goToPage = (key) => {
  activePage.value = key
  if (key === 'orders' && props.isAuthenticated) {
    emit('refresh-orders')
  }
}

const focusProducts = async () => {
  activePage.value = 'home'
  await nextTick()
  const el = document.getElementById('customer-products')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const searchSuggestions = computed(() => {
  const keyword = normalizeCategory(searchTerm.value)
  if (!keyword) return []
  return availableProducts.value.filter((p) => matchesSearch(p)).slice(0, 6)
})

const openSuggestions = computed(() => searchFocused.value && searchTerm.value.trim().length > 0)

const handleSearchBlur = () => {
  setTimeout(() => {
    searchFocused.value = false
  }, 120)
}

const selectSearchResult = (product) => {
  searchTerm.value = product.name
  viewProductDetail(product.id)
  searchFocused.value = false
}

const goToSlide = (index) => {
  if (!heroSlides.value.length) return
  const total = heroSlides.value.length
  activeSlideIndex.value = ((index % total) + total) % total
}

const nextSlide = () => goToSlide(activeSlideIndex.value + 1)

const stopAutoplay = () => {
  if (slideTimer) {
    clearInterval(slideTimer)
    slideTimer = null
  }
}

const startAutoplay = () => {
  stopAutoplay()
  if (heroSlides.value.length > 1) {
    slideTimer = setInterval(nextSlide, 6000)
  }
}

onMounted(() => {
  startAutoplay()
})

onBeforeUnmount(() => {
  stopAutoplay()
})

watch(
  heroSlides,
  () => {
    goToSlide(0)
    startAutoplay()
  },
  { deep: true },
)

const scrollToTop = async () => {
  activePage.value = 'home'
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const viewProductDetail = (productId) => {
  selectedProductId.value = productId
  activePage.value = 'detail'
}

const addToCart = (product) => {
  const existing = cartItems.value.find((item) => item.id === product.id)
  if (existing) {
    existing.quantity += 1
  } else {
    cartItems.value.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    })
  }
  flashAdded(product.id)
}

const buyNow = (product) => {
  addToCart(product)
  activePage.value = 'cart'
}

const selectCategory = (cat) => {
  activeCategory.value = cat
  activePage.value = 'home'
}

const updateQuantity = (id, qtyValue) => {
  const target = cartItems.value.find((item) => item.id === id)
  if (!target) return
  const qty = Number(qtyValue) || 0
  if (qty <= 0) {
    cartItems.value = cartItems.value.filter((item) => item.id !== id)
  } else {
    target.quantity = qty
  }
}

const removeItem = (id) => {
  cartItems.value = cartItems.value.filter((item) => item.id !== id)
}

const resetCart = () => {
  cartItems.value = []
}

const placeOrder = () => {
  if (!cartItems.value.length) {
    window.alert('Giỏ hàng đang trống.')
    return
  }
  if (!checkoutForm.address.trim()) {
    window.alert('Vui lòng nhập địa chỉ giao hàng.')
    return
  }
  if (!checkoutForm.phone.trim()) {
    window.alert('Vui lòng nhập số điện thoại liên hệ.')
    return
  }
  const items = cartItems.value.map((item) => `${item.name} x${item.quantity}`).join(', ')
  emit('place-order', {
    customer: 'Khách hàng',
    items,
    total: cartTotal.value,
    address: checkoutForm.address,
    phone: checkoutForm.phone,
    payment: checkoutForm.payment,
    note: checkoutForm.note,
  })
  resetCart()
  checkoutForm.address = ''
  checkoutForm.phone = ''
  checkoutForm.note = ''
  activePage.value = 'home'
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#f5f5f7]">
    <div class="flex-1 space-y-6">
      <div class="relative z-30 left-1/2 w-screen -translate-x-1/2 bg-white shadow-card ring-1 ring-slate-100">
        <div class="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <img :src="brandLogo" alt="Logo" class="h-12 w-auto cursor-pointer" @click="scrollToTop" />
          </div>
          <div class="relative z-40 flex w-full flex-1 items-center gap-2 rounded-full bg-slate-100 px-4 py-2 shadow-inner lg:max-w-4xl">
            <input
              type="text"
              placeholder="Tìm món ngon, combo, đồ uống..."
              class="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              v-model.trim="searchTerm"
              @focus="searchFocused = true"
              @blur="handleSearchBlur"
              @keyup.enter="focusProducts"
            />
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow hover:bg-slate-50"
              @click="focusProducts"
            >
              🔍
            </button>
            <div
              v-if="openSuggestions"
              class="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            >
              <div class="max-h-96 overflow-auto p-3">
                <div class="flex items-center justify-between pb-2">
                  <p class="text-[11px] font-semibold uppercase text-slate-400">Gợi ý sản phẩm</p>
                  <button
                    type="button"
                    class="text-[11px] font-semibold text-primary hover:underline"
                    @mousedown.prevent="focusProducts"
                  >
                    Xem tất cả
                  </button>
                </div>
                <div class="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
                  <button
                    v-for="result in searchSuggestions"
                    :key="result.id"
                    type="button"
                    class="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50"
                    @mousedown.prevent="selectSearchResult(result)"
                  >
                    <img :src="result.image" :alt="result.name" class="h-12 w-12 rounded-lg object-cover" />
                    <div class="flex-1">
                      <p class="text-sm font-semibold text-slate-900 line-clamp-1">{{ result.name }}</p>
                      <p class="text-[12px] text-slate-500 line-clamp-1">{{ result.category }}</p>
                    </div>
                    <span class="text-xs font-semibold text-primary">{{ formatCurrency(result.price) }}</span>
                  </button>
                  <p v-if="!searchSuggestions.length" class="px-3 py-3 text-sm text-slate-500">Không tìm thấy sản phẩm.</p>
                </div>
              </div>
              <div class="rounded-b-2xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                Nhấn Enter để xem danh sách đầy đủ
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 text-[13px] font-semibold text-slate-700 z-10">
            <span class="hidden text-primary lg:inline">Đặt món: 0838878888</span>
          </div>
          <div class="ml-auto flex flex-wrap items-center justify-end gap-3">
            <div
              v-if="isAuthenticated && currentUser"
              class="flex items-center gap-3 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-inner"
            >
              <div class="leading-tight">
                <p class="text-sm font-semibold text-slate-900">{{ currentUser.name }}</p>
                <p class="text-[11px] text-slate-500">Tài khoản khách hàng · @{{ currentUser.username }}</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                @click="emit('logout')"
              >
                Đăng xuất
              </button>
            </div>
            <button
              v-if="!isAuthenticated"
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold shadow-inner transition hover:bg-slate-200"
              @click="emit('open-login')"
            >
              Đăng nhập
            </button>
            <button
              v-if="isAuthenticated"
              type="button"
              class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner transition hover:border-primary hover:text-primary"
              @click="goToPage('orders')"
            >
              Đơn hàng ({{ customerOrders.length }})
            </button>
            <button
              type="button"
              class="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-strong"
              @click="goToPage('cart')"
            >
              Giỏ hàng ({{ cartItems.length }})
            </button>
          </div>
        </div>
        <div class="hidden w-full bg-[#ff7900] text-white lg:block">
          <div class="mx-auto flex w-full max-w-6xl items-center overflow-hidden px-4 py-3">
            <p class="whitespace-nowrap text-sm font-semibold animate-marquee">
              Chào mừng quý khách đến với cửa hàng của chúng tôi! Rất hân hạnh được phục vụ quý khách. Kính chúc quý khách
              thưởng thức món ăn thật ngon miệng và có một trải nghiệm tuyệt vời tại đây.
            </p>
          </div>
        </div>
      </div>

      <div class="relative left-1/2 w-screen -translate-x-1/2">
        <div class="mx-auto w-full max-w-6xl space-y-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
          <section v-if="activePage === 'home'" class="space-y-6">
            <div class="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div
                v-if="heroSlides.length"
                class="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-lg"
                @mouseenter="stopAutoplay"
                @mouseleave="startAutoplay"
              >
                <img
                  v-if="heroSlides[activeSlideIndex]"
                  :src="heroSlides[activeSlideIndex].image"
                  :alt="heroSlides[activeSlideIndex].name"
                  class="absolute inset-0 h-full w-full object-cover"
                />
                <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/10"></div>
                <div class="relative z-10 grid gap-3 p-6 lg:p-8">
                  <p class="text-sm uppercase tracking-wide text-primary-soft">FPoly Food</p>
                  <h1 class="text-3xl font-semibold leading-snug lg:text-4xl">
                    {{ heroSlides[activeSlideIndex].name }}
                  </h1>
                  <p class="text-sm text-white/80 line-clamp-2">
                    {{ heroSlides[activeSlideIndex].description || 'Món ngon giao nhanh, ưu đãi hằng ngày.' }}
                  </p>
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-white">
                      {{ heroSlides[activeSlideIndex].category }}
                    </span>
                    <span class="text-lg font-semibold text-primary-light">
                      {{ formatCurrency(heroSlides[activeSlideIndex].price) }}
                    </span>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-md"
                      @click="goToPage('home')"
                    >
                      Sản phẩm nổi bật
                    </button>
                    <button
                      type="button"
                      class="rounded-full border border-white/60 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      @click="goToPage('cart')"
                    >
                      Xem giỏ hàng
                    </button>
                  </div>
                  <div class="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      v-for="(slide, index) in heroSlides"
                      :key="slide.id || index"
                      type="button"
                      class="h-2 rounded-full transition"
                      :class="index === activeSlideIndex ? 'w-5 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'"
                      @click="goToSlide(index)"
                    ></button>
                  </div>
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p class="text-xs font-semibold uppercase text-primary">Giao nhanh</p>
                  <p class="text-base font-semibold text-slate-900">Món nóng giao trong 30-45'</p>
                  <p class="text-xs text-slate-500">Áp dụng trong bán kính 5km</p>
                </div>
                <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p class="text-xs font-semibold uppercase text-primary">Combo tiết kiệm</p>
                  <p class="text-base font-semibold text-slate-900">Mua 2 món giảm 10%</p>
                  <p class="text-xs text-slate-500">Áp dụng cả đồ uống và tráng miệng</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="rounded-2xl border border-slate-100 p-4">
                <p class="text-sm font-semibold text-slate-700">Sản phẩm sẵn sàng</p>
                <p class="mt-2 text-2xl font-semibold text-primary">{{ availableProducts.length }}</p>
                <p class="text-xs text-slate-500">Trạng thái: đang bán</p>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-sm font-semibold text-slate-700">Danh mục món ăn</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="cat in categoryOptions"
                  :key="cat"
                  class="cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition"
                  :class="
                    activeCategory === cat
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'bg-cream text-ink/80 hover:bg-primary-soft/40'
                  "
                  @click="selectCategory(cat)"
                >
                  {{ cat }}
                </span>
                <span v-if="!productCategories.length" class="text-xs text-slate-500">Chưa có danh mục.</span>
              </div>
            </div>

            <div class="space-y-3" id="customer-products">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-semibold text-slate-900">Sản phẩm</h3>
                <span class="text-xs text-slate-500">Bấm xem chi tiết hoặc mua nhanh theo danh mục</span>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="product in filteredProducts"
                  :key="product.id"
                  class="relative cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  @click="viewProductDetail(product.id)"
                >
                  <div
                    class="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white shadow-lg transition duration-200"
                    :class="isRecentlyAdded(product.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-90'"
                  >
                    Đã thêm
                  </div>
                  <img :src="product.image" :alt="product.name" class="h-36 w-full rounded-t-2xl object-cover" />
                  <div class="space-y-1 p-3">
                    <p class="text-sm font-semibold text-slate-900">{{ product.name }}</p>
                    <p class="text-xs text-slate-500 line-clamp-2">{{ product.description }}</p>
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-semibold text-primary">{{ formatCurrency(product.price) }}</span>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          class="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary-soft/30"
                          @click.stop="addToCart(product)"
                        >
                          Thêm vào giỏ
                        </button>
                        <button
                          type="button"
                          class="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-primary/30 transition hover:bg-primary/90"
                          @click.stop="buyNow(product)"
                        >
                          Mua
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-if="!filteredProducts.length"
                  class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500"
                >
                  Không tìm thấy sản phẩm phù hợp.
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activePage === 'detail'" class="space-y-4">
            <div v-if="selectedProduct" class="grid gap-4 md:grid-cols-[1.2fr_1fr]">
              <img :src="selectedProduct.image" :alt="selectedProduct.name" class="h-72 w-full rounded-3xl object-cover" />
              <div class="space-y-3 rounded-3xl border border-slate-100 p-4">
                <p class="text-2xl font-semibold text-slate-900">{{ selectedProduct.name }}</p>
                <p class="text-sm text-slate-500">{{ selectedProduct.description }}</p>
                <div class="flex items-center gap-3">
                  <span class="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                    {{ formatCurrency(selectedProduct.price) }}
                  </span>
                  <span class="text-xs text-slate-500">Danh mục: {{ selectedProduct.category }}</span>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-primary/30 transition hover:bg-primary/90"
                    @click="addToCart(selectedProduct)"
                  >
                    Thêm vào giỏ
                  </button>
                  <span
                    v-if="isRecentlyAdded(selectedProduct.id)"
                    class="self-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600"
                  >
                    Đã thêm vào giỏ
                  </span>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                    @click="goToPage('home')"
                  >
                    Quay lại trang chủ
                  </button>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-slate-500">Chưa chọn sản phẩm.</p>
          </section>

          <section v-else-if="activePage === 'cart'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-900">Giỏ hàng</h2>
              <button
                type="button"
                class="text-xs font-semibold text-rose-500"
                :disabled="!cartItems.length"
                @click="resetCart"
              >
                Xóa giỏ
              </button>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p class="text-sm font-semibold text-slate-700">Tổng giá giỏ hàng</p>
              <p class="mt-2 text-2xl font-semibold text-primary">{{ formatCurrency(cartTotal) }}</p>
              <p class="text-xs text-slate-500">Cập nhật theo số lượng</p>
            </div>
            <div
              v-if="!cartItems.length"
              class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500"
            >
              Giỏ hàng trống. Chọn sản phẩm ở trang chủ.
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="item in cartItems"
                :key="item.id"
                class="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"
              >
                <img :src="item.image" :alt="item.name" class="h-12 w-12 rounded-xl object-cover" />
                <div class="flex-1">
                  <p class="text-sm font-semibold text-slate-900">{{ item.name }}</p>
                  <p class="text-xs font-semibold text-slate-500">{{ formatCurrency(item.price) }}</p>
                </div>
                <input
                  :value="item.quantity"
                  type="number"
                  min="1"
                  class="w-16 rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  @input="updateQuantity(item.id, $event.target.value)"
                />
                <button
                  type="button"
                  class="text-xs font-semibold text-rose-500 hover:text-rose-600"
                  @click="removeItem(item.id)"
                >
                  Xóa
                </button>
              </div>
            </div>
            <div class="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div class="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Tạm tính</span>
                <span class="text-primary">{{ formatCurrency(cartTotal) }}</span>
              </div>
              <input
                v-model.trim="checkoutForm.address"
                type="text"
                placeholder="Địa chỉ giao hàng"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                v-model.trim="checkoutForm.phone"
                type="tel"
                placeholder="Số điện thoại liên hệ"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select
                v-model="checkoutForm.payment"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="COD">Thanh toán khi nhận hàng</option>
                <option value="Bank">Chuyển khoản</option>
              </select>
              <textarea
                v-model.trim="checkoutForm.note"
                rows="2"
                placeholder="Ghi chú (không bắt buộc)"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p>Nếu quý khách chuyển khoản: 0838878888 - MB BANK - Trần Lương Mai Nam</p>
              <button
                type="button"
                class="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                :disabled="!cartItems.length || submitting"
                @click="placeOrder"
              >
                {{ submitting ? 'Đang đặt hàng...' : 'Đặt hàng' }}
              </button>
            </div>
          </section>

          <section v-else-if="activePage === 'orders'" class="space-y-4">
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-slate-900">Đơn hàng của bạn</h2>
                <p class="text-sm text-slate-500">
                  Theo dõi trạng thái đơn hàng đã đặt và cập nhật nhanh chóng.
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                  :disabled="ordersLoading"
                  @click="emit('refresh-orders')"
                >
                  {{ ordersLoading ? 'Đang tải...' : 'Làm mới' }}
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                  @click="goToPage('home')"
                >
                  Tiếp tục mua
                </button>
              </div>
            </div>

            <div
              v-if="!isAuthenticated"
              class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
            >
              <p class="font-semibold text-slate-800">Đăng nhập để xem đơn hàng của bạn.</p>
              <div class="mt-3 flex gap-2">
                <button
                  type="button"
                  class="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-primary-strong"
                  @click="emit('open-login')"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                  @click="goToPage('home')"
                >
                  Mua ngay
                </button>
              </div>
            </div>

            <div
              v-else-if="ordersLoading"
              class="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500"
            >
              Đang tải danh sách đơn hàng...
            </div>

            <div
              v-else-if="!customerOrders.length"
              class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500"
            >
              Bạn chưa có đơn hàng nào. Đặt món ngay để thưởng thức.
            </div>

            <div v-else class="grid gap-3 md:grid-cols-2">
              <article
                v-for="order in customerOrders"
                :key="order.id"
                class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase text-slate-400">Mã đơn</p>
                    <p class="text-sm font-semibold text-slate-900">{{ order.id }}</p>
                    <p class="text-xs text-slate-500">Đặt lúc {{ formatDateTime(order.createdAt) }}</p>
                  </div>
                  <span
                    class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold"
                    :class="getStatusInfo(order.status).badge"
                  >
                    <span class="inline-block h-2 w-2 rounded-full" :class="getStatusInfo(order.status).dot" />
                    {{ getStatusInfo(order.status).label }}
                  </span>
                </div>
                <div class="space-y-2 text-sm text-slate-600">
                  <p>
                    <span class="font-semibold text-slate-900">Sản phẩm:</span>
                    {{ order.items }}
                  </p>
                  <p>
                    <span class="font-semibold text-slate-900">Thanh toán:</span>
                    {{ order.payment || 'Chưa cập nhật' }}
                  </p>
                  <p>
                    <span class="font-semibold text-slate-900">Giao đến:</span>
                    {{ order.address || 'Chưa cập nhật' }}
                  </p>
                </div>
                <div class="flex items-center justify-between">
                  <div class="text-sm font-semibold text-slate-700">
                    Tổng: <span class="text-primary">{{ formatCurrency(order.total) }}</span>
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                      @click="goToPage('home')"
                    >
                      Mua thêm
                    </button>
                    <button
                      type="button"
                      class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="!canCancelOrder(order) || cancellingOrderId === order.id"
                      @click="handleCancelOrder(order)"
                    >
                      {{ cancellingOrderId === order.id ? 'Đang hủy...' : 'Hủy đơn' }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>

    <footer
      class="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-[#0c1118] px-4 py-6 text-white shadow-lg shadow-black/30 ring-1 ring-white/10"
    >
      <div class="mx-auto w-full max-w-6xl space-y-4">
        <div
          class="flex flex-col divide-y divide-white/10 rounded-2xl border border-white/5 bg-[#0f1520] shadow-inner shadow-black/30 sm:flex-row sm:divide-y-0 sm:divide-x"
        >
          <div class="flex flex-1 items-center gap-4 px-4 py-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <img :src="brandLogo" alt="Poly Food" class="h-10 w-10 object-contain" />
            </div>
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase text-white/70">Website của FPoly Food</p>
              <p class="text-lg font-semibold">http://localhost:5173</p>
            </div>
          </div>
          <div class="flex flex-1 items-center gap-4 px-4 py-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <img :src="brandLogoAlt" alt="Poly Delivery" class="h-10 w-10 object-contain" />
            </div>
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase text-white/70">Trường Cao đẳng</p>
              <p class="text-lg font-semibold">FPT Polytechnic</p>
            </div>
          </div>
          <div class="flex flex-1 items-center gap-4 px-4 py-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <img :src="brandLogoAlt" alt="Đối tác" class="h-10 w-10 object-contain" />
            </div>
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase text-white/70">Trang web được phát triển bởi</p>
              <p class="text-lg font-semibold">Team Codedenngu</p>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-xs font-semibold text-white/70">
          <span class="rounded-full bg-white/5 px-3 py-1">Hotline: 0838878888</span>
          <span class="rounded-full bg-white/5 px-3 py-1">Email: support@polyfood.vn</span>
          <span class="rounded-full bg-white/5 px-3 py-1">© 2025 FPoly Food</span>
          <span class="rounded-full bg-white/5 px-3 py-1"
            >Đội ngũ phát triển: Vũ Ngọc Hoàng, Nguyễn Đức Trung, Trần Lương Mai Nam</span
          >
        </div>
      </div>
    </footer>
  </div>
</template>
