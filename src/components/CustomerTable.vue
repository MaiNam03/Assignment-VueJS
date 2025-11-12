<template>
  <div class="space-y-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Quản lý khách hàng</h1>
        <p class="text-sm text-slate-500">
          Lưu trữ thông tin liên hệ, phân loại và theo dõi giá trị khách hàng.
        </p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div class="relative">
          <span
            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
          >
            🔍
          </span>
          <input
            v-model.trim="searchQuery"
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            class="w-56 rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          v-model="selectedTier"
          class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Tất cả hạng</option>
          <option v-for="tier in tiers" :key="tier" :value="tier">
            {{ tier }}
          </option>
        </select>
        <button
          type="button"
          class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition"
          :class="
            canManage
              ? 'bg-primary text-white shadow-primary/30 hover:bg-primary/90'
              : 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
          "
          :disabled="!canManage"
          @click="emit('add-new')"
        >
          ＋ Khách hàng mới
        </button>
      </div>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-slate-200">
      <table class="min-w-full divide-y divide-slate-200 text-left">
        <thead class="bg-slate-50">
          <tr class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th scope="col" class="py-3 pl-4 pr-3">Khách hàng</th>
            <th scope="col" class="py-3 pr-3">Số điện thoại</th>
            <th scope="col" class="py-3 pr-3">Số đơn</th>
            <th scope="col" class="py-3 pr-3">Tổng chi tiêu</th>
            <th scope="col" class="py-3 pr-3">Hạng</th>
            <th scope="col" class="py-3 pr-3">Tham gia</th>
            <th scope="col" class="py-3 pr-3">Hành động</th>
          </tr>
        </thead>
        <tbody class="bg-white">
          <CustomerRow
            v-for="customer in paginatedCustomers"
            :key="customer.id"
            :customer="customer"
            :can-manage="canManage"
            :can-delete="canDelete"
            @view="emit('view', $event)"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
          />
          <tr v-if="!paginatedCustomers.length">
            <td
              colspan="7"
              class="py-10 text-center text-sm font-medium text-slate-500"
            >
              Không có khách hàng phù hợp. Hãy điều chỉnh bộ lọc hoặc tìm kiếm.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <p class="text-sm text-slate-500">
        Tổng cộng {{ filteredCustomers.length }} khách hàng
      </p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          Trước
        </button>
        <template v-for="page in totalPages" :key="page">
          <button
            type="button"
            class="rounded-full px-3 py-1.5 text-sm font-semibold transition"
            :class="
              page === currentPage
                ? 'bg-primary text-white shadow-sm shadow-primary/40'
                : 'border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
            "
            @click="currentPage = page"
          >
            {{ page }}
          </button>
        </template>
        <button
          type="button"
          class="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="currentPage === totalPages || totalPages === 0"
          @click="currentPage++"
        >
          Sau
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import CustomerRow from './CustomerRow.vue'

const props = defineProps({
  customers: {
    type: Array,
    required: true,
  },
  tiers: {
    type: Array,
    default: () => [],
  },
  pageSize: {
    type: Number,
    default: 6,
  },
  canManage: {
    type: Boolean,
    default: true,
  },
  canDelete: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['add-new', 'view', 'edit', 'delete'])

const searchQuery = ref('')
const selectedTier = ref('all')
const currentPage = ref(1)

watch([searchQuery, selectedTier], () => {
  currentPage.value = 1
})

const filteredCustomers = computed(() => {
  const normalizedQuery = searchQuery.value.toLowerCase()
  return props.customers
    .filter((customer) => {
      const matchByQuery =
        customer.name.toLowerCase().includes(normalizedQuery) ||
        customer.email.toLowerCase().includes(normalizedQuery)
      const matchByTier = selectedTier.value === 'all' || customer.tier === selectedTier.value
      return matchByQuery && matchByTier
    })
    .sort(
      (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime(),
    )
})

const totalPages = computed(() =>
  filteredCustomers.value.length
    ? Math.ceil(filteredCustomers.value.length / props.pageSize)
    : 0,
)

watch(
  [filteredCustomers, totalPages],
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value || 1
    }
  },
  { flush: 'post' },
)

const paginatedCustomers = computed(() => {
  if (!filteredCustomers.value.length) {
    return []
  }
  const start = (currentPage.value - 1) * props.pageSize
  return filteredCustomers.value.slice(start, start + props.pageSize)
})
</script>
