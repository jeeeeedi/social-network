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
  Camera,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Send,
  Share,
  User,
  Users as UsersIcon,
  X,
  Calendar,
} from "lucide-react"
import { ChatInterface } from "@/components/chat-interface"
import { GroupChat } from "@/components/group-chat"
import { useWebSocket, type ChatUser } from "@/hooks/useWebSocket"
import { useAuth } from "@/contexts/AuthContext"
import { sanitize } from "@/utils/sanitize"
import { formatDateTime } from "@/utils/formatDate"
import { Feed } from "@/components/feed"
import { useRouter } from "next/navigation"
import { getUserEvents, enrichEvents, respondToEvent, type EventWithDetails } from "@/utils/user-group-api"

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
  const router = useRouter()
  const { currentUser, logout, loading: authLoading } = useAuth()
  const [content, setContent] = useState("")
  const [posts, setPosts] = useState<Post[]>([])
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState("public")
  const [submitting, setSubmitting] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)

  const { messages, sendMessage, isConnected, onlineUsers, setOnlineUsers } = useWebSocket()
  const [activeChat, setActiveChat] = useState<ChatUser | null>(null)
  const [activeGroupChat, setActiveGroupChat] = useState<any>(null)
  const [userEvents, setUserEvents] = useState<EventWithDetails[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [userRSVPs, setUserRSVPs] = useState<Record<number, string>>({}) // eventId -> "going" | "not_going"

  // Mock users data - in real app, fetch from backend
  // const [chatUsers] = useState<ChatUser[]>([
  //   {
  //     id: "1",
  //     name: "Emma Wilson",
  //     username: "emmaw",
  //     avatar: "/placeholder.svg?height=40&width=40",
  //     isOnline: true,
  //     isFollowing: true,
  //     isFollowedBy: true,
  //     lastSeen: new Date(),
  //   },
  //   {
  //     id: "2",
  //     name: "David Kim",
  //     username: "davidk",
  //     avatar: "/placeholder.svg?height=40&width=40",
  //     isOnline: false,
  //     isFollowing: false,
  //     isFollowedBy: true,
  //     lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  //   },
  //   {
  //     id: "3",
  //     name: "Lisa Brown",
  //     username: "lisab",
  //     avatar: "/placeholder.svg?height=40&width=40",
  //     isOnline: true,
  //     isFollowing: true,
  //     isFollowedBy: false,
  //     lastSeen: new Date(),
  //   },
  //   {
  //     id: "4",
  //     name: "Michael Chen",
  //     username: "michaelc",
  //     avatar: "/placeholder.svg?height=40&width=40",
  //     isOnline: false,
  //     isFollowing: true,
  //     isFollowedBy: true,
  //     lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  //   },
  // ])


  // const chatUsers = useState<ChatUser[]>(await getFollowersAndFollowings())
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);

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

  // Fetch posts only when user is authenticated
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;

      try {
        console.log('current usssser:', currentUser)
        const followersResponse = await fetch(
          `http://localhost:8080/api/followers/${currentUser.user_uuid}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );

          const followingResponse = await fetch(
          `http://localhost:8080/api/following/${currentUser.user_uuid}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!followersResponse.ok || !followingResponse.ok) throw new Error(`Failed to fetch chatUsers: ${followersResponse.status} or ${followingResponse.status}`);
        const followersData = await followersResponse.json();
        const followingData = await followingResponse.json();
        console.log('followersData:', followersData)
        console.log('followingData:', followingData)
const mergeArrays = [...followersData.followers, ...followingData.following];

const usersMap = new Map();
for (const user of mergeArrays) {
  usersMap.set(user.user_uuid, user); // user_id must be unique
}

const users = Array.from(usersMap.values());
console.log('users:', users)
        setChatUsers(users);
      } catch (e) {
        console.log('XXXXXXXXXXXXXXXXXXXXXXXXx:', e)
      }
    };
    fetchUsers();
  }, [currentUser])

  useEffect(() => {
    const fetchPosts = async () => {
      if (!currentUser) return;

      setPostsLoading(true);
      try {
        const res = await fetch("http://localhost:8080/api/getfeedposts", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
        const postData = await res.json();
        setPosts(postData);
      } catch {
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [currentUser]);

  // Fetch events when user is authenticated
  useEffect(() => {
    const fetchEvents = async () => {
      if (!currentUser || authLoading) return;

      setEventsLoading(true);
      try {
        const events = await getUserEvents();
        const enrichedEvents = await enrichEvents(events);
        setUserEvents(enrichedEvents);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setUserEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, [currentUser, authLoading]);

  const handleUserClick = (user: ChatUser) => {
    setActiveChat(user)
  }

  const handleGroupClick = (group: any) => {
    setActiveGroupChat(group)
  }

  const handleLike = async (postId: number) => {
    // Optimistically update the UI
    setPosts(posts.map(post =>
      post.post_id === postId
        ? { ...post, liked: !post.liked, likes: (post.likes || 0) + (post.liked ? -1 : 1) }
        : post
    ));
    // TODO: Send to backend
  }

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  const handlePost = async () => {
    if (!content.trim() && !image) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("content", sanitize(content));
      formData.append("privacy", privacy);
      if (image) {
        formData.append("image", image);
      }

      const res = await fetch("http://localhost:8080/api/createposts", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error(`Failed to create post: ${res.status}`);

      // Clear form
      setContent("");
      setImage(null);
      setImagePreview(null);

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
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setSubmitting(false);
    }
  }

  const handleEventResponse = async (eventId: number, response: "going" | "not_going") => {
    if (!currentUser) return;

    try {
      const success = await respondToEvent(eventId, response);
      if (success) {
        setUserRSVPs(prev => ({
          ...prev,
          [eventId]: response
        }));
      } else {
        alert('Failed to update RSVP. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update RSVP:', error);
      alert('Failed to update RSVP. Please try again.');
    }
  }

  // Show loading while AuthContext is checking session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login/register interface if not authenticated
  if (!currentUser) {
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
              onClick={() => router.push('/login')}
            >
              Login
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/register')}
            >
              Register
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-4">
        {/* Left Sidebar */}
        <aside className="hidden lg:block space-y-6">
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
                {/* <Button variant="ghost" className="w-full justify-start gap-3">
                  <Home className="h-5 w-5" />
                  Home
                </Button> */}
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => window.location.href = '/profile/me'}>
                  <User className="h-5 w-5" />
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => window.location.href = '/groups'}>
                  <UsersIcon className="h-5 w-5" />
                  Groups
                </Button>
              </nav>
            </CardContent>
          </Card>

          {/* Events */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Events
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {eventsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading events...</p>
              ) : userEvents.length > 0 ? (
                userEvents
                  .filter(event => new Date(event.event_date_time) > new Date())
                  .slice(0, 3)
                  .map((event) => {
                    const isGoing = userRSVPs[event.event_id] === "going";
                    const isNotGoing = userRSVPs[event.event_id] === "not_going";
                    const eventDate = new Date(event.event_date_time);

                    return (
                      <div key={event.event_id} className="p-3 border rounded-lg space-y-2">
                        <div>
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          <p className="text-xs text-muted-foreground">{event.group?.title || 'Unknown Group'}</p>
                          <p className="text-xs text-muted-foreground">
                            {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={isGoing ? "default" : "outline"}
                            onClick={() => handleEventResponse(event.event_id, "going")}
                            className="flex-1 text-xs"
                          >
                            Going
                          </Button>
                          <Button
                            size="sm"
                            variant={isNotGoing ? "destructive" : "outline"}
                            onClick={() => handleEventResponse(event.event_id, "not_going")}
                            className="flex-1 text-xs"
                          >
                            Not Going
                          </Button>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
              )}
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
                  key={user.user_uuid}
                  // className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${user.isFollowing || user.isFollowedBy ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"
                  //   }`}
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        {/* <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} /> */}
                        <AvatarFallback>
                          <span>{user.first_name}
                          {user.last_name}</span>
                        </AvatarFallback>
                      </Avatar>
                      {/* {user.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                      )} */}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.first_name} {user.last_name}</p>
                      {/* <p className="text-xs text-muted-foreground">
                        {user.isOnline ? "Online" : `Last seen ${user.lastSeen?.toLocaleTimeString()}`} 
                      </p> */}
                    </div>
                  </div>
                  {/* <div className="flex flex-col items-end gap-1">
                    {(user.isFollowing || user.isFollowedBy) && (
                      <Badge variant="outline" className="text-xs">
                        {user.isFollowing && user.isFollowedBy
                          ? "Friends"
                          : user.isFollowing
                            ? "Following"
                            : "Follower"}
                      </Badge>
                    )}
                  </div> */}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Group Chats */}
          {/* <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Group Chats
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
          </Card> */}
        </aside>
      </div>

      {/* Chat Interface */}
      {activeChat && (
        <ChatInterface
          user={activeChat}
          messages={messages}
          onSendMessage={sendMessage}
          onClose={() => setActiveChat(null)}
        />
      )}

      {/* Group Chat Interface */}
      {activeGroupChat && (
        <GroupChat
          group={activeGroupChat}
          messages={messages}
          onSendMessage={sendMessage}
          onClose={() => setActiveGroupChat(null)}
        />
      )}

    </div>
  )
}