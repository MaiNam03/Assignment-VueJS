<template>
  <section class="space-y-8">
    <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Overview</h1>
        <p class="text-sm text-slate-500">
          Tóm tắt hiệu suất kinh doanh dựa trên sản phẩm, đơn hàng và khách hàng.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-slate-500" for="timeRange">Khoảng thời gian</label>
        <select
          id="timeRange"
          v-model="selectedRange"
          class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option v-for="option in timeRanges" :key="option">{{ option }}</option>
        </select>
      </div>
    </header>

    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Motion
        v-for="(metric, index) in metricCards"
        :key="metric.title"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.1 * index }"
      >
        <article class="flex h-full flex-col justify-between rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-500">{{ metric.title }}</p>
              <p class="mt-1 text-2xl font-bold text-slate-900">{{ metric.value }}</p>
              <div class="mt-1 flex items-center gap-2 text-xs font-semibold">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-1"
                  :class="metric.trend >= 0 ? 'bg-status-available/10 text-status-available' : 'bg-status-unavailable/20 text-status-unavailable'"
                >
                  <span aria-hidden="true">{{ metric.trend >= 0 ? '▲' : '▼' }}</span>
                  {{ formatTrend(metric.trend) }}
                </span>
                <span class="text-slate-400">vs. {{ selectedRange }}</span>
              </div>
            </div>
            <span
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary"
              aria-hidden="true"
            >
              {{ metric.icon }}
            </span>
          </div>
          <div class="mt-6 h-36">
            <Line
              v-if="metric.chartType === 'line'"
              :data="metric.dataset"
              :options="lineChartOptions"
            />
            <Bar
              v-else
              :data="metric.dataset"
              :options="barChartOptions"
            />
          </div>
        </article>
      </Motion>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Motion
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.4 }"
      >
        <section class="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100">
          <header class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">Recent Orders</h2>
              <p class="text-sm text-slate-500">Những đơn hàng mới nhất được đồng bộ từ dữ liệu sản phẩm.</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary"
            >
              Xem tất cả
            </button>
          </header>
          <div class="overflow-hidden rounded-2xl border border-slate-100">
            <ul role="list" class="divide-y divide-slate-100">
              <li
                v-for="order in recentOrders"
                :key="order.id"
                class="flex items-center justify-between bg-white px-5 py-4 transition hover:bg-slate-50"
              >
                <div class="flex flex-1 items-center gap-4">
                  <span class="text-sm font-semibold text-slate-500">{{ order.id }}</span>
                  <div>
                    <p class="text-sm font-semibold text-slate-900">{{ order.customer }}</p>
                    <p class="text-xs text-slate-500">{{ order.items }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-6">
                  <p class="text-sm font-semibold text-slate-900">{{ order.amount }}</p>
                  <button
                    type="button"
                    class="rounded-full border border-transparent px-2 py-1 text-lg text-slate-400 transition hover:border-slate-200 hover:text-slate-600"
                    aria-label="Thao tác thêm cho đơn hàng"
                  >
                    ⋮
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </Motion>

      <Motion
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.5 }"
      >
        <aside class="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100">
          <header class="mb-6">
            <h2 class="text-lg font-semibold text-slate-900">Trending Products</h2>
            <p class="text-sm text-slate-500">Top sản phẩm bán chạy dựa trên dữ liệu quản lý sản phẩm.</p>
          </header>
          <ol class="space-y-4">
            <li
              v-for="product in trendingProducts"
              :key="product.rank"
              class="flex items-center gap-4 rounded-2xl border border-slate-100 p-3 transition hover:bg-slate-50"
            >
              <span class="text-sm font-bold text-primary">#{{ product.rank }}</span>
              <img
                :src="product.image"
                :alt="product.name"
                class="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-100"
              />
              <div class="flex-1">
                <p class="text-sm font-semibold text-slate-900">{{ product.name }}</p>
                <p class="text-xs text-slate-500">{{ product.orders }}</p>
              </div>
              <p class="text-sm font-semibold text-slate-900">{{ product.revenue }}</p>
            </li>
          </ol>
        </aside>
      </Motion>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from '@motionone/vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const props = defineProps({
  products: {
    type: Array,
    default: () => [],
  },
  orders: {
    type: Array,
    default: () => [],
  },
  customers: {
    type: Array,
    default: () => [],
  },
})

const selectedRange = ref('This Week')
const timeRanges = ['Today', 'This Week', 'Last Week', 'This Month']

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value ?? 0)

const formatDayLabel = (date) => {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
  const dayMonth = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(
    date,
  )
  return `${weekday} ${dayMonth}`
}

const toDateKey = (date) => {
  const clone = new Date(date)
  clone.setHours(0, 0, 0, 0)
  return clone.toISOString().slice(0, 10)
}

const calculateTrend = (current, previous) => {
  if (previous === 0 && current === 0) {
    return 0
  }
  if (previous === 0) {
    return 100
  }
  return ((current - previous) / previous) * 100
}

const customerJoinMap = computed(() => {
  const map = new Map()
  props.customers.forEach((customer) => {
    const date = new Date(customer.joinedAt)
    if (Number.isNaN(date.getTime())) {
      return
    }
    const key = toDateKey(date)
    map.set(key, (map.get(key) ?? 0) + 1)
  })
  return map
})

