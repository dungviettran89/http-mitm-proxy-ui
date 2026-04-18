<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRequests } from '../composables/useRequests'
import type { RequestRecord, PathMapping } from '../types'

const { requests, generateSpec, isGenerating } = useRequests()

interface PathSegment {
  value: string
  isParam: boolean
  paramName: string
}

interface PathEntry {
  method: string
  segments: PathSegment[]
  originalPath: string
}

const pathEntries = ref<PathEntry[]>([])

// Initialize path entries from requests
function initializeFromRequests() {
  const uniquePaths = new Map<string, { method: string; path: string }>()
  requests.value.forEach((r) => {
    try {
      const url = new URL(r.url.startsWith('http') ? r.url : `http://dummy${r.url}`)
      const key = `${r.method}:${url.pathname}`
      if (!uniquePaths.has(key)) {
        uniquePaths.set(key, { method: r.method, path: url.pathname })
      }
    } catch {
      // Ignore invalid URLs
    }
  })

  pathEntries.value = Array.from(uniquePaths.values()).map((entry) => {
    const segments = entry.path
      .split('/')
      .filter((s) => s !== '')
      .map((s, idx) => ({ 
        value: s, 
        isParam: false,
        paramName: `param${idx + 1}`
      }))
    return {
      method: entry.method,
      segments,
      originalPath: entry.path,
    }
  })
}

// Group entries by parameterized pattern
const groupedEntries = computed(() => {
  const groups = new Map<string, { pattern: string; methods: Set<string> }>()

  pathEntries.value.forEach((entry) => {
    const pattern = '/' + entry.segments
      .map((s) => (s.isParam ? `{${s.paramName || 'param'}}` : s.value))
      .join('/')
    
    if (!groups.has(pattern)) {
      groups.set(pattern, { pattern, methods: new Set() })
    }
    groups.get(pattern)!.methods.add(entry.method)
  })

  return Array.from(groups.values()).map((g) => ({
    pattern: g.pattern,
    methods: Array.from(g.methods),
  }))
})

function toggleParam(entryIdx: number, segmentIdx: number) {
  const segment = pathEntries.value[entryIdx].segments[segmentIdx]
  segment.isParam = !segment.isParam
}

async function handleGenerate() {
  const mappings: PathMapping[] = groupedEntries.value.map((g) => ({
    pattern: g.pattern,
    methods: g.methods,
  }))
  await generateSpec(mappings)
}

initializeFromRequests()
</script>

<template>
  <div class="path-mapper">
    <div class="mapper-header">
      <div>
        <h3>Map API Paths</h3>
        <p class="meta-label">Click path segments to toggle parameters (e.g. {id})</p>
      </div>
      <button
        class="btn btn-primary"
        :disabled="isGenerating || pathEntries.length === 0"
        @click="handleGenerate"
      >
        <span v-if="isGenerating">Generating...</span>
        <span v-else>Build OpenAPI Spec</span>
      </button>
    </div>

    <div class="mapper-list">
      <div v-if="pathEntries.length === 0" class="empty-state">
        <p>No requests captured yet. Capture some traffic to start mapping.</p>
      </div>

      <div v-for="(entry, eIdx) in pathEntries" :key="eIdx" class="path-row">
        <div class="path-row-header">
          <span class="method-badge" :class="`method-${entry.method.toLowerCase()}`">
            {{ entry.method }}
          </span>
          <div class="path-segments">
            <span class="path-separator">/</span>
            <template v-for="(segment, sIdx) in entry.segments" :key="sIdx">
              <div class="segment-container">
                <span
                  class="segment"
                  :class="{ 'is-param': segment.isParam }"
                  @click="toggleParam(eIdx, sIdx)"
                >
                  {{ segment.isParam ? `{${segment.paramName}}` : segment.value }}
                </span>
                <input
                  v-if="segment.isParam"
                  v-model="segment.paramName"
                  class="param-name-input"
                  placeholder="name"
                  @click.stop
                />
              </div>
              <span v-if="sIdx < entry.segments.length - 1" class="path-separator">/</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.segment-container {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.param-name-input {
  width: 60px;
  font-size: 10px;
  padding: 2px;
  border: 1px solid var(--color-gray-lighter);
  border-radius: 2px;
  text-align: center;
}
</style>
