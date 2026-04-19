<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-bundle.js'
import 'swagger-ui-dist/swagger-ui.css'
import { useRequests } from '../composables/useRequests'
import UpdateEndpointDialog from './UpdateEndpointDialog.vue'

const props = defineProps<{
  spec: any
}>()

const { updateEndpoint, resetSpec } = useRequests()
const swaggerContainer = ref<HTMLElement | null>(null)
const isUpdateDialogOpen = ref(false)
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

function handleUpdateFromTraffic() {
  isUpdateDialogOpen.value = true
}

async function handleUpdateSubmit(data: { path: string; method: string }) {
  isUpdateDialogOpen.value = false
  await updateEndpoint(data.path, data.method)
}

async function handleResetSpec() {
  if (
    confirm(
      'Are you sure you want to reset the OpenAPI specification? You will need to re-map the paths.'
    )
  ) {
    await resetSpec()
  }
}
</script>

<template>
  <div class="swagger-ui-wrapper">
    <div class="swagger-ui-toolbar">
      <button class="btn btn-outline btn-sm" @click="handleResetSpec" style="margin-right: 8px">
        Reset Spec
      </button>
      <button class="btn btn-primary btn-sm" @click="handleUpdateFromTraffic">
        Update from Traffic
      </button>
    </div>
    <div id="swagger-ui" ref="swaggerContainer"></div>
    <UpdateEndpointDialog
      v-if="isUpdateDialogOpen"
      :spec="spec"
      @close="isUpdateDialogOpen = false"
      @submit="handleUpdateSubmit"
    />
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