const orderStatsMap = computed(() => {
  const map = new Map()
  props.orders.forEach((order) => {
    const date = new Date(order.createdAt)
    if (Number.isNaN(date.getTime())) {
      return
    }
    const key = toDateKey(date)
    const entry = map.get(key) ?? { date, total: 0, count: 0 }
    entry.total += order.total ?? 0
    entry.count += 1
    map.set(key, entry)
  })
  return map
})

const dailySeries = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const series = []

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const key = toDateKey(date)
    const orderStats = orderStatsMap.value.get(key) ?? { total: 0, count: 0 }
    const newCustomers = customerJoinMap.value.get(key) ?? 0

    series.push({
      key,
      date,
      label: formatDayLabel(date),
      revenue: orderStats.total,
      orders: orderStats.count,
      newCustomers,
    })
  }

  return series
})

const chartLabels = computed(() => dailySeries.value.map((day) => day.label))
const revenueSeries = computed(() => dailySeries.value.map((day) => day.revenue))
const ordersSeries = computed(() => dailySeries.value.map((day) => day.orders))
const newCustomersSeries = computed(() => dailySeries.value.map((day) => day.newCustomers))

const revenueLineData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: 'Doanh thu (₫)',
      data: revenueSeries.value,
      fill: true,
      borderColor: '#ff6b00',
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#ff6b00',
    },
  ],
}))

const ordersBarData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: 'Đơn hàng',
      data: ordersSeries.value,
      backgroundColor: 'rgba(34, 197, 94, 0.85)',
      borderRadius: 12,
      barThickness: 22,
    },
  ],
}))

const customersBarData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: 'Khách hàng mới',
      data: newCustomersSeries.value,
      backgroundColor: 'rgba(99, 102, 241, 0.85)',
      borderRadius: 12,
      barThickness: 22,
    },
  ],
}))

const latestDay = computed(() => dailySeries.value[dailySeries.value.length - 1] ?? {
  revenue: 0,
  orders: 0,
  newCustomers: 0,
})

const previousDay = computed(() => dailySeries.value[dailySeries.value.length - 2] ?? {
  revenue: 0,
  orders: 0,
  newCustomers: 0,
})

const revenueTrend = computed(() =>
  calculateTrend(latestDay.value.revenue, previousDay.value.revenue),
)
const ordersTrend = computed(() =>
  calculateTrend(latestDay.value.orders, previousDay.value.orders),
)
const customersTrend = computed(() =>
  calculateTrend(latestDay.value.newCustomers, previousDay.value.newCustomers),
)

const metricCards = computed(() => [
  {
    title: 'Daily Revenue',
    value: formatCurrency(latestDay.value.revenue),
    trend: revenueTrend.value,
    icon: '💰',
    chartType: 'line',
    dataset: revenueLineData.value,
  },
  {
    title: 'Daily Orders',
    value: `${latestDay.value.orders} đơn`,
    trend: ordersTrend.value,
    icon: '🧾',
    chartType: 'bar',
    dataset: ordersBarData.value,
  },
  {
    title: 'New Customers',
    value: `${latestDay.value.newCustomers} khách`,
    trend: customersTrend.value,
    icon: '🧑‍🤝‍🧑',
    chartType: 'bar',
    dataset: customersBarData.value,
  },
])

const recentOrders = computed(() =>
  [...props.orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((order) => ({
      id: order.id,
      customer: order.customer,
      items: order.items,
      amount: formatCurrency(order.total),
    })),
)

const trendingProducts = computed(() =>
  [...props.products]
    .filter((product) => product.ordersCount !== undefined)
    .sort((a, b) => (b.ordersCount ?? 0) - (a.ordersCount ?? 0))
    .slice(0, 4)
    .map((product, index) => ({
      rank: index + 1,
      name: product.name,
      revenue: formatCurrency(product.revenue ?? product.price * (product.ordersCount ?? 0)),
      orders: `Đặt ${product.ordersCount ?? 0} lần`,
      image: product.image,
    })),
)

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#f8fafc',
      borderColor: '#334155',
      borderWidth: 1,
      displayColors: false,
      callbacks: {
        label: (context) => formatCurrency(context.parsed.y),
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#94a3b8',
        font: { size: 11 },
      },
    },
    y: {
      grid: {
        color: '#e2e8f0',
        drawBorder: false,
      },
      ticks: {
        color: '#94a3b8',
        font: { size: 11 },
        beginAtZero: true,
        callback: (value) => `${Math.round(value / 1000)}k`,
      },
    },
  },
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#f8fafc',
      borderColor: '#334155',
      borderWidth: 1,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#94a3b8',
        font: { size: 11 },
      },
    },
    y: {
      grid: {
        color: '#e2e8f0',
        drawBorder: false,
      },
      ticks: {
        color: '#94a3b8',
        font: { size: 11 },
        beginAtZero: true,
        precision: 0,
      },
    },
  },
}

const formatTrend = (trend) =>
  Number.isFinite(trend) ? `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%` : '+0.0%'
</script>
