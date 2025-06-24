"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X, Send, Smile } from "lucide-react"
import type { Message, ChatUser } from "@/hooks/useWebSocket"

interface ChatInterfaceProps {
  user: ChatUser
  messages: Message[]
  onSendMessage: (message: Omit<Message, "id" | "timestamp">) => void
  onClose: () => void
}

const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😝",
  "😜",
  "🤪",
  "🤨",
  "🧐",
  "🤓",
  "😎",
  "🤩",
  "🥳",
  "😏",
  "😒",
  "😞",
  "😔",
  "😟",
  "😕",
  "🙁",
  "☹️",
  "😣",
  "😖",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "🤬",
  "🤯",
  "😳",
  "🥵",
  "🥶",
  "😱",
  "😨",
  "😰",
  "😥",
  "😓",
  "🤗",
  "🤔",
  "🤭",
  "🤫",
  "🤥",
  "😶",
  "😐",
  "😑",
  "😬",
  "🙄",
  "😯",
  "😦",
  "😧",
  "😮",
  "😲",
  "🥱",
  "😴",
  "🤤",
  "😪",
  "😵",
  "🤐",
  "🥴",
  "🤢",
  "🤮",
  "🤧",
  "😷",
  "🤒",
  "🤕",
  "🤑",
  "🤠",
  "😈",
  "👍",
  "👎",
  "👌",
  "✌️",
  "🤞",
  "🤟",
  "🤘",
  "🤙",
  "👈",
  "👉",
  "👆",
  "🖕",
  "👇",
  "☝️",
  "👋",
  "🤚",
  "🖐️",
  "✋",
  "🖖",
  "👏",
  "🙌",
  "🤲",
  "🤝",
  "🙏",
  "✍️",
  "💅",
  "🤳",
  "💪",
  "🦾",
  "🦿",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "🤎",
  "💔",
  "❣️",
  "💕",
  "💞",
  "💓",
  "💗",
  "💖",
  "💘",
  "💝",
  "��",
  "☮️",
  "✝️",
  "☪️",
  "🕉️",
  "☸️",
  "✡️",
  "🔯",
  "🕎",
  "☯️",
  "☦️",
  "🛐",
]

export function ChatInterface({
  user,
  messages: liveMessages,
  onSendMessage,
  onClose,
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [history, setHistory] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const chatSpec = `private_${user.id}`
  const chatMessages = [
    ...history,
    ...liveMessages.filter(
      (m) =>
        m.chatId === chatSpec &&
        !history.some((h) => h.id === m.id)
    ),
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const setFocus = () => {
    inputRef.current?.focus()
  }

  const fetchMessages = async () => {
    try {
      console.log("About to send request to", `http://localhost:8080/api/messages/${chatSpec}`)
      const res = await fetch(`http://localhost:8080/api/messages/${chatSpec}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      type Raw = {
        requesterId: number
        chatId: number
        senderId: number
        receiverId?: number
        groupId?: number
        content: string
        timestamp: string
      }
      const raw: Raw[] = await res.json()

      const mapped: Message[] = raw.map((m) => {
        const isYou = m.senderId === m.requesterId
        return {
          id: `${m.senderId}_${m.timestamp}`,      // simple unique key
          senderId: isYou ? "You" : String(m.senderId),
          senderName: isYou ? "You" : /* lookup name by m.senderId */ String(m.senderId),
          senderAvatar: isYou
            ? "/placeholder.svg?height=40&width=40"
            : /* lookup avatar by m.senderId */ "/placeholder.svg",
          content: m.content,
          type: "text",                            // unless you encode emojis server-side
          chatId: chatSpec,
          chatType: "private",
          timestamp: new Date(m.timestamp),
        }
      })

      setHistory(mapped)
    } catch (err) {
      console.error("fetchMessages:", err)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [user.id])

  useEffect(() => {
    scrollToBottom()
    setFocus()
  }, [chatMessages])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage({
        senderId: "You",
        senderName: "You",
        senderAvatar: "/placeholder.svg?height=40&width=40", // Change
        content: newMessage,
        type: "text",
        chatId: `private_${user.id}`,
        chatType: "private",
      })
      setNewMessage("")
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    onSendMessage({
      senderId: "You",
      senderName: "You",
      senderAvatar: "/placeholder.svg?height=40&width=40", // Change
      content: emoji,
      type: "emoji",
      chatId: `private_${user.id}`,
      chatType: "private",
    })
    setShowEmojiPicker(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 h-96 shadow-lg z-50 flex flex-col">
      {/* Chat Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback>
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="text-sm font-semibold">{user.name}</h4>
            <p className="text-xs text-muted-foreground">
              {user.isOnline ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Online
                </span>
              ) : (
                `Last seen ${user.lastSeen ? user.lastSeen.toLocaleTimeString() : "recently"}`
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4">
          <div className="space-y-4 py-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.senderId === "You" ? "justify-end" : "justify-start"}`}
              >
                {message.senderId !== "You" && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={message.senderAvatar || "/placeholder.svg"} alt={message.senderName} />
                    <AvatarFallback className="text-xs">
                      {message.senderName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${message.senderId === "You" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                >
                  {message.type === "emoji" ? (
                    <span className="text-2xl">{message.content}</span>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  <p
                    className={`text-xs mt-1 ${message.senderId === "You" ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <Separator />

      {/* Message Input */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {EMOJIS.map((emoji, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-lg hover:bg-muted"
                    onClick={() => handleEmojiSelect(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
