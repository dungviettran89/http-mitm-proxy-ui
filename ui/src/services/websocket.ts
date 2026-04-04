import type { RequestRecord, WebSocketMessage } from '../types'
import { getWebSocketUrl } from './api'

type MessageHandler = (msg: WebSocketMessage) => void

export class WebSocketService {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 2000

  connect(): void {
    if (this.ws) return

    try {
      this.ws = new WebSocket(getWebSocketUrl())

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.scheduleReconnect()
      }

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data)
          this.handlers.forEach((handler) => handler(msg))
        } catch {
          console.error('Failed to parse WebSocket message', event.data)
        }
      }

      this.ws.onclose = () => {
        this.ws = null
        this.scheduleReconnect()
      }

      this.ws.onerror = (err: Event) => {
        console.error('WebSocket error', err)
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, this.reconnectDelay)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
}

export const wsService = new WebSocketService()
