<script setup lang="ts">
import { useRequests } from '../composables/useRequests'
import PathMapper from './PathMapper.vue'
import SwaggerUI from './SwaggerUI.vue'

const { spec } = useRequests()
</script>

<template>
  <div class="swagger-view">
    <div v-if="!spec" class="full-height">
      <PathMapper />
    </div>
    <div v-else class="swagger-ui-container">
      <SwaggerUI :spec="spec" />
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
