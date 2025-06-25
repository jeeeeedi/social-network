"use client"

import { useEffect, useRef, useState } from "react"

export interface Message {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  timestamp: Date
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

export function useWebSocket() {
  const serverUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/ws"
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {

    // 1) Create the WebSocket
    ws.current = new WebSocket(serverUrl)

    // 2) When connection opens
    ws.current.onopen = () => {
      console.log("WS connected")
      setIsConnected(true)
      // Optionally, you can notify server who you are:
      // ws.current!.send(JSON.stringify({ type: "hello", userId: "…" }))
    }

    // 3) When a message comes in
    ws.current.onmessage = (event) => {
      try {
        const incoming: Message = JSON.parse(event.data)
        setMessages(prev => [...prev, incoming])
      } catch (err) {
        console.error("Failed to parse WS message", err)
      }
    }

    // 4) Handle errors
    ws.current.onerror = (err) => {
      console.error("WS error", err)
      // you might setIsConnected(false) or show UI feedback
    }

    // 5) Handle close
    ws.current.onclose = () => {
      console.log("WS closed")
      setIsConnected(false)
      // optionally: try to reconnect after a delay
    }

    // 6) Cleanup on unmount
    return () => {
      ws.current?.close()
    }
  }, [serverUrl])

  // 7) Sending a message
  const sendMessage = (msg: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...msg,
      id: Date.now().toString(),
      timestamp: new Date(),
    }
    // 7a) Add to local state
    setMessages(prev => [...prev, newMessage])
    // 7b) Send to server
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(newMessage))
    } else {
      console.warn("WS not open; cannot send")
    }
  }

  return {
    isConnected,
    messages,
    onlineUsers,
    sendMessage,
    setOnlineUsers,
  }
}
