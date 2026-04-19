import type { RequestRecord, ProxyConfig, ApiResponse, OpenApiSpec, PathMapping } from '../types'

const BASE_URL = ''

export async function fetchRequests(
  params: Record<string, string> = {}
): Promise<ApiResponse<RequestRecord[]>> {
  const query = new URLSearchParams(params)
  const res = await fetch(`${BASE_URL}/api/requests?${query}`)
  if (!res.ok) throw new Error(`Failed to fetch requests: ${res.statusText}`)
  return res.json()
}

export async function fetchRequest(id: string): Promise<RequestRecord> {
  const res = await fetch(`${BASE_URL}/api/requests/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch request: ${res.statusText}`)
  return res.json()
}

export async function clearRequests(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/requests`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to clear requests: ${res.statusText}`)
}

export async function fetchConfig(): Promise<ProxyConfig> {
  const res = await fetch(`${BASE_URL}/api/config`)
  if (!res.ok) throw new Error(`Failed to fetch config: ${res.statusText}`)
  return res.json()
}

export async function fetchHealth(): Promise<{ status: string; uptime: number }> {
  const res = await fetch(`${BASE_URL}/api/health`)
  if (!res.ok) throw new Error(`Failed to fetch health: ${res.statusText}`)
  return res.json()
}

export function getCACertUrl(): string {
  return `${BASE_URL}/api/ca-cert`
}

export function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export async function fetchSpec(): Promise<OpenApiSpec> {
  const res = await fetch(`${BASE_URL}/api/spec`)
  if (!res.ok) throw new Error(`Failed to fetch spec: ${res.statusText}`)
  return res.json()
}

export async function generateSpec(mappings: PathMapping[]): Promise<OpenApiSpec> {
  const res = await fetch(`${BASE_URL}/api/spec/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mappings }),
  })
  if (!res.ok) throw new Error(`Failed to generate spec: ${res.statusText}`)
  return res.json()
}

export async function resetSpec(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/spec`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to reset spec: ${res.statusText}`)
}

export async function updateEndpoint(apiPath: string, method: string): Promise<OpenApiSpec> {
  const res = await fetch(`${BASE_URL}/api/spec/update-endpoint`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: apiPath, method }),
  })
  if (!res.ok) throw new Error(`Failed to update endpoint: ${res.statusText}`)
  return res.json()
}
