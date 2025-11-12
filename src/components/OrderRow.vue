<template>
  <tr class="group border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50">
    <td class="py-4 pl-4 pr-3 text-sm font-semibold text-slate-500">
      {{ order.id }}
    </td>
    <td class="py-4 pr-3">
      <div class="font-semibold text-slate-800">{{ order.customer }}</div>
      <p class="text-xs text-slate-500">Đặt lúc {{ formattedDate }}</p>
    </td>
    <td class="py-4 pr-3">
      <p class="text-sm text-slate-600 line-clamp-2">
        {{ order.items }}
      </p>
    </td>
    <td class="py-4 pr-3 text-sm font-semibold text-slate-800">
      {{ formattedTotal }}
    </td>
    <td class="py-4 pr-3 text-sm">
      <span
        class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
        :class="currentStatus.badge"
      >
        <span class="inline-block h-2 w-2 rounded-full" :class="currentStatus.dot" />
        {{ currentStatus.label }}
      </span>
    </td>
    <td class="py-4 pr-3 text-sm">
      <select
        v-model="selectedStatus"
        class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        :disabled="!canUpdateStatus"
        @change="handleStatusChange"
      >
        <option v-for="status in statuses" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
    </td>
    <td class="py-4 pr-3 text-sm">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-primary hover:text-primary"
          title="Xem"
          @click="$emit('view', order)"
        >
          👁
        </button>
        <button
          type="button"
          class="rounded-full border border-slate-200 p-2 text-slate-400 transition"
          :class="canDelete ? 'hover:border-rose-400 hover:text-rose-500' : 'cursor-not-allowed opacity-50'"
          :disabled="!canDelete"
          title="Xóa"
          @click="$emit('delete', order.id)"
        >
          🗑
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  order: {
    type: Object,
    required: true,
  },
  statuses: {
    type: Array,
    default: () => [],
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

const selectedStatus = ref(props.order.status)

watch(
  () => props.order.status,
  (value) => {
    selectedStatus.value = value
  },
)

const handleStatusChange = () => {
  if (!props.canUpdateStatus) {
    return
  }
  emit('update-status', { id: props.order.id, status: selectedStatus.value })
}

const currentStatus = computed(
  () => props.statuses.find((status) => status.value === selectedStatus.value) ?? {},
)

const formattedTotal = computed(() =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(props.order.total),
)

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(props.order.createdAt)),
)
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
