<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { fetchRequest } from '../services/api'
import type { RequestRecord } from '../types'

const props = defineProps<{
  requestId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const request = ref<RequestRecord | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'request' | 'response' | 'headers' | 'timing'>('request')

watch(
  () => props.requestId,
  async (id) => {
    loading.value = true
    error.value = null
    try {
      request.value = await fetchRequest(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load request details'
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

function bodyToString(body: unknown): string {
  if (!body) return ''
  // Already a string
  if (typeof body === 'string') return body
  // Buffer-like object (from JSON-serialized Buffer: { type: 'Buffer', data: [...] })
  if (typeof body === 'object' && 'data' in body && Array.isArray((body as any).data)) {
    return String.fromCharCode(...(body as any).data)
  }
  // Actual Buffer
  if (typeof body === 'object' && 'byteLength' in body) {
    return (body as Buffer).toString('utf-8')
  }
  // Fallback: stringify unknown objects
  return JSON.stringify(body, null, 2)
}

function formatBody(body: unknown, contentType?: string): string {
  if (!body) return '(empty)'
  const str = bodyToString(body)
  // Try to format JSON nicely
  if (contentType?.includes('json') || str.trim().startsWith('{') || str.trim().startsWith('[')) {
    try {
      return JSON.stringify(JSON.parse(str), null, 2)
    } catch {
      // Not valid JSON, return as-is
    }
  }
  return str
}

function formatSize(bytes: unknown): string {
  if (!bytes) return '0 B'
  let len: number
  if (typeof bytes === 'string') {
    len = new Blob([bytes]).size
  } else if (typeof bytes === 'object' && 'byteLength' in bytes) {
    len = (bytes as Buffer).byteLength
  } else if (typeof bytes === 'object' && 'data' in bytes && Array.isArray((bytes as any).data)) {
    // JSON-serialized Buffer: { type: 'Buffer', data: [number, ...] }
    len = (bytes as any).data.length
  } else if (typeof bytes === 'object') {
    // Fallback: estimate from JSON stringified size
    len = new Blob([JSON.stringify(bytes)]).size
  } else {
    return '0 B'
  }
  if (len < 1024) return `${len} B`
  if (len < 1024 * 1024) return `${(len / 1024).toFixed(1)} KB`
  return `${(len / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(ms?: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString()
}

function parseHeaders(headers: Record<string, string>): { name: string; value: string }[] {
  return Object.entries(headers).map(([name, value]) => ({ name, value }))
}

const tabs = [
  { key: 'request' as const, label: 'Request' },
  { key: 'response' as const, label: 'Response' },
  { key: 'headers' as const, label: 'Headers' },
  { key: 'timing' as const, label: 'Timing' },
]

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <div class="detail-overlay" @click.self="emit('close')" @keydown="handleKeydown">
    <div class="detail-panel" tabindex="-1">
      <div class="detail-header">
        <h2 class="detail-title">
          <template v-if="request">
            <span class="method-badge" :class="'method-' + request.method.toLowerCase()">
              {{ request.method }}
            </span>
            <span class="detail-url" :title="request.url">{{ request.url }}</span>
          </template>
          <template v-else>Request Details</template>
        </h2>
        <button class="btn-close" @click="emit('close')" title="Close (Escape)">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div v-if="loading" class="detail-loading">
        <div class="spinner"></div>
        <span>Loading...</span>
      </div>

      <div v-else-if="error" class="detail-error">
        {{ error }}
      </div>

      <template v-else-if="request">
        <div class="detail-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['detail-tab', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="detail-content">
          <!-- Request Body Tab -->
          <div v-if="activeTab === 'request'" class="tab-content">
            <div class="detail-section">
              <h3>Request Body</h3>
              <pre class="body-content">{{ formatBody(request.body, request.contentType) }}</pre>
            </div>
            <div class="detail-meta">
              <div class="meta-item">
                <span class="meta-label">Size:</span>
                <span class="meta-value">{{ formatSize(request.body) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Content-Type:</span>
                <span class="meta-value">{{ request.contentType || '—' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Protocol:</span>
                <span class="meta-value">{{ request.protocol }}</span>
              </div>
            </div>
          </div>

          <!-- Response Body Tab -->
          <div v-if="activeTab === 'response'" class="tab-content">
            <div v-if="request.response" class="detail-section">
              <h3>
                Response Body
                <span
                  class="status-badge"
                  :class="request.response.statusCode >= 400 ? 'status-4xx' : 'status-2xx'"
                >
                  {{ request.response.statusCode }}
                </span>
              </h3>
              <pre class="body-content">{{
                formatBody(request.response.body, request.response.contentType)
              }}</pre>
            </div>
            <div v-else class="detail-section">
              <p class="no-response">No response received yet.</p>
            </div>
            <div class="detail-meta">
              <div class="meta-item">
                <span class="meta-label">Size:</span>
                <span class="meta-value">{{
                  request.response ? formatSize(request.response.body) : '—'
                }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Content-Type:</span>
                <span class="meta-value">{{ request.response?.contentType || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Headers Tab -->
          <div v-if="activeTab === 'headers'" class="tab-content">
            <div class="detail-section">
              <h3>Request Headers</h3>
              <table class="headers-table">
                <tbody>
                  <tr v-for="h in parseHeaders(request.headers)" :key="h.name">
                    <td class="header-name">{{ h.name }}</td>
                    <td class="header-value">{{ h.value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="request.response" class="detail-section">
              <h3>Response Headers</h3>
              <table class="headers-table">
                <tbody>
                  <tr v-for="h in parseHeaders(request.response.headers)" :key="h.name">
                    <td class="header-name">{{ h.name }}</td>
                    <td class="header-value">{{ h.value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Timing Tab -->
          <div v-if="activeTab === 'timing'" class="tab-content">
            <div class="detail-section">
              <h3>Timing</h3>
              <div class="detail-meta">
                <div class="meta-item">
                  <span class="meta-label">Start Time:</span>
                  <span class="meta-value">{{ formatTimestamp(request.timestamp) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Request Duration:</span>
                  <span class="meta-value">{{ formatDuration(request.requestTime) }}</span>
                </div>
                <div class="meta-item" v-if="request.response?.responseTime">
                  <span class="meta-label">Response Time:</span>
                  <span class="meta-value">{{
                    formatDuration(request.response.responseTime)
                  }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Total Duration:</span>
                  <span class="meta-value">
                    {{
                      request.response?.responseTime
                        ? formatDuration(request.response.responseTime)
                        : formatDuration(request.requestTime)
                    }}
                  </span>
                </div>
              </div>
            </div>
            <div class="detail-section">
              <h3>Sizes</h3>
              <div class="detail-meta">
                <div class="meta-item">
                  <span class="meta-label">Request Size:</span>
                  <span class="meta-value">{{ formatSize(request.body) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Response Size:</span>
                  <span class="meta-value">{{
                    request.response ? formatSize(request.response.body) : '—'
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
