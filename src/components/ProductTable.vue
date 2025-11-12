<template>
  <div class="space-y-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Quản lý sản phẩm</h1>
        <p class="text-sm text-slate-500">
          Theo dõi danh mục, giá và tình trạng sản phẩm của bạn.
        </p>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition"
        :class="
          canManage
            ? 'bg-primary text-white shadow-primary/30 hover:bg-primary/90'
            : 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
        "
        :disabled="!canManage"
        @click="emit('add-new')"
      >
        <span class="text-lg leading-none">＋</span>
        Thêm sản phẩm mới
      </button>
    </div>

    <div
      class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 lg:flex-1">
        <div class="relative flex-1">
          <span
            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
          >
            🔍
          </span>
          <input
            v-model.trim="searchQuery"
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            class="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <select
          v-model="selectedCategory"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-48"
        >
          <option value="all">Tất cả danh mục</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
        <select
          v-model="sortOption"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-48"
        >
          <option value="none">Sắp xếp theo giá</option>
          <option value="asc">Giá: Thấp → Cao</option>
          <option value="desc">Giá: Cao → Thấp</option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-slate-200">
      <table class="min-w-full divide-y divide-slate-200 text-left">
        <thead class="bg-slate-50">
          <tr class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th scope="col" class="py-3 pl-4 pr-3">ID</th>
            <th scope="col" class="py-3 pr-3">Hình ảnh</th>
            <th scope="col" class="py-3 pr-3">Sản phẩm</th>
            <th scope="col" class="py-3 pr-3">Giá</th>
            <th scope="col" class="py-3 pr-3">Danh mục</th>
            <th scope="col" class="py-3 pr-3">Trạng thái</th>
            <th scope="col" class="py-3 pr-3">Hành động</th>
          </tr>
        </thead>
        <tbody class="bg-white">
          <ProductRow
            v-for="product in paginatedProducts"
            :key="product.id"
            :product="product"
            :can-manage="canManage"
            @toggle-status="emit('toggle-status', $event)"
            @view="emit('view', $event)"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
          />
          <tr v-if="!paginatedProducts.length">
            <td
              colspan="7"
              class="py-10 text-center text-sm font-medium text-slate-500"
            >
              Không tìm thấy sản phẩm. Hãy điều chỉnh bộ lọc.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <p class="text-sm text-slate-500">
        Tổng cộng {{ filteredProducts.length }} sản phẩm
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
import ProductRow from './ProductRow.vue'

const props = defineProps({
  products: {
    type: Array,
    required: true,
  },
  categories: {
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
})

const emit = defineEmits(['toggle-status', 'view', 'edit', 'delete', 'add-new'])

const searchQuery = ref('')
const selectedCategory = ref('all')
const sortOption = ref('none')
const currentPage = ref(1)

watch([searchQuery, selectedCategory, sortOption], () => {
  currentPage.value = 1
})

const filteredProducts = computed(() => {
  const normalizedQuery = searchQuery.value.toLowerCase()

  return props.products
    .filter((product) => {
      const matchByName = product.name.toLowerCase().includes(normalizedQuery)
      const matchByCategory =
        selectedCategory.value === 'all' || product.category === selectedCategory.value
      return matchByName && matchByCategory
    })
    .sort((a, b) => {
      if (sortOption.value === 'asc') {
        return a.price - b.price
      }
      if (sortOption.value === 'desc') {
        return b.price - a.price
      }
      return 0
    })
})

const totalPages = computed(() =>
  filteredProducts.value.length
    ? Math.ceil(filteredProducts.value.length / props.pageSize)
    : 0,
)

watch(
  [filteredProducts, totalPages],
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value || 1
    }
  },
  { flush: 'post' },
)

const paginatedProducts = computed(() => {
  if (!filteredProducts.value.length) {
    return []
  }
  const start = (currentPage.value - 1) * props.pageSize
  return filteredProducts.value.slice(start, start + props.pageSize)
})
</script>
