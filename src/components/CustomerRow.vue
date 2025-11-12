<template>
  <tr class="group border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50">
    <td class="py-4 pl-4 pr-3">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {{ initials }}
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-900">{{ customer.name }}</p>
          <p class="text-xs text-slate-500">{{ customer.email }}</p>
        </div>
      </div>
    </td>
    <td class="py-4 pr-3 text-sm text-slate-600">
      {{ customer.phone }}
    </td>
    <td class="py-4 pr-3 text-sm text-slate-600">
      {{ customer.totalOrders }} đơn
    </td>
    <td class="py-4 pr-3 text-sm font-semibold text-slate-800">
      {{ formattedSpend }}
    </td>
    <td class="py-4 pr-3 text-sm">
      <span
        class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
        :class="tierBadge"
      >
        {{ customer.tier }}
      </span>
    </td>
    <td class="py-4 pr-3 text-sm text-slate-600">
      {{ formattedJoined }}
    </td>
    <td class="py-4 pr-3 text-sm">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-primary hover:text-primary"
          title="Xem"
          @click="$emit('view', customer)"
        >
          👁
        </button>
        <button
          type="button"
          class="rounded-full border border-slate-200 p-2 text-slate-500 transition"
          :class="canManage ? 'hover:border-primary hover:text-primary' : 'cursor-not-allowed opacity-50'"
          :disabled="!canManage"
          title="Chỉnh sửa"
          @click="$emit('edit', customer)"
        >
          ✏️
        </button>
        <button
          type="button"
          class="rounded-full border border-slate-200 p-2 text-slate-400 transition"
          :class="canDelete ? 'hover:border-rose-400 hover:text-rose-500' : 'cursor-not-allowed opacity-50'"
          :disabled="!canDelete"
          title="Xóa"
          @click="$emit('delete', customer.id)"
        >
          🗑
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  customer: {
    type: Object,
    required: true,
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

const initials = computed(() =>
  props.customer.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase(),
)

const tierBadge = computed(() => {
  switch (props.customer.tier) {
    case 'VIP':
      return 'bg-amber-100 text-amber-700'
    case 'Thân thiết':
      return 'bg-sky-100 text-sky-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
})

const formattedSpend = computed(() =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(props.customer.totalSpend),
)

const formattedJoined = computed(() =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(props.customer.joinedAt)),
)
</script>
