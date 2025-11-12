<template>
  <div class="space-y-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Quản lý đơn hàng</h1>
        <p class="text-sm text-slate-500">
          Theo dõi tình trạng và cập nhật trạng thái đơn hàng của khách.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative">
          <span
            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
          >
            🔍
          </span>
          <input
            v-model.trim="searchQuery"
            type="text"
            placeholder="Tìm theo mã hoặc khách hàng..."
            class="w-56 rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          v-model="selectedStatus"
          class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Tất cả trạng thái</option>
          <option v-for="status in statuses" :key="status.value" :value="status.value">
            {{ status.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-slate-200">
      <table class="min-w-full divide-y divide-slate-200 text-left">
        <thead class="bg-slate-50">
          <tr class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th scope="col" class="py-3 pl-4 pr-3">Mã đơn</th>
            <th scope="col" class="py-3 pr-3">Khách hàng</th>
            <th scope="col" class="py-3 pr-3">Sản phẩm</th>
            <th scope="col" class="py-3 pr-3">Tổng tiền</th>
            <th scope="col" class="py-3 pr-3">Trạng thái</th>
            <th scope="col" class="py-3 pr-3">Cập nhật</th>
            <th scope="col" class="py-3 pr-3">Hành động</th>
          </tr>
        </thead>
        <tbody class="bg-white">
          <OrderRow
            v-for="order in paginatedOrders"
            :key="order.id"
            :order="order"
            :statuses="statuses"
            :can-update-status="canUpdateStatus"
            :can-delete="canDelete"
            @view="emit('view', $event)"
            @delete="emit('delete', $event)"
            @update-status="emit('update-status', $event)"
          />
          <tr v-if="!paginatedOrders.length">
            <td
              colspan="7"
              class="py-10 text-center text-sm font-medium text-slate-500"
            >
              Không tìm thấy đơn hàng phù hợp. Hãy điều chỉnh tìm kiếm hoặc bộ lọc.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <p class="text-sm text-slate-500">
        Tổng cộng {{ filteredOrders.length }} đơn hàng
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
import OrderRow from './OrderRow.vue'

const props = defineProps({
  orders: {
    type: Array,
    required: true,
  },
  statuses: {
    type: Array,
    default: () => [],
  },
  pageSize: {
    type: Number,
    default: 6,
  },
  canUpdateStatus: {
    type: Boolean,
    default: true,
  },
  canDelete: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['view', 'update-status', 'delete'])

const searchQuery = ref('')
const selectedStatus = ref('all')
const currentPage = ref(1)

watch([searchQuery, selectedStatus], () => {
  currentPage.value = 1
})

const filteredOrders = computed(() => {
  const normalizedQuery = searchQuery.value.toLowerCase()

  return props.orders
    .filter((order) => {
      const matchByQuery =
        order.id.toLowerCase().includes(normalizedQuery) ||
        order.customer.toLowerCase().includes(normalizedQuery)
      const matchByStatus =
        selectedStatus.value === 'all' || order.status === selectedStatus.value
      return matchByQuery && matchByStatus
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
})

const totalPages = computed(() =>
  filteredOrders.value.length
    ? Math.ceil(filteredOrders.value.length / props.pageSize)
    : 0,
)

watch(
  [filteredOrders, totalPages],
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value || 1
    }
  },
  { flush: 'post' },
)

const paginatedOrders = computed(() => {
  if (!filteredOrders.value.length) {
    return []
  }
  const start = (currentPage.value - 1) * props.pageSize
  return filteredOrders.value.slice(start, start + props.pageSize)
})
</script>
