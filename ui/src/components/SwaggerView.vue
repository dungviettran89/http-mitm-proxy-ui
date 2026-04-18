<script setup lang="ts">
import { useRequests } from '../composables/useRequests'
import PathMapper from './PathMapper.vue'

const { spec } = useRequests()
</script>

<template>
  <div class="swagger-view">
    <div v-if="!spec" class="full-height">
      <PathMapper />
    </div>
    <div v-else class="swagger-ui-container">
      <div class="mapper-header">
        <h3>OpenAPI Specification</h3>
        <div class="header-actions">
           <button class="btn btn-outline" @click="$emit('reset-spec')">Reset Spec</button>
        </div>
      </div>
      <div class="empty-state">
        <p>Swagger UI implementation is next!</p>
        <pre class="body-content">{{ JSON.stringify(spec, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.swagger-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.full-height {
  height: 100%;
}
.swagger-ui-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
