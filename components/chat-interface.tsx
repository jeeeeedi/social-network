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
  user: {
    user_uuid: string;
    id: string;
    first_name: string;
    last_name: string;
    avatar: string;
  }
  messages: Message[]
  onSendMessage: (message: Omit<Message, "id" | "timestamp">) => void
  onClose: () => void
  open: boolean // <-- Add this line
}

const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐"]

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function ChatInterface({
  user,
  messages: liveMessages,
  onSendMessage,
  onClose,
  open, // <-- Add this line
}: ChatInterfaceProps) {
    console.log('chat messages:', liveMessages)
  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [history, setHistory] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const chatSpec = `private_${user.user_uuid}`
  const chatMessages = [
    ...history,
    ...liveMessages.filter(
      msg => msg.chatId === chatSpec && !history.some(hist => hist.id === msg.id)
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
      const res = await fetch(`${API_URL}/api/messages/${chatSpec}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      type Raw = {
        id: number
        requesterId: number
        senderId: number
        otherUserName: string
        otherUserAvatar: string | null
        receiverId?: number
        groupId?: number
        content: string
        timestamp: string
        messageType: "text" | "emoji"
        chatType: "private" | "group"
      }
      console.log("Fetching chat messages...")
      const raw: Raw[] = await res.json()

      const mapped: Message[] = raw.map((msg) => {
        console.log(
`          id: ${String(msg.id)},
          chatId: ${chatSpec},
          senderId: ${String(msg.senderId)},
          otherUserName: ${msg.otherUserName},
          otherUserAvatar: ${msg.otherUserAvatar},
          content: ${msg.content},
          timestamp: ${new Date(msg.timestamp)},
          messageType: ${msg.messageType},
          chatType: ${msg.chatType},`
      )
        return {
          id: String(msg.id),
          chatId: chatSpec,
          senderId: String(msg.senderId),
          otherUserName: msg.otherUserName,
          otherUserAvatar: msg.otherUserAvatar,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          messageType: msg.messageType,
          chatType: msg.chatType,
        }
      })

      setHistory(mapped)
    } catch (err) {
      console.error("fetchMessages:", err)
    }
  }
  
  useEffect(() => {
    console.log("Adding message:", chatMessages[chatMessages.length - 1])
    scrollToBottom()
    setFocus()
  }, [chatMessages])

  useEffect(() => {
    if (open) {
      fetchMessages()
    }
  }, [open, user.user_uuid])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage({
        senderId: "You",
        otherUserName: user.first_name,
        otherUserAvatar: user.avatar,
        content: newMessage,
        messageType: "text",
        chatId: `private_${user.user_uuid}`,
        chatType: "private",
      })
      setNewMessage("")
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    onSendMessage({
      senderId: "You",
      otherUserName: user.first_name,
      otherUserAvatar: user.avatar,
      content: emoji,
      messageType: "emoji",
      chatId: `private_${user.user_uuid}`,
      chatType: "private",
    })
    setShowEmojiPicker(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
          {/* <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback>
              {user.first_name
              .concat(' '+user.last_name)
                // .split(" ")
                // .map((n) => n[0])
                // .join("")
                }
            </AvatarFallback>
          </Avatar> */}
          <div>
            <h4 className="text-sm font-semibold"><pre>{user.first_name} {user.last_name}</pre></h4>
            <p className="text-xs text-muted-foreground">
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
      <CardContent className="flex flex-col flex-1 p-0 min-h-0">
        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-4 py-4"> {/* Scrollarea */}
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.otherUserName === user.first_name ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${message.otherUserName === user.first_name ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                >
                  {message.messageType === "emoji" ? (
                    <span className="text-2xl">{message.content}</span>
                  ) : (
                    <p className="break-all whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p
                    className={`text-xs mt-1 ${message.otherUserName === user.first_name ? "text-primary-foreground/70" : "text-muted-foreground"
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
        </div>
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
            onKeyDown={handleKeyDown}
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
