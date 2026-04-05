<script setup lang="ts">
defineProps<{
  hasRequests: boolean
  hasActiveFilters: boolean
}>()
</script>

<template>
  <div class="empty-state">
    <svg
      class="empty-icon"
      viewBox="0 0 24 24"
      width="64"
      height="64"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8M12 8v8" />
    </svg>

    <template v-if="!hasRequests">
      <h3>No requests captured yet</h3>
      <p>
        Configure your application to use the proxy at
        <code>localhost:8080</code> and start making HTTP requests. They will appear here in
        real-time.
      </p>
      <div class="empty-steps">
        <div class="step">
          <span class="step-number">1</span>
          <span>Set proxy to <code>localhost:8080</code></span>
        </div>
        <div class="step">
          <span class="step-number">2</span>
          <span>Install CA cert for HTTPS interception</span>
        </div>
        <div class="step">
          <span class="step-number">3</span>
          <span>Make requests — they'll show up here</span>
        </div>
      </div>
    </template>

    <template v-else-if="hasActiveFilters">
      <h3>No matching requests</h3>
      <p>Try adjusting your filters or search query.</p>
    </template>

    <template v-else>
      <h3>No requests to display</h3>
    </template>
  </div>
</template>
