<script setup lang="ts">
import { ref } from 'vue'
import { useRequests } from '../composables/useRequests'
import type { ExportFormat, ExportScope } from '../types'

const emit = defineEmits<{
  close: []
}>()

const { filteredAndSorted, requests } = useRequests()

const format = ref<ExportFormat>('json')
const scope = ref<ExportScope>('filtered')
const exporting = ref(false)
const progress = ref(0)

function getExportData(): unknown[] {
  switch (scope.value) {
    case 'filtered':
      return filteredAndSorted.value
    case 'all':
      return requests.value
    case 'selected':
      return []
    default:
      return filteredAndSorted.value
  }
}

function bodyToString(body: unknown): string {
  if (!body) return ''
  if (typeof body === 'string') return body
  if (body instanceof Buffer) return body.toString('base64')
  return JSON.stringify(body)
}

function exportAsJSON(data: unknown[]): string {
  return JSON.stringify(data, null, 2)
}

function exportAsCSV(data: unknown[]): string {
  if (data.length === 0) return ''

  const records = data as Array<{
    id: string
    method: string
    url: string
    timestamp: number
    protocol: string
    contentType?: string
    body?: unknown
    response?: {
      statusCode: number
      statusMessage: string
      contentType?: string
      body?: unknown
    }
  }>

  const headers = [
    'ID',
    'Method',
    'URL',
    'Protocol',
    'Status',
    'Status Message',
    'Request Content-Type',
    'Response Content-Type',
    'Request Size',
    'Response Size',
    'Timestamp',
    'Request Body',
    'Response Body',
  ]

  const rows = records.map((r) => [
    r.id,
    r.method,
    r.url,
    r.protocol,
    r.response?.statusCode ?? '',
    r.response?.statusMessage ?? '',
    r.contentType ?? '',
    r.response?.contentType ?? '',
    bodyToString(r.body).length,
    bodyToString(r.response?.body).length,
    new Date(r.timestamp).toISOString(),
    bodyToString(r.body),
    bodyToString(r.response?.body),
  ])

  const escapeCsvField = (field: unknown): string => {
    const str = String(field)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headerRow = headers.map(escapeCsvField).join(',')
  const dataRows = rows.map((row) => row.map(escapeCsvField).join(',')).join('\n')

  return `${headerRow}\n${dataRows}`
}

function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function handleExport(): Promise<void> {
  exporting.value = true
  progress.value = 0

  // Simulate progress for large datasets
  const totalSteps = 10
  for (let i = 0; i <= totalSteps; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    progress.value = (i / totalSteps) * 100
  }

  const data = getExportData()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  if (format.value === 'json') {
    const content = exportAsJSON(data)
    download(content, `proxy-traffic-${timestamp}.json`, 'application/json')
  } else {
    const content = exportAsCSV(data)
    download(content, `proxy-traffic-${timestamp}.csv`, 'text/csv')
  }

  exporting.value = false
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog" role="dialog" aria-labelledby="export-title">
      <div class="modal-header">
        <h3 id="export-title">Export Traffic</h3>
        <button class="btn-close" @click="$emit('close')">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="export-format">Format:</label>
          <select id="export-format" v-model="format">
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </div>

        <div class="form-group">
          <label for="export-scope">Scope:</label>
          <select id="export-scope" v-model="scope">
            <option value="filtered">Filtered requests ({{ filteredAndSorted.length }})</option>
            <option value="all">All requests ({{ requests.length }})</option>
          </select>
        </div>

        <div v-if="exporting" class="export-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <span>Exporting... {{ Math.round(progress) }}%</span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="handleExport" :disabled="exporting">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export
        </button>
      </div>
    </div>
  </div>
</template>
