<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10"
    @click.self="handleClose"
  >
    <div
      class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-100"
    >
      <header class="mb-6 flex items-start justify-between">
        <div>
          <h2 class="text-xl font-semibold text-slate-900">
            {{ props.mode === 'edit' ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới' }}
          </h2>
          <p class="text-sm text-slate-500">
            {{ props.mode === 'edit' ? 'Điều chỉnh thông tin sản phẩm hiện có.' : 'Nhập thông tin cơ bản để đưa sản phẩm vào danh mục của bạn.' }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Đóng"
          @click="handleClose"
        >
          ✕
        </button>
      </header>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm font-semibold text-slate-600" for="name">
              Tên sản phẩm
            </label>
            <input
              id="name"
              v-model.trim="form.name"
              type="text"
              required
              placeholder="Ví dụ: Mì Spaghetti Bolognese"
              class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-semibold text-slate-600" for="price">
              Giá (VND)
            </label>
            <input
              id="price"
              v-model.number="form.price"
              type="number"
              min="0"
              step="1000"
              required
              placeholder="125000"
              class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label
              class="mb-1 block text-sm font-semibold text-slate-600"
              for="category"
            >
              Danh mục
            </label>
            <select
              id="category"
              v-model="form.category"
              required
              class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="" disabled>Chọn danh mục</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-sm font-semibold text-slate-600">
              Trạng thái
            </label>
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold transition"
                :class="
                  form.status === 'available'
                    ? 'border-transparent bg-status-available/10 text-status-available'
                    : 'border-slate-200 text-slate-500 hover:border-primary hover:text-primary'
                "
                @click="form.status = 'available'"
              >
                Đang bán
              </button>
              <button
                type="button"
                class="flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold transition"
                :class="
                  form.status === 'unavailable'
                    ? 'border-transparent bg-status-unavailable/20 text-status-unavailable'
                    : 'border-slate-200 text-slate-500 hover:border-primary hover:text-primary'
                "
                @click="form.status = 'unavailable'"
              >
                Tạm ngưng
              </button>
            </div>
          </div>
        </div>

        <div>
          <label
            class="mb-1 block text-sm font-semibold text-slate-600"
            for="image"
          >
            Đường dẫn hình ảnh
          </label>
          <input
            id="image"
            v-model.trim="form.image"
            type="url"
            placeholder="https://example.com/hinh-anh.jpg"
            class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label
            class="mb-1 block text-sm font-semibold text-slate-600"
            for="description"
          >
            Mô tả ngắn
          </label>
          <textarea
            id="description"
            v-model.trim="form.description"
            rows="3"
            placeholder="Mô tả ngắn gọn về sản phẩm..."
            class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            class="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            @click="handleClose"
          >
            Huỷ
          </button>
          <button
            type="submit"
            class="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
          >
            {{ props.mode === 'edit' ? 'Cập nhật' : 'Lưu sản phẩm' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  categories: {
    type: Array,
    default: () => [],
  },
  mode: {
    type: String,
    default: 'create',
    validator: (value) => ['create', 'edit'].includes(value),
  },
  product: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  name: '',
  price: null,
  category: '',
  status: 'available',
  image: '',
  description: '',
})

const resetForm = () => {
  form.name = ''
  form.price = null
  form.category = props.categories[0] || ''
  form.status = 'available'
  form.image = ''
  form.description = ''
}

watch(
  () => props.visible,
  (value) => {
    if (value) {
      if (props.mode === 'edit' && props.product) {
        form.name = props.product.name ?? ''
        form.price = props.product.price ?? null
        form.category = props.product.category ?? props.categories[0] ?? ''
        form.status = props.product.status ?? 'available'
        form.image = props.product.image ?? ''
        form.description = props.product.description ?? ''
      } else {
        resetForm()
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.product,
  (value) => {
    if (props.visible && props.mode === 'edit' && value) {
      form.name = value.name ?? ''
      form.price = value.price ?? null
      form.category = value.category ?? props.categories[0] ?? ''
      form.status = value.status ?? 'available'
      form.image = value.image ?? ''
      form.description = value.description ?? ''
    }
  },
)

const handleClose = () => {
  emit('close')
}

const handleSubmit = () => {
  if (!form.name || form.price === null || !form.category) {
    return
  }

  emit('save', {
    mode: props.mode,
    id: props.product?.id ?? null,
    name: form.name,
    price: Number(form.price),
    category: form.category,
    status: form.status,
    image: form.image || getFallbackImage(form.category),
    description: form.description,
  })
  resetForm()
}

const fallbackImages = {
  'Mì Ý':
    'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=300&q=80',
  'Tráng miệng':
    'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=300&q=80',
  'Đồ uống':
    'https://images.unsplash.com/photo-1510626176961-4b37d0f0b831?auto=format&fit=crop&w=300&q=80',
  Salad:
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=300&q=80',
}

const getFallbackImage = (category) => fallbackImages[category] || fallbackImages['Mì Ý']
</script>
