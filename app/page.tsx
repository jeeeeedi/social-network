"use client"

import { useState, useEffect } from "react"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Bookmark,
  Camera,
  Heart,
  Home,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Send,
  Settings,
  Share,
  User,
  Users,
  X,
} from "lucide-react"
import { ChatInterface } from "@/components/chat-interface"
import { GroupChat } from "@/components/group-chat"
import { useWebSocket, type ChatUser } from "@/hooks/useWebSocket"
import { UsersIcon } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { sanitize } from "@/utils/sanitize"
import { checkSession } from "@/lib/auth"
import { formatDateTime } from "@/utils/formatDate"
import { Feed } from "@/components/feed"

interface Post {
  post_id: number;
  nickname: string;
  content: string;
  created_at: string;
  avatar?: string;
  filename_new?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  liked?: boolean;
}

export default function SocialNetworkPage() {
  const { currentUser, logout } = useAuth()
  const [content, setContent] = useState("")
  const [posts, setPosts] = useState<Post[]>([])
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState("public")
  const [submitting, setSubmitting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const { messages, sendMessage, isConnected } = useWebSocket()
  const [activeChat, setActiveChat] = useState<ChatUser | null>(null)
  const [activeGroupChat, setActiveGroupChat] = useState<any>(null)
  const [isChatMinimized, setIsChatMinimized] = useState(false)
  const [isGroupChatMinimized, setIsGroupChatMinimized] = useState(false)

  // Mock users data - in real app, fetch from backend
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

  // Fetch posts and verify authentication
  useEffect(() => {
    const verifySessionAndFetch = async () => {
      try {
        await checkSession(); // If this fails, it jumps to catch
        setIsAuthenticated(true); // Only runs if checkSession succeeds
        // Fetch posts only if authenticated
        const res = await fetch("http://localhost:8080/api/getfeedposts", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
        const postData = await res.json();
        setPosts(postData);
        
      } catch {
        setIsAuthenticated(false);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    verifySessionAndFetch();
  }, []);

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

  const handleLike = async (postId: number) => {
    setPosts(
      posts.map((post) =>
        post.post_id === postId
          ? { ...post, liked: !post.liked, likes: post.liked ? (post.likes || 0) - 1 : (post.likes || 0) + 1 }
          : post,
      ),
    )
    // TODO: Send like status to backend API
  }

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImage(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    
    setSubmitting(true);
    const sanitizedContent = sanitize(content);
    const formData = new FormData();
    
    formData.append("content", sanitizedContent);
    formData.append("privacy", privacy);
    if (image) formData.append("file", image);

    try {
      const res = await fetch("http://localhost:8080/api/createposts", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to create post: ${res.status}`);

      // Reset the form after successful post
      setContent("");
      setImage(null);
      setImagePreview(null);
      setPrivacy("public");
      
      // Refresh posts
      const postsRes = await fetch("http://localhost:8080/api/getfeedposts", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (postsRes.ok) {
        const postData = await postsRes.json();
        setPosts(postData);
      }
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Error creating post: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Show login/register interface if not authenticated
  if (!currentUser || isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <h2 className="text-3xl font-bold text-center">Welcome to SocialHub</h2>
            <p className="text-center text-muted-foreground">
              Connect with friends and the world around you.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/login'}
            >
              Login
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/register'}
            >
              Register
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-4">
        {/* Left Sidebar */}
        <aside className="hidden lg:block">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={currentUser?.avatar && currentUser.avatar.trim() !== '' ? `http://localhost:8080${currentUser.avatar}` : "/placeholder.svg?height=48&width=48"} 
                    alt={currentUser?.nickname || "User"} 
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {currentUser ? currentUser.first_name?.charAt(0) + currentUser.last_name?.charAt(0) : "YU"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Your Name"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    @{currentUser?.nickname || "yourhandle"}
                  </p>
                </div>
              </div>

              <nav className="space-y-2">
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Home className="h-5 w-5" />
                  Home
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => window.location.href = '/profile/me'}>
                  <User className="h-5 w-5" />
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => window.location.href = '/groups'}>
                  <Users className="h-5 w-5" />
                  Groups
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
          <Feed currentUser={currentUser} />
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
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Chat Interface */}
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

      {/* Group Chat Interface */}
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