<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  spec: any
}>()

const emit = defineEmits<{
  submit: [data: { path: string; method: string }]
  close: []
}>()

const availablePaths = computed(() => {
  if (!props.spec || !props.spec.paths) return []
  return Object.keys(props.spec.paths).sort()
})

const selectedPath = ref(availablePaths.value[0] || '')

const availableMethods = computed(() => {
  if (!props.spec || !props.spec.paths || !selectedPath.value) return []
  const methods = props.spec.paths[selectedPath.value]
  if (!methods) return []
  return Object.keys(methods).map((m) => m.toUpperCase())
})

const selectedMethod = ref(availableMethods.value[0] || '')

watch(selectedPath, () => {
  selectedMethod.value = availableMethods.value[0] || ''
})

function handleSubmit() {
  if (selectedPath.value && selectedMethod.value) {
    emit('submit', { path: selectedPath.value, method: selectedMethod.value })
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog" role="dialog" aria-labelledby="update-title">
      <div class="modal-header">
        <h3 id="update-title">Update Endpoint from Traffic</h3>
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
          <label for="update-path">API Path:</label>
          <select id="update-path" v-model="selectedPath">
            <option v-for="path in availablePaths" :key="path" :value="path">
              {{ path }}
            </option>
          </select>
          <div v-if="availablePaths.length === 0" class="help-text text-muted">
            No mapped paths available in the specification.
          </div>
        </div>

        <div class="form-group">
          <label for="update-method">HTTP Method:</label>
          <select
            id="update-method"
            v-model="selectedMethod"
            :disabled="availableMethods.length === 0"
          >
            <option v-for="method in availableMethods" :key="method" :value="method">
              {{ method }}
            </option>
          </select>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" @click="$emit('close')">Cancel</button>
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="!selectedPath || !selectedMethod"
        >
          Update
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.help-text {
  font-size: 0.85rem;
  margin-top: 4px;
}
.text-muted {
  color: #666;
}
</style>
