<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  users: {
    type: Array,
    default: () => [],
  },
  assignableRoles: {
    type: Array,
    default: () => [],
  },
  creating: {
    type: Boolean,
    default: false,
  },
  savingUserId: {
    type: String,
    default: '',
  },
  deletingUserId: {
    type: String,
    default: '',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['create', 'update-role', 'delete'])

const newUser = reactive({
  name: '',
  username: '',
  password: '',
  role: '',
})

watch(
  () => props.assignableRoles,
  (roles) => {
    if (!roles.length) {
      newUser.role = ''
      return
    }
    if (!roles.find((role) => role.value === newUser.role)) {
      newUser.role = roles[0].value
    }
  },
  { immediate: true, deep: true },
)

const draftRoles = reactive({})

watch(
  () => props.users,
  (list) => {
    Object.keys(draftRoles).forEach((key) => delete draftRoles[key])
    list.forEach((user) => {
      draftRoles[user.id] = user.role
    })
  },
  { immediate: true, deep: true },
)

const isSubmitDisabled = computed(
  () =>
    !newUser.name.trim() ||
    !newUser.username.trim() ||
    !newUser.password.trim() ||
    !newUser.role ||
    props.creating,
)

const handleCreate = () => {
  const payload = {
    name: newUser.name.trim(),
    username: newUser.username.trim(),
    password: newUser.password.trim(),
    role: newUser.role,
  }
  if (!payload.name || !payload.username || !payload.password || !payload.role) {
    return
  }
  emit('create', payload)
  newUser.name = ''
  newUser.username = ''
  newUser.password = ''
}

const emitUpdateRole = (userId) => {
  const nextRole = draftRoles[userId]
  const target = props.users.find((user) => user.id === userId)
  if (!target || !nextRole || nextRole === target.role || target.role === 'admin') {
    return
  }
  emit('update-role', { id: userId, role: nextRole })
}

const emitDeleteUser = (userId) => emit('delete', userId)

const isSaving = (userId) => props.savingUserId === userId
const isDeleting = (userId) => props.deletingUserId === userId
</script>

<template>
  <div class="space-y-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold text-slate-900">Quan ly tai khoan</h1>
      <p class="text-sm text-slate-500">
        Chi tai khoan admin duoc phep tao moi va phan quyen nhan vien/khach hang.
      </p>
    </div>

    <div class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <h2 class="text-sm font-semibold text-slate-700">Tao tai khoan moi</h2>
      <form class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="handleCreate">
        <input
          v-model.trim="newUser.name"
          type="text"
          placeholder="Ho ten"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          v-model.trim="newUser.username"
          type="text"
          placeholder="Ten dang nhap"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          v-model.trim="newUser.password"
          type="password"
          placeholder="Mat khau"
          class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div class="flex items-center gap-2">
          <select
            v-model="newUser.role"
            class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option v-for="role in assignableRoles" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </select>
          <button
            type="submit"
            class="whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            :disabled="isSubmitDisabled"
          >
            {{ creating ? 'Dang tao...' : 'Them tai khoan' }}
          </button>
        </div>
      </form>
      <p class="mt-2 text-xs text-slate-500">
        Admin van giu nguyen, khong tao moi tai khoan admin de dam bao chi mot admin duy nhat.
      </p>
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <div
        v-if="isLoading"
        class="px-4 py-3 text-sm font-semibold text-slate-500"
      >
        Dang tai danh sach tai khoan...
      </div>
      <div v-else-if="!users.length" class="px-4 py-6 text-sm text-slate-500">
        Chua co tai khoan nao duoc tao.
      </div>
      <table v-else class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
              Tai khoan
            </th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
              Vai tro
            </th>
            <th scope="col" class="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
              Thao tac
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          <tr v-for="user in users" :key="user.id">
            <td class="px-4 py-3">
              <div class="font-semibold text-slate-900">{{ user.name }}</div>
              <div class="text-xs text-slate-500">@{{ user.username }}</div>
            </td>
            <td class="px-4 py-3">
              <span
                v-if="user.role === 'admin'"
                class="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              >
                Admin (duy nhat)
              </span>
              <select
                v-else
                v-model="draftRoles[user.id]"
                class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option v-for="role in assignableRoles" :key="role.value" :value="role.value">
                  {{ role.label }}
                </option>
              </select>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                  :disabled="
                    user.role === 'admin' ||
                    draftRoles[user.id] === user.role ||
                    isSaving(user.id) ||
                    !draftRoles[user.id]
                  "
                  @click="emitUpdateRole(user.id)"
                >
                  {{ isSaving(user.id) ? 'Dang luu...' : 'Cap quyen' }}
                </button>
                <button
                  type="button"
                  class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                  :disabled="user.role === 'admin' || isDeleting(user.id)"
                  @click="emitDeleteUser(user.id)"
                >
                  {{ isDeleting(user.id) ? 'Dang xoa...' : 'Xoa' }}
                </button>
              </div>
              <p v-if="user.role === 'admin'" class="mt-2 text-right text-xs text-slate-400">
                Admin duy nhat co the cap quyen.
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
