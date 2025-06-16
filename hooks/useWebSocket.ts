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
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    // In a real app, this would connect to your WebSocket server
    // For demo purposes, we'll simulate the connection
    const connectWebSocket = () => {
      try {
        // Simulated WebSocket connection
        setIsConnected(true)

        // Simulate receiving messages
        const simulateMessage = () => {
          const randomUsers = [
            { id: "1", name: "Emma Wilson", username: "emmaw", avatar: "/placeholder.svg?height=40&width=40" },
            { id: "2", name: "David Kim", username: "davidk", avatar: "/placeholder.svg?height=40&width=40" },
            { id: "3", name: "Lisa Brown", username: "lisab", avatar: "/placeholder.svg?height=40&width=40" },
          ]

          const randomUser = randomUsers[Math.floor(Math.random() * randomUsers.length)]
          const newMessage: Message = {
            id: Date.now().toString(),
            senderId: randomUser.id,
            senderName: randomUser.name,
            senderAvatar: randomUser.avatar,
            content: "Hey! How are you doing?",
            timestamp: new Date(),
            type: "text",
            chatId: `private_${randomUser.id}`,
            chatType: "private",
          }

          setMessages((prev) => [...prev, newMessage])
        }

        // Simulate random messages every 30 seconds
        const interval = setInterval(simulateMessage, 30000)

        return () => clearInterval(interval)
      } catch (error) {
        console.error("WebSocket connection failed:", error)
        setIsConnected(false)
      }
    }

    connectWebSocket()

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [])

  const sendMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])

    // In a real app, send to WebSocket server
    // ws.current?.send(JSON.stringify(newMessage))
  }

  return {
    isConnected,
    messages,
    onlineUsers,
    sendMessage,
    setOnlineUsers,
  }
}
