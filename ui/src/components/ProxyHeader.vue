<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchConfig, fetchHealth, getCACertUrl } from '../services/api'

defineProps<{
  requestCount: number
}>()

defineEmits<{
  'clear-history': []
}>()

const proxyStatus = ref<'running' | 'stopped' | 'unknown'>('unknown')
const config = ref<{ proxyPort: number; uiPort: number; maxRequests: number } | null>(null)

onMounted(async () => {
  try {
    const [health, cfg] = await Promise.all([
      fetchHealth().catch(() => null),
      fetchConfig().catch(() => null),
    ])
    proxyStatus.value = health ? 'running' : 'stopped'
    config.value = cfg
  } catch {
    proxyStatus.value = 'unknown'
  }
})

const statusClass = computed(() => `status-${proxyStatus.value}`)

function downloadCACert(): void {
  const a = document.createElement('a')
  a.href = getCACertUrl()
  a.download = 'http-mitm-proxy-ui-ca.pem'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>

<template>
  <header class="proxy-header">
    <div class="header-left">
      <h1 class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path>
        </svg>
        MITM Proxy UI
      </h1>
    </div>

    <div class="header-center">
      <div class="status-badge" :class="statusClass">
        <span class="status-dot"></span>
        Proxy: <strong>{{ proxyStatus }}</strong>
        <template v-if="config">
          &middot; Port {{ config.proxyPort }}
        </template>
      </div>
      <div class="request-counter">
        Requests: <strong>{{ requestCount }}</strong>
      </div>
    </div>

    <div class="header-right">
      <button class="btn btn-outline" @click="downloadCACert" title="Download CA Certificate">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        CA Cert
      </button>
      <button class="btn btn-danger" @click="$emit('clear-history')" title="Clear History (Ctrl+K)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        Clear
      </button>
    </div>
  </header>
</template>
