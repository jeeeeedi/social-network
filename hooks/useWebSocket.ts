"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface Message {
  id: string | null
  senderId: string  | null
  senderName: string
  senderAvatar: string | null
  content: string
  timestamp: Date
  type: "text" | "emoji"
  chatId: string
  chatType: "private" | "group"
}

interface RawMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  timestamp: string       // <-- raw JSON is a string
  type: "text" | "emoji"
  chatId: string
  chatType: "private" | "group"
}

export interface ChatUser {
  id: string
  name: string
  username: string
  avatar: string
  isOnline: boolean
  isFollowing: boolean
  isFollowedBy: boolean
  lastSeen?: Date
}

const serverUrl = "ws://localhost:8080/api/ws"
const RECONNECT_DELAY = 2000

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const ws = useRef<WebSocket | null>(null)
  const retryRef = useRef(RECONNECT_DELAY)

  const connect = useCallback(() => {
    ws.current = new WebSocket(serverUrl)

    ws.current.onopen = () => {
      console.log("WS connected")
      setIsConnected(true)
      retryRef.current = RECONNECT_DELAY
    }

    ws.current.onmessage = (ev: MessageEvent) => {
      try {
        const raw = JSON.parse(ev.data) as RawMessage
        const msg: Message = {
          id: raw.id?raw.id:null,
          senderId: raw.senderId,
          senderName: raw.senderName?raw.senderName:"You",
          senderAvatar: raw.senderAvatar?raw.senderAvatar:null,
          content: raw.content,
          timestamp: new Date(raw.timestamp),
          type: raw.type,
          chatId: raw.chatId,
          chatType: raw.chatType,
        }
        console.log(msg)
        setMessages(prev => [...prev, msg])
      } catch (err) {
        console.error("Failed to parse WS message:", err, ev.data)
      }
    }

    ws.current.onerror = (ev: Event) => {
      console.error("WS error:", ev)
    }

    ws.current.onclose = (ev: CloseEvent) => {
      console.warn(
        `WS closed (code=${ev.code} reason="${ev.reason}"). Reconnecting in ${retryRef.current}ms…`
      )
      setIsConnected(false)
      ws.current = null

      setTimeout(() => {
        // exponential backoff up to, say, 30s
        retryRef.current = Math.min(retryRef.current * 2, 30000)
        connect()
      }, retryRef.current)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      ws.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback(
    (msg: Omit<Message, "id" | "timestamp">) => {
      const outgoing: Message = {
        ...msg,
        id: Date.now().toString(),
        timestamp: new Date(),
      }
      /* setMessages((prev) => [...prev, outgoing]) */

      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(outgoing))
      } else {
        console.warn("WS not open; cannot send")
      }
    },
    []
  )

  return {
    isConnected,
    messages,
    onlineUsers,
    sendMessage,
    setOnlineUsers,
  }
}
