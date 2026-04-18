<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-bundle.js'
import 'swagger-ui-dist/swagger-ui.css'
import { useRequests } from '../composables/useRequests'

const props = defineProps<{
  spec: any
}>()

const { updateEndpoint, resetSpec } = useRequests()
const swaggerContainer = ref<HTMLElement | null>(null)
let ui: any = null

function initSwagger() {
  if (!swaggerContainer.value) return

  ui = SwaggerUIBundle({
    spec: props.spec,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
  })
}

watch(
  () => props.spec,
  (newSpec) => {
    if (ui) {
      ui.specActions.updateSpec(JSON.stringify(newSpec))
    }
  },
  { deep: true }
)

onMounted(() => {
  initSwagger()
})

async function handleUpdateFromTraffic() {
  const apiPath = prompt('Enter the API path to update (e.g. /api/users/{id})')
  const method = prompt('Enter the HTTP method (e.g. GET)')
  
  if (apiPath && method) {
    await updateEndpoint(apiPath, method)
  }
}

async function handleResetSpec() {
  if (confirm('Are you sure you want to reset the OpenAPI specification? You will need to re-map the paths.')) {
    await resetSpec()
  }
}
</script>

<template>
  <div class="swagger-ui-wrapper">
    <div class="swagger-ui-toolbar">
       <button class="btn btn-outline btn-sm" @click="handleResetSpec" style="margin-right: 8px;">
         Reset Spec
       </button>
       <button class="btn btn-primary btn-sm" @click="handleUpdateFromTraffic">
         Update from Traffic
       </button>
    </div>
    <div id="swagger-ui" ref="swaggerContainer"></div>
  </div>
</template>

<style>
.swagger-ui-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.swagger-ui-toolbar {
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 10;
}

#swagger-ui {
  flex: 1;
  overflow: auto;
}

/* Fix for Swagger UI themes and our app */
.swagger-ui .topbar {
  display: none;
}
</style>
