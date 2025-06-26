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
  const connectingRef = useRef(false)

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (connectingRef.current || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
      console.log("Connection already exists or in progress")
      return
    }
    
    connectingRef.current = true
    ws.current = new WebSocket(serverUrl)

    ws.current.onopen = () => {
      console.log("WS connected")
      setIsConnected(true)
      connectingRef.current = false
      retryRef.current = RECONNECT_DELAY
    }

    ws.current.onmessage = (ev: MessageEvent) => {
      console.log("Got WebSocket message!!")
      try {
        const raw = JSON.parse(ev.data) as RawMessage
        console.log("Raw message from backend:", raw)
        
        const msg: Message = {
          id: String(raw.id),
          chatId: raw.chatId,
          senderId: String(raw.senderId),
          otherUserName: raw.otherUserName,
          otherUserAvatar: null,
          content: raw.content,
          timestamp: new Date(raw.timestamp),
          messageType: raw.messageType,
          chatType: raw.chatType,
        }
        console.log("Processed message for frontend:", msg)
        console.log("Adding message to messages state")
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(existingMsg => 
            existingMsg.id === msg.id && existingMsg.chatId === msg.chatId
          )
          
          if (messageExists) {
            console.log("Message already exists, skipping duplicate:", msg.id)
            return prev
          }
          
          const newMessages = [...prev, msg]
          console.log("Updated messages array:", newMessages)
          return newMessages
        })
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
      connectingRef.current = false
      ws.current = null

      /* setTimeout(() => {
        // exponential backoff up to 30s
        retryRef.current = Math.min(retryRef.current * 2, 30000)
        connect()
      }, retryRef.current) */
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
      // Transform the message to match backend expectations
      const outgoing = {
        chatId: msg.chatId,
        senderId: msg.senderId === "You" ? null : msg.senderId, // Backend will get real senderId from session
        content: msg.content,
        timestamp: new Date(),
        messageType: msg.messageType,
        chatType: msg.chatType,
      }

      console.log("Sending message via WebSocket:", outgoing)

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
