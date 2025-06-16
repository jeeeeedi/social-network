"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Bell,
  Bookmark,
  Camera,
  Heart,
  Home,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Search,
  Send,
  Settings,
  Share,
  User,
  Users,
} from "lucide-react"
import Image from "next/image"
import { ChatInterface } from "../components/chat-interface"
import { GroupChat } from "../components/group-chat"
import { useWebSocket, type ChatUser } from "../hooks/useWebSocket"
import { UsersIcon } from "lucide-react"

export default function SocialNetworkPage() {
  const [newPost, setNewPost] = useState("")
  const [posts, setPosts] = useState([
    {
      id: 1,
      user: { name: "Sarah Johnson", username: "sarahj", avatar: "/placeholder.svg?height=40&width=40" },
      content:
        "Just finished an amazing hike in the mountains! The view was absolutely breathtaking. Nature never fails to inspire me. 🏔️ #hiking #nature #adventure",
      image: "/placeholder.svg?height=300&width=500",
      timestamp: "2 hours ago",
      likes: 24,
      comments: 8,
      shares: 3,
      liked: false,
    },
    {
      id: 2,
      user: { name: "Alex Chen", username: "alexc", avatar: "/placeholder.svg?height=40&width=40" },
      content:
        "Working on a new design project today. The creative process is so fulfilling when everything starts coming together. What's everyone else working on?",
      timestamp: "4 hours ago",
      likes: 15,
      comments: 12,
      shares: 2,
      liked: true,
    },
    {
      id: 3,
      user: { name: "Maria Garcia", username: "mariag", avatar: "/placeholder.svg?height=40&width=40" },
      content:
        "Coffee shop vibes ☕ Perfect place to catch up on some reading. Currently diving into 'The Design of Everyday Things' - highly recommend!",
      image: "/placeholder.svg?height=250&width=400",
      timestamp: "6 hours ago",
      likes: 31,
      comments: 5,
      shares: 7,
      liked: false,
    },
  ])

  const { messages, sendMessage, isConnected } = useWebSocket()
  const [activeChat, setActiveChat] = useState<ChatUser | null>(null)
  const [activeGroupChat, setActiveGroupChat] = useState<any>(null)
  const [isChatMinimized, setIsChatMinimized] = useState(false)
  const [isGroupChatMinimized, setIsGroupChatMinimized] = useState(false)

  // Mock users data
  const [chatUsers] = useState<ChatUser[]>([
    {
      id: "1",
      name: "Emma Wilson",
      username: "emmaw",
      avatar: "/placeholder.svg?height=40&width=40",
      isOnline: true,
      isFollowing: true,
      isFollowedBy: true,
      lastSeen: new Date(),
    },
    {
      id: "2",
      name: "David Kim",
      username: "davidk",
      avatar: "/placeholder.svg?height=40&width=40",
      isOnline: false,
      isFollowing: false,
      isFollowedBy: true,
      lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    },
    {
      id: "3",
      name: "Lisa Brown",
      username: "lisab",
      avatar: "/placeholder.svg?height=40&width=40",
      isOnline: true,
      isFollowing: true,
      isFollowedBy: false,
      lastSeen: new Date(),
    },
    {
      id: "4",
      name: "Michael Chen",
      username: "michaelc",
      avatar: "/placeholder.svg?height=40&width=40",
      isOnline: false,
      isFollowing: true,
      isFollowedBy: true,
      lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
  ])

  // Mock groups data
  const [groups] = useState([
    {
      id: "1",
      name: "Design Team",
      avatar: "/placeholder.svg?height=40&width=40",
      members: chatUsers.slice(0, 3),
      description: "Design discussions and updates",
    },
    {
      id: "2",
      name: "Photography Club",
      avatar: "/placeholder.svg?height=40&width=40",
      members: chatUsers.slice(1, 4),
      description: "Share your best shots!",
    },
  ])

  const handleUserClick = (user: ChatUser) => {
    // Check if user can be messaged (following relationship)
    if (user.isFollowing || user.isFollowedBy) {
      setActiveChat(user)
      setIsChatMinimized(false)
    }
  }

  const handleGroupClick = (group: any) => {
    setActiveGroupChat(group)
    setIsGroupChatMinimized(false)
  }

  const handleLike = (postId: number) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
          : post,
      ),
    )
  }

  const handlePost = () => {
    if (newPost.trim()) {
      const post = {
        id: posts.length + 1,
        user: { name: "You", username: "you", avatar: "/placeholder.svg?height=40&width=40" },
        content: newPost,
        timestamp: "now",
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
      }
      setPosts([post, ...posts])
      setNewPost("")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-primary">SocialHub</h1>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search posts, people, topics..." className="w-80 pl-10" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="@you" />
                    <AvatarFallback>YU</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-4">
        {/* Left Sidebar */}
        <aside className="hidden lg:block">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/placeholder.svg?height=48&width=48" alt="@you" />
                  <AvatarFallback>YU</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">Your Name</h3>
                  <p className="text-sm text-muted-foreground">@yourhandle</p>
                </div>
              </div>

              <nav className="space-y-2">
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Home className="h-5 w-5" />
                  Home
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <User className="h-5 w-5" />
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Users className="h-5 w-5" />
                  Friends
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Bookmark className="h-5 w-5" />
                  Saved
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Settings className="h-5 w-5" />
                  Settings
                </Button>
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-2 space-y-6">
          {/* Create Post */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="@you" />
                  <AvatarFallback>YU</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <Textarea
                    placeholder="What's on your mind?"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-[100px] resize-none border-0 p-0 text-lg placeholder:text-muted-foreground focus-visible:ring-0"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Photo
                      </Button>
                    </div>
                    <Button onClick={handlePost} disabled={!newPost.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Posts Feed */}
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.user.avatar || "/placeholder.svg"} alt={`@${post.user.username}`} />
                        <AvatarFallback>
                          {post.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{post.user.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          @{post.user.username} · {post.timestamp}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Save post</DropdownMenuItem>
                        <DropdownMenuItem>Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed mb-4">{post.content}</p>
                  {post.image && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <Image
                        src={post.image || "/placeholder.svg"}
                        alt="Post image"
                        width={500}
                        height={300}
                        className="w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className={post.liked ? "text-red-500" : ""}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${post.liked ? "fill-current" : ""}`} />
                        {post.likes}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {post.comments}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Repeat2 className="h-4 w-4 mr-2" />
                        {post.shares}
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block space-y-6">
          {/* Chat Users */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Messages
                {isConnected && (
                  <Badge variant="secondary" className="text-xs">
                    Online
                  </Badge>
                )}
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {chatUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    user.isFollowing || user.isFollowedBy ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"
                  }`}
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {user.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.isOnline ? "Online" : `Last seen ${user.lastSeen?.toLocaleTimeString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {(user.isFollowing || user.isFollowedBy) && (
                      <Badge variant="outline" className="text-xs">
                        {user.isFollowing && user.isFollowedBy
                          ? "Friends"
                          : user.isFollowing
                            ? "Following"
                            : "Follower"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Group Chats */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Groups
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleGroupClick(group)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={group.avatar || "/placeholder.svg"} alt={group.name} />
                      <AvatarFallback>
                        {group.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.members.length} members</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {group.members.filter((m) => m.isOnline).length} online
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Your Activity */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Your Activity</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Posts this week</span>
                <Badge variant="secondary">12</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">New followers</span>
                <Badge variant="secondary">+5</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Messages sent</span>
                <Badge variant="secondary">48</Badge>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      {/* Chat Interfaces */}
      {activeChat && (
        <ChatInterface
          user={activeChat}
          messages={messages}
          onSendMessage={sendMessage}
          onClose={() => setActiveChat(null)}
          isMinimized={isChatMinimized}
          onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
        />
      )}

      {activeGroupChat && (
        <GroupChat
          group={activeGroupChat}
          messages={messages}
          onSendMessage={sendMessage}
          onClose={() => setActiveGroupChat(null)}
          isMinimized={isGroupChatMinimized}
          onToggleMinimize={() => setIsGroupChatMinimized(!isGroupChatMinimized)}
        />
      )}
    </div>
  )
}
