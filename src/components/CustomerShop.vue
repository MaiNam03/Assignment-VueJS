<script setup>
import { computed, reactive } from 'vue'

const props = defineProps({
  products: {
    type: Array,
    default: () => [],
  },
  currentUser: {
    type: Object,
    default: () => null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['place-order'])

const cartItems = reactive([])

const checkoutForm = reactive({
  customer: '',
  address: '',
  payment: 'COD',
  note: '',
})

const availableProducts = computed(() =>
  props.products.filter((product) => product.status === 'available'),
)

const cartTotal = computed(() =>
  cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
)

const hasCart = computed(() => cartItems.length > 0)

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value ?? 0)

const addToCart = (product) => {
  const existing = cartItems.find((item) => item.id === product.id)
  if (existing) {
    existing.quantity += 1
    return
  }
  cartItems.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    quantity: 1,
  })
}

const updateQuantity = (id, nextQty) => {
  const target = cartItems.find((item) => item.id === id)
  if (!target) {
    return
  }
  const qty = Number(nextQty) || 0
  if (qty <= 0) {
    const index = cartItems.findIndex((item) => item.id === id)
    if (index !== -1) {
      cartItems.splice(index, 1)
    }
    return
  }
  target.quantity = qty
}

const resetCart = () => {
  cartItems.splice(0, cartItems.length)
}

const resetForm = () => {
  checkoutForm.address = ''
  checkoutForm.payment = 'COD'
  checkoutForm.note = ''
  checkoutForm.customer = ''
}

const placeOrder = () => {
  if (!hasCart.value) {
    window.alert('Vui long chon it nhat 1 san pham.')
    return
  }
  if (!checkoutForm.address.trim()) {
    window.alert('Vui long nhap dia chi giao hang.')
    return
  }

  const items = cartItems
    .map((item) => `${item.name} x${item.quantity}`)
    .join(', ')

  emit('place-order', {
    customer: checkoutForm.customer || props.currentUser?.name || 'Khach hang',
    items,
    total: cartTotal.value,
    address: checkoutForm.address,
    payment: checkoutForm.payment,
    note: checkoutForm.note,
  })

  resetCart()
  resetForm()
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
    <div class="space-y-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Cua hang</h1>
          <p class="text-sm text-slate-500">
            Chon san pham ban muon va dat hang nhanh.
          </p>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {{ availableProducts.length }} san pham san sang
        </span>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="product in availableProducts"
          :key="product.id"
          class="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <img
            :src="product.image"
            :alt="product.name"
            class="h-40 w-full rounded-t-2xl object-cover"
          />
          <div class="flex flex-1 flex-col gap-2 p-4">
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ product.name }}</p>
              <p class="text-xs text-slate-500 line-clamp-2">{{ product.description }}</p>
            </div>
            <div class="mt-auto flex items-center justify-between">
              <span class="text-sm font-semibold text-primary">
                {{ formatCurrency(product.price) }}
              </span>
              <button
                type="button"
                class="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-primary/30 transition hover:bg-primary/90"
                @click="addToCart(product)"
              >
                Chon mua
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">Don hang cua ban</h2>
        <button
          type="button"
          class="text-xs font-semibold text-rose-500"
          :disabled="!hasCart"
          @click="resetCart"
        >
          Xoa gio
        </button>
      </div>

      <div v-if="!hasCart" class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        Gio hang trong. Hay chon san pham de bat dau.
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="item in cartItems"
          :key="item.id"
          class="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"
        >
          <img
            :src="item.image"
            :alt="item.name"
            class="h-12 w-12 rounded-xl object-cover"
          />
          <div class="flex-1">
            <p class="text-sm font-semibold text-slate-900">{{ item.name }}</p>
            <p class="text-xs text-slate-500">{{ formatCurrency(item.price) }}</p>
          </div>
          <input
            :value="item.quantity"
            type="number"
            min="1"
            class="w-16 rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            @input="updateQuantity(item.id, $event.target.value)"
          />
        </div>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <div class="flex items-center justify-between text-sm font-semibold text-slate-700">
          <span>Tam tinh</span>
          <span class="text-primary">{{ formatCurrency(cartTotal) }}</span>
        </div>
        <input
          v-model.trim="checkoutForm.customer"
          type="text"
          placeholder="Nguoi nhan (de trong neu giong tai khoan)"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          v-model.trim="checkoutForm.address"
          type="text"
          placeholder="Dia chi giao hang"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          v-model="checkoutForm.payment"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="COD">Thanh toan khi nhan hang</option>
          <option value="Bank">Chuyen khoan</option>
        </select>
        <textarea
          v-model.trim="checkoutForm.note"
          rows="2"
          placeholder="Ghi chu cho don hang (khong bat buoc)"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          class="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          :disabled="!hasCart || submitting"
          @click="placeOrder"
        >
          {{ submitting ? 'Dang dat hang...' : 'Dat hang' }}
        </button>
        <p class="text-xs text-slate-500">
          Don hang cua ban se duoc xac nhan qua thong tin lien he da cung cap.
        </p>
      </div>
    </div>
  </div>
</template>
