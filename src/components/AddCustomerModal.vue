<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10"
    @click.self="handleClose"
  >
    <div class="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-100">
      <header class="mb-6 flex items-start justify-between">
        <div>
          <h2 class="text-xl font-semibold text-slate-900">
            {{ mode === 'edit' ? 'Cập nhật khách hàng' : 'Khách hàng mới' }}
          </h2>
          <p class="text-sm text-slate-500">
            {{ mode === 'edit' ? 'Điều chỉnh dữ liệu liên hệ cho khách hàng này.' : 'Nhập thông tin cơ bản để thêm khách hàng vào hệ thống.' }}
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
            <label class="mb-1 block text-sm font-semibold text-slate-600" for="customer-name">
              Họ và tên
            </label>
            <input
              id="customer-name"
              v-model.trim="form.name"
              type="text"
              required
              placeholder="Ví dụ: Nguyễn Thùy Dung"
              class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-semibold text-slate-600" for="customer-email">
              Email
            </label>
            <input
              id="customer-email"
              v-model.trim="form.email"
              type="email"
              required
              placeholder="example@email.com"
              class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-semibold text-slate-600" for="customer-phone">
              Số điện thoại
            </label>
            <input
              id="customer-phone"
              v-model.trim="form.phone"
              type="tel"
              required
              placeholder="0901 234 567"
              class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-semibold text-slate-600" for="customer-tier">
              Phân hạng
            </label>
            <select
              id="customer-tier"
              v-model="form.tier"
              required
              class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="" disabled>Chọn hạng</option>
              <option v-for="tier in tiers" :key="tier" :value="tier">
                {{ tier }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-semibold text-slate-600" for="customer-address">
            Địa chỉ
          </label>
          <input
            id="customer-address"
            v-model.trim="form.address"
            type="text"
            placeholder="Ví dụ: 28 Nguyễn Trãi, Quận 1, TP. HCM"
            class="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-semibold text-slate-600" for="customer-notes">
            Ghi chú
          </label>
          <textarea
            id="customer-notes"
            v-model.trim="form.notes"
            rows="3"
            placeholder="Thông tin bổ sung, sở thích của khách hàng..."
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
            {{ mode === 'edit' ? 'Cập nhật' : 'Thêm khách hàng' }}
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
  mode: {
    type: String,
    default: 'create',
    validator: (value) => ['create', 'edit'].includes(value),
  },
  customer: {
    type: Object,
    default: null,
  },
  tiers: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  name: '',
  email: '',
  phone: '',
  tier: '',
  address: '',
  notes: '',
})

const resetForm = () => {
  form.name = ''
  form.email = ''
  form.phone = ''
  form.tier = props.tiers[0] || ''
  form.address = ''
  form.notes = ''
}

const assignFromCustomer = (customer) => {
  form.name = customer?.name ?? ''
  form.email = customer?.email ?? ''
  form.phone = customer?.phone ?? ''
  form.tier = customer?.tier ?? props.tiers[0] ?? ''
  form.address = customer?.address ?? ''
  form.notes = customer?.notes ?? ''
}

watch(
  () => props.visible,
  (value) => {
    if (value) {
      if (props.mode === 'edit' && props.customer) {
        assignFromCustomer(props.customer)
      } else {
        resetForm()
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.customer,
  (customer) => {
    if (props.visible && props.mode === 'edit' && customer) {
      assignFromCustomer(customer)
    }
  },
)

const handleClose = () => {
  emit('close')
}

const handleSubmit = () => {
  if (!form.name || !form.email || !form.phone || !form.tier) {
    return
  }

  emit('save', {
    mode: props.mode,
    id: props.customer?.id ?? null,
    name: form.name,
    email: form.email,
    phone: form.phone,
    tier: form.tier,
    address: form.address,
    notes: form.notes,
  })
  resetForm()
}
</script>
