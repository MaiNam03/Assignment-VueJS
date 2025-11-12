<template>
  <tr class="group border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50">
    <td class="py-4 pl-4 pr-3 text-sm font-semibold text-slate-500">#{{ product.id }}</td>
    <td class="py-4 pr-3">
      <img
        :src="product.image"
        :alt="product.name"
        class="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200 ring-offset-2 ring-offset-white"
      />
    </td>
    <td class="py-4 pr-3">
      <div class="font-semibold text-slate-800">{{ product.name }}</div>
      <p class="description text-sm text-slate-500">{{ product.description }}</p>
    </td>
    <td class="py-4 pr-3 text-sm font-semibold text-slate-800">
      {{ formattedPrice }}
    </td>
    <td class="py-4 pr-3">
      <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {{ product.category }}
      </span>
    </td>
    <td class="py-4 pr-3 text-sm">
      <button
        type="button"
        class="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
        :class="[
          statusClasses,
          !canManage ? 'cursor-not-allowed opacity-60' : 'hover:opacity-90',
        ]"
        :disabled="!canManage"
        @click="$emit('toggle-status', product.id)"
      >
        <span class="inline-block h-2 w-2 rounded-full" :class="indicatorClasses" />
        {{ statusLabel }}
      </button>
    </td>
    <td class="py-4 pr-3 text-sm">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-primary hover:text-primary"
          title="Xem"
          @click="$emit('view', product)"
        >
          👁
        </button>
        <button
          type="button"
          class="rounded-full border border-slate-200 p-2 text-slate-500 transition"
          :class="canManage ? 'hover:border-primary hover:text-primary' : 'cursor-not-allowed opacity-50'"
          :disabled="!canManage"
          title="Chỉnh sửa"
          @click="$emit('edit', product)"
        >
          ✏️
        </button>
        <button
          type="button"
          class="rounded-full border border-slate-200 p-2 text-slate-400 transition"
          :class="canManage ? 'hover:border-rose-400 hover:text-rose-500' : 'cursor-not-allowed opacity-50'"
          :disabled="!canManage"
          title="Xóa"
          @click="$emit('delete', product.id)"
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
  product: {
    type: Object,
    required: true,
  },
  canManage: {
    type: Boolean,
    default: true,
  },
})

const statusLabel = computed(() =>
  props.product.status === 'available' ? 'Đang bán' : 'Tạm ngưng',
)

const statusClasses = computed(() =>
  props.product.status === 'available'
    ? 'bg-status-available/10 text-status-available'
    : 'bg-status-unavailable/40 text-status-unavailable',
)

const indicatorClasses = computed(() =>
  props.product.status === 'available' ? 'bg-status-available' : 'bg-status-unavailable',
)

const formattedPrice = computed(() =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(props.product.price),
)
</script>

<style scoped>
.description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
