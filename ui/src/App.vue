<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRequests } from './composables/useRequests'
import ProxyHeader from './components/ProxyHeader.vue'
import FilterBar from './components/FilterBar.vue'
import RequestList from './components/RequestList.vue'
import RequestDetail from './components/RequestDetail.vue'
import EmptyState from './components/EmptyState.vue'

const {
  loading,
  error,
  total,
  filteredAndSorted,
  selectedId,
  loadRequests,
  selectRequest,
  clearRequests,
  setupWebSocket,
  hasActiveFilters,
  loadSpec,
} = useRequests()

const showDetail = ref(false)
const currentTab = ref<'requests' | 'spec'>('requests')

function handleRowClick(id: string): void {
  selectRequest(id)
  showDetail.value = true
}

function closeDetail(): void {
  showDetail.value = false
  selectRequest(null)
}

function handleClearHistory(): void {
  if (confirm('Are you sure you want to clear all request history?')) {
    clearRequests()
  }
}

onMounted(() => {
  setupWebSocket()
  loadRequests()
  loadSpec()
})

onUnmounted(() => {
  // WebSocket cleanup handled by service
})
</script>

<template>
  <div class="app-container">
    <ProxyHeader :request-count="total" @clear-history="handleClearHistory" />

    <div class="app-tabs">
      <button
        class="tab-btn"
        :class="{ active: currentTab === 'requests' }"
        @click="currentTab = 'requests'"
      >
        Requests
      </button>
      <button
        class="tab-btn"
        :class="{ active: currentTab === 'spec' }"
        @click="currentTab = 'spec'"
      >
        Swagger Spec
      </button>
    </div>

    <div v-if="currentTab === 'requests'" class="main-content">
      <FilterBar />

      <div v-if="error" class="error-banner">
        {{ error }}
        <button class="btn-retry" @click="loadRequests">Retry</button>
      </div>

      <div v-if="loading && total === 0" class="loading-indicator">
        <div class="spinner"></div>
        <span>Loading requests...</span>
      </div>

      <EmptyState
        v-else-if="filteredAndSorted.length === 0 && !loading"
        :has-requests="total > 0"
        :has-active-filters="hasActiveFilters()"
      />

      <RequestList
        v-else
        :requests="filteredAndSorted"
        :selected-id="selectedId"
        :loading="loading"
        @row-click="handleRowClick"
      />
    </div>

    <div v-else class="main-content">
      <div class="empty-state">
        <h3>Swagger Spec View</h3>
        <p>This is where you will map and view your OpenAPI specification.</p>
        <p>Implementation of the mapping interface is next!</p>
      </div>
    </div>

    <Transition name="slide-panel">
      <RequestDetail
        v-if="showDetail && selectedId"
        :request-id="selectedId"
        @close="closeDetail"
      />
    </Transition>
  </div>
</template>
