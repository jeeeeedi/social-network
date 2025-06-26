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
import { X, Send, Smile, Users } from "lucide-react"
import type { Message, ChatUser } from "@/hooks/useWebSocket"

interface GroupChatProps {
  group: {
    group_id: number
    member_count: number
    title: string
    avatar: string
    members: ChatUser[]
    description?: string
  }
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
]

export function GroupChat({ group, messages, onSendMessage, onClose }: GroupChatProps) {
  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [history, setHistory] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const chatSpec = `group_${group.group_id}`
  const groupMessages = [
    ...history,
    ...messages.filter(
      msg => msg.chatId === chatSpec && !history.some(hist => hist.id === msg.id)
    ),
  ]

  // Safety checks
  if (!group) {
    return null
  }
  // const groupMessages = messages?.filter((msg) => msg.chatId === `group_${group.group_id}`) || []
  console.log('groupMessages:', groupMessages)
  const members = group.members || []
  const groupName = group.title || "Unknown Group"

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const setFocus = () => {
    inputRef.current?.focus()
  }

  const fetchMessages = async () => {
  try {
    const res = await fetch(`http://localhost:8080/api/messages/${chatSpec}`, {
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
    fetchMessages()
  }, [group.group_id])

  useEffect(() => {
    scrollToBottom()
    setFocus()
  }, [groupMessages])


  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage({
        senderId: "you",
        otherUserName: group.title,
        otherUserAvatar: group.avatar,
        content: newMessage,
        messageType: "text",
        chatId: `group_${group.group_id}`,
        chatType: "group",
      })
      setNewMessage("")
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    onSendMessage({
      senderId: "you",
      otherUserName: group.title,
      otherUserAvatar: group.avatar,
      content: emoji,
      messageType: "emoji",
      chatId: `group_${group.group_id}`,
      chatType: "group",
    })
    setShowEmojiPicker(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  console.log('group messages:', groupMessages)
  // groupMessages=history
  return (
    <Card className="fixed bottom-4 right-96 w-80 h-96 shadow-lg z-50 flex flex-col">
      {/* Group Chat Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={group.avatar || "/placeholder.svg"} alt={group.title} className="object-cover"/>
            <AvatarFallback>
              {group.title
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="text-sm font-semibold">{group.title}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group.member_count} members
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
              <div className="space-y-4 py-4">
                {groupMessages.map((message) => (
                  <div key={message.id} className="flex gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={message.otherUserAvatar || "/placeholder.svg"} alt={message.otherUserName} className="object-cover"/>
                      <AvatarFallback className="text-xs">
                        {message.otherUserName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{message.otherUserName}</span>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                        {message.messageType === "emoji" ? (
                          <span className="text-2xl">{message.content}</span>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
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
