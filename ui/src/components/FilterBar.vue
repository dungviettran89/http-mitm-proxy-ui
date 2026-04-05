<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRequests } from '../composables/useRequests'
import ExportDialog from './ExportDialog.vue'

const { filters, setFilters, clearFilters, hasActiveFilters } = useRequests()

const searchInput = ref<HTMLInputElement | null>(null)
const showExport = ref(false)

const methodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

function handleSearch(event: Event): void {
  const target = event.target as HTMLInputElement
  setFilters({ search: target.value })
}

function handleMethodChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  setFilters({ method: target.value })
}

function handleStatusChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  setFilters({ status: target.value })
}

function handleDomainChange(event: Event): void {
  const target = event.target as HTMLInputElement
  setFilters({ domain: target.value })
}

function openExport(): void {
  showExport.value = true
}

function closeExport(): void {
  showExport.value = false
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
    event.preventDefault()
    searchInput.value?.focus()
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    clearFilters()
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
    event.preventDefault()
    openExport()
  }
  if (event.key === 'Escape') {
    closeExport()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="filter-bar">
    <div class="filter-group">
      <label for="method-filter">Method:</label>
      <select id="method-filter" @change="handleMethodChange" :value="filters.method">
        <option value="">All</option>
        <option v-for="m in methodOptions" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="status-filter">Status:</label>
      <select id="status-filter" @change="handleStatusChange" :value="filters.status">
        <option value="">All</option>
        <option value="2xx">2xx</option>
        <option value="3xx">3xx</option>
        <option value="4xx">4xx</option>
        <option value="5xx">5xx</option>
      </select>
    </div>

    <div class="filter-group filter-domain">
      <label for="domain-filter">Domain:</label>
      <input
        id="domain-filter"
        type="text"
        placeholder="Filter by domain..."
        :value="filters.domain"
        @input="handleDomainChange"
      />
    </div>

    <div class="filter-group filter-search">
      <label for="search-input">Search:</label>
      <div class="search-wrapper">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          id="search-input"
          ref="searchInput"
          type="text"
          placeholder="Search URL, method, body... (Ctrl+L)"
          :value="filters.search"
          @input="handleSearch"
        />
      </div>
    </div>

    <div class="filter-actions">
      <button
        v-if="hasActiveFilters()"
        class="btn btn-sm btn-outline"
        @click="clearFilters"
        title="Clear filters (Ctrl+K)"
      >
        Clear
      </button>
      <button class="btn btn-sm btn-outline" @click="openExport" title="Export (Ctrl+E)">
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Export
      </button>
    </div>

    <ExportDialog v-if="showExport" @close="closeExport" />
  </div>
</template>
