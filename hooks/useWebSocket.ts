"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface Message {
  id: string | null
  chatId: string
  senderId: string | null
  otherUserName: string
  otherUserAvatar: string | null
  content: string
  timestamp: Date
  messageType: "text" | "emoji"
  chatType: "private" | "group"
}

interface RawMessage {
  id: number; // good
  chatId: string; // good
  senderId: number; // good
  requesterId: number; // good
  groupId?: number; // Missing in backend
  otherUserName: string; // good
  otherUserAvatar?: string | null; // include avatar
  otherUserID: number | null; // good
  content: string; // good
  timestamp: string; // good
  messageType: "text" | "emoji"; // good
  chatType: "private" | "group"; // good
}

export interface ChatUser {
  user_uuid: string
  first_name: string
  last_name: string

  id: string
  name: string
  username: string
  avatar: string
  isFollowing: boolean
  isFollowedBy: boolean
  lastSeen?: Date
}

const serverUrl = "ws://localhost:8080/api/ws"
const RECONNECT_DELAY = 2000

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const ws = useRef<WebSocket | null>(null)
  const retryRef = useRef(RECONNECT_DELAY)

  const connect = useCallback(() => {
    if (!ws.current || ws.current.readyState === WebSocket.CLOSED || ws.current.readyState === WebSocket.CLOSING) {
      ws.current = new WebSocket(serverUrl)
    }

    ws.current.onopen = () => {
      console.log("WS connected")
      setIsConnected(true)
      retryRef.current = RECONNECT_DELAY
    }

    ws.current.onmessage = (ev: MessageEvent) => {
      console.log("Got message!!")
      try {
        const raw = JSON.parse(ev.data) as RawMessage
        console.log("This is the message:")
        console.log(raw)
        console.log("Just checked if message was private or group")
        const msg: Message = {
          id: String(raw.id),
          chatId: raw.chatId,
          senderId: String(raw.senderId),
          otherUserName: raw.otherUserName,
          otherUserAvatar: raw.otherUserAvatar || null,
          content: raw.content,
          timestamp: new Date(raw.timestamp),
          messageType: raw.messageType,
          chatType: raw.chatType,
        }
        console.log("Finally, adding message to messages:", msg)
        setMessages(prev => [...prev, msg])
      } catch (err) {
        console.error("Failed to parse WS message:", err, ev.data)
      }
    }

    ws.current.onerror = (err) => {
      console.error("WS error:", err)
    }

    ws.current.onclose = () => {
      console.log("WS closed")
      setIsConnected(false)
      ws.current = null

      setTimeout(() => {
        // exponential backoff up to 30s
        retryRef.current = Math.min(retryRef.current * 2, 30000)
        connect()
      }, retryRef.current)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        console.log('closing websocket');
        ws.current.close();
      }
    }
  }, [connect])
// figure out how to send the group messages to the backend
  const sendMessage = useCallback(
    (msg: Omit<Message, "id" | "timestamp">) => {
      const outgoing: Message = {
        ...msg,
        id: Date.now().toString(),
        timestamp: new Date(),
      }

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
    sendMessage,
  }
}
