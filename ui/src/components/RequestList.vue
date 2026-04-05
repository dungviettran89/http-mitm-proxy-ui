<script setup lang="ts">
import type { RequestRecord, SortField } from '../types'

const props = defineProps<{
  requests: RequestRecord[]
  selectedId: string | null
  loading: boolean
}>()

const emit = defineEmits<{
  'row-click': [id: string]
}>()

function getStatusClass(req: RequestRecord): string {
  if (!req.response) return 'status-pending'
  const code = req.response.statusCode
  if (code >= 200 && code < 300) return 'status-2xx'
  if (code >= 300 && code < 400) return 'status-3xx'
  if (code >= 400 && code < 500) return 'status-4xx'
  if (code >= 500) return 'status-5xx'
  return 'status-other'
}

function getStatusText(req: RequestRecord): string {
  if (!req.response) return 'Pending'
  return `${req.response.statusCode} ${req.response.statusMessage || ''}`
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions)
}

function formatUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}

function formatDomain(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname
  } catch {
    return ''
  }
}

function getMethodClass(method: string): string {
  const m = method.toUpperCase()
  if (m === 'GET') return 'method-get'
  if (m === 'POST') return 'method-post'
  if (m === 'PUT') return 'method-put'
  if (m === 'DELETE') return 'method-delete'
  if (m === 'PATCH') return 'method-patch'
  return 'method-other'
}

const sortFields: { key: SortField; label: string }[] = [
  { key: 'timestamp', label: 'Time' },
  { key: 'method', label: 'Method' },
  { key: 'url', label: 'URL' },
  { key: 'status', label: 'Status' },
]
</script>

<template>
  <div class="request-list-container">
    <table class="request-table">
      <thead>
        <tr>
          <th v-for="sf in sortFields" :key="sf.key" class="sort-header">
            <span>{{ sf.label }}</span>
          </th>
          <th>Domain</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="req in requests"
          :key="req.id"
          :class="[
            'request-row',
            { selected: selectedId === req.id, 'row-pending': !req.response },
          ]"
          @click="$emit('row-click', req.id)"
        >
          <td>
            <span class="method-badge" :class="getMethodClass(req.method)">
              {{ req.method }}
            </span>
          </td>
          <td class="url-cell" :title="req.url">
            {{ formatUrl(req.url) }}
          </td>
          <td>
            <span class="status-badge" :class="getStatusClass(req)">
              {{ getStatusText(req) }}
            </span>
          </td>
          <td class="time-cell">
            {{ formatTimestamp(req.timestamp) }}
          </td>
          <td class="domain-cell" :title="formatDomain(req.url)">
            {{ formatDomain(req.url) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
