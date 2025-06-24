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
  user_uuid: string
  first_name: string
  last_name: string

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
  const serverUrl = "ws://localhost:8080/api/ws"
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    ws.current = new WebSocket(serverUrl)

    ws.current.onopen = () => {
      console.log("WS connected")
      setIsConnected(true)
    }

    ws.current.onmessage = (event) => {
      try {
        const incoming: Message = JSON.parse(event.data)
        setMessages(prev => [...prev, incoming])
      } catch (err) {
        console.error("Failed to parse WS message", err)
      }
    }

    ws.current.onerror = (err) => {
      console.error("WS error", err)
    }

    ws.current.onclose = () => {
      console.log("WS closed")
      setIsConnected(false)
      // optionally: try to reconnect after a delay
    }

    // 6) Cleanup on unmount
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          console.log('closing websocket');
        ws.current.close();
      }
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
