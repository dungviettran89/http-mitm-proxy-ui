import { ref, readonly, computed } from 'vue'
import type { RequestRecord, SortState, FilterState } from '../types'
import { fetchRequests, clearRequests as apiClearRequests } from '../services/api'
import { wsService } from '../services/websocket'

const requests = ref<RequestRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const total = ref(0)
const config = ref<{
  maxRequests: number
  proxyPort: number
  uiPort: number
  enableModification: boolean
} | null>(null)

const sort = ref<SortState>({ field: 'timestamp', direction: 'desc' })
const filters = ref<FilterState>({
  method: '',
  status: '',
  domain: '',
  contentType: '',
  search: '',
})

const selectedId = ref<string | null>(null)

const filteredAndSorted = computed(() => {
  let result = [...requests.value]

  // Apply filters
  if (filters.value.method) {
    const methods = filters.value.method
      .toUpperCase()
      .split(',')
      .map((m) => m.trim())
    result = result.filter((r) => methods.includes(r.method.toUpperCase()))
  }
  if (filters.value.status) {
    const statusFilters = filters.value.status.split(',').map((s) => s.trim())
    result = result.filter((r) => {
      const status = r.response?.statusCode
      if (!status) return false
      return statusFilters.some((filter) => {
        if (filter.endsWith('xx')) {
          const digit = parseInt(filter.charAt(0), 10)
          const rangeStart = digit * 100
          return status >= rangeStart && status < rangeStart + 100
        }
        return status === parseInt(filter, 10)
      })
    })
  }
  if (filters.value.domain) {
    const domainLower = filters.value.domain.toLowerCase()
    result = result.filter((r) => r.url.toLowerCase().includes(domainLower))
  }
  if (filters.value.contentType) {
    const ctLower = filters.value.contentType.toLowerCase()
    result = result.filter((r) => {
      const reqCt = r.contentType?.toLowerCase() || ''
      const resCt = r.response?.contentType?.toLowerCase() || ''
      return reqCt.includes(ctLower) || resCt.includes(ctLower)
    })
  }
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter((r) => {
      const urlMatch = r.url.toLowerCase().includes(searchLower)
      const methodMatch = r.method.toLowerCase().includes(searchLower)
      const bodyMatch =
        typeof r.body === 'string' ? r.body.toLowerCase().includes(searchLower) : false
      const responseBodyMatch =
        typeof r.response?.body === 'string'
          ? r.response.body.toLowerCase().includes(searchLower)
          : false
      return urlMatch || methodMatch || bodyMatch || responseBodyMatch
    })
  }

  // Apply sort
  const { field, direction } = sort.value
  const multiplier = direction === 'asc' ? 1 : -1
  result.sort((a, b) => {
    let aVal: string | number = 0
    let bVal: string | number = 0

    switch (field) {
      case 'timestamp':
        aVal = a.timestamp
        bVal = b.timestamp
        break
      case 'method':
        aVal = a.method
        bVal = b.method
        break
      case 'url':
        aVal = a.url
        bVal = b.url
        break
      case 'status':
        aVal = a.response?.statusCode ?? 0
        bVal = b.response?.statusCode ?? 0
        break
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return multiplier * aVal.localeCompare(bVal)
    }
    return multiplier * ((aVal as number) - (bVal as number))
  })

  return result
})

const selectedRequest = computed(() => {
  if (!selectedId.value) return null
  return requests.value.find((r) => r.id === selectedId.value) || null
})

async function loadRequests(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await fetchRequests({ limit: '1000' })
    requests.value = response.data
    total.value = response.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load requests'
  } finally {
    loading.value = false
  }
}

async function clearRequests(): Promise<void> {
  try {
    await apiClearRequests()
    requests.value = []
    total.value = 0
    selectedId.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to clear requests'
  }
}

function selectRequest(id: string | null): void {
  selectedId.value = id
}

function setSort(field: SortState['field']): void {
  if (sort.value.field === field) {
    sort.value.direction = sort.value.direction === 'asc' ? 'desc' : 'asc'
  } else {
    sort.value = { field, direction: field === 'timestamp' ? 'desc' : 'asc' }
  }
}

function setFilters(newFilters: Partial<FilterState>): void {
  filters.value = { ...filters.value, ...newFilters }
}

function clearFilters(): void {
  filters.value = { method: '', status: '', domain: '', contentType: '', search: '' }
}

function hasActiveFilters(): boolean {
  return !!(
    filters.value.method ||
    filters.value.status ||
    filters.value.domain ||
    filters.value.contentType ||
    filters.value.search
  )
}

function setupWebSocket(): void {
  wsService.onMessage((msg) => {
    switch (msg.type) {
      case 'init':
        requests.value = (msg.data as RequestRecord[]) || []
        total.value = requests.value.length
        break
      case 'request':
      case 'response': {
        const req = msg.data as RequestRecord
        const idx = requests.value.findIndex((r) => r.id === req.id)
        if (idx >= 0) {
          requests.value.splice(idx, 1, req) // Use splice for Vue reactivity
        } else {
          requests.value.push(req)
        }
        total.value = requests.value.length
        break
      }
      case 'clear':
        requests.value = []
        total.value = 0
        selectedId.value = null
        break
    }
  })
}

export function useRequests() {
  return {
    requests: readonly(requests),
    loading: readonly(loading),
    error: readonly(error),
    total: readonly(total),
    config: readonly(config),
    sort: readonly(sort),
    filters: readonly(filters),
    selectedId: readonly(selectedId),
    filteredAndSorted,
    selectedRequest,
    loadRequests,
    clearRequests,
    selectRequest,
    setSort,
    setFilters,
    clearFilters,
    hasActiveFilters,
    setupWebSocket,
  }
}
