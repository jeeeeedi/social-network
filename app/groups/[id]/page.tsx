"use client"

// This is the dynamic group detail page. It displays group info, posts, and actions (invite, event, post).

import React, { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Heart, MessageCircle, Users as UsersIcon, Settings, ArrowLeft, UserPlus, Calendar } from "lucide-react"
import { GroupChat } from "@/components/group-chat"
import type { Message, ChatUser } from "@/hooks/useWebSocket"

interface GroupMember {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isOnline: boolean;
}



interface GroupChatType {
  id: string;
  name: string;
  avatar: string;
  members: ChatUser[];
  description?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  dateTime: Date;
  creatorId: string;
  creatorName: string;
  attendees: {
    going: string[];
    notGoing: string[];
  };
}

// Type definitions
interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isOnline: boolean;
}

interface Post {
  id: string;
  user: User;
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
}

interface EventData {
  title: string;
  description: string;
  dateTime: Date;
}

// Mock data for group, posts, events, and users
// Replace with real data fetching logic later
const mockGroup = {
  id: "1",
  name: "Mock Group",
  description: "This is a mock group for demonstration.",
  avatar: "/placeholder.svg",
  creatorId: "1",
  creatorName: "Admin",
  memberCount: 10,
  isPrivate: false,
  isMember: true,
  isPending: false,
  events: [],
  members: [
    { id: "1", name: "Admin", username: "admin", avatar: "", isOnline: true, isFollowing: false, isFollowedBy: false },
    { id: "2", name: "User Two", username: "user2", avatar: "", isOnline: false, isFollowing: false, isFollowedBy: false },
  ],
}

const mockEvents: Event[] = [
  {
    id: "e1",
    title: "Team Meeting",
    description: "Weekly team sync",
    date: "2025-07-15",
    time: "14:00",
    dateTime: new Date("2025-07-15T14:00"),
    creatorId: "1",
    creatorName: "Admin",
    attendees: {
      going: ["1"],
      notGoing: []
    }
  },
  {
    id: "e2", 
    title: "Design Workshop",
    description: "UI/UX design session",
    date: "2025-08-20",
    time: "16:30",
    dateTime: new Date("2025-08-20T16:30"),
    creatorId: "1",
    creatorName: "Admin",
    attendees: {
      going: [],
      notGoing: ["2"]
    }
  }
]

const mockAvailableUsers = [
  { id: "3", name: "Alice Johnson", username: "alice", avatar: "", isOnline: true },
  { id: "4", name: "Bob Smith", username: "bob", avatar: "", isOnline: false },
  { id: "5", name: "Carol Davis", username: "carol", avatar: "", isOnline: true },
  { id: "6", name: "David Wilson", username: "david", avatar: "", isOnline: false },
]

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params?.id as string

  // TODO: Replace with real user id
  const currentUserId = "1"

  // State for modals and chat
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [inviteSearch, setInviteSearch] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [eventTitle, setEventTitle] = useState("")
  const [eventDescription, setEventDescription] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [activeGroupChat, setActiveGroupChat] = useState<GroupChatType | null>(null)
  const [isGroupChatMinimized, setIsGroupChatMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [events, setEvents] = useState<Event[]>(mockEvents)

  // Move mockPosts to state
  const [posts, setPosts] = React.useState<Post[]>([
    {
      id: "p1",
      user: { id: "1", name: "Admin", username: "admin", avatar: "", isOnline: true },
      content: "Welcome to the group!",
      timestamp: new Date(),
      likes: 2,
      comments: 1,
      shares: 0,
      liked: false,
    },
  ]);

  // TODO: Fetch group, posts, events, availableUsers from backend

  // Handlers for actions (replace with real logic)
  const handleBack = () => router.push("/groups")
  const handleCreatePost = (content: string, image?: any) => {
    // Implement post creation logic
    alert(`Post created: ${content}`)
  }
  const handleLikePost = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? (post.likes || 0) - 1 : (post.likes || 0) + 1,
            }
          : post
      )
    );
  }
  const handleInviteUsers = () => {
    if (selectedUsers.length === 0) return
    // Implement invite logic
    alert(`Invited users: ${selectedUsers.join(", ")}`)
    setIsInviteModalOpen(false)
    setSelectedUsers([])
    setInviteSearch("")
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }
  const handleCreateEvent = (eventData: any) => {
    // Implement event creation logic
    alert(`Event created: ${eventData.title} on ${eventData.date} at ${eventData.time}`)
    setIsEventModalOpen(false)
    setEventTitle("")
    setEventDescription("")
    setEventDate("")
    setEventTime("")
  }
  
  const handleLeaveGroup = () => {
    // Implement leave logic
    alert("Left group")
  }
  const handleEventResponse = (eventId: string, response: "going" | "not_going") => {
    setEvents(prevEvents => 
      prevEvents.map(event => {
        if (event.id === eventId) {
          const updatedEvent = { ...event };
          // Remove user from both arrays first
          updatedEvent.attendees.going = updatedEvent.attendees.going.filter(id => id !== currentUserId);
          updatedEvent.attendees.notGoing = updatedEvent.attendees.notGoing.filter(id => id !== currentUserId);
          
          // Add to appropriate array
          if (response === "going") {
            updatedEvent.attendees.going.push(currentUserId);
          } else {
            updatedEvent.attendees.notGoing.push(currentUserId);
          }
          
          return updatedEvent;
        }
        return event;
      })
    );
  }

  const handleGroupChatClick = () => {
    setActiveGroupChat({
      id: mockGroup.id,
      name: mockGroup.name,
      avatar: mockGroup.avatar,
      members: mockGroup.members,
      description: mockGroup.description
    })
  }

  const sendMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newMessage])
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-4">
        {/* Left Sidebar - Group Info */}
        <aside className="hidden lg:block">
          <Card>
            <CardContent className="p-6">
              <Button variant="ghost" onClick={handleBack} className="w-full justify-start gap-3 mb-6">
                <ArrowLeft className="h-4 w-4" />
                Back to Groups
              </Button>

              <div className="flex items-center gap-3 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={mockGroup.avatar || "/placeholder.svg"} 
                    alt={mockGroup.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-lg">
                    {mockGroup.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{mockGroup.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {mockGroup.memberCount} members
                  </p>
                  <Badge variant={mockGroup.isPrivate ? "default" : "secondary"} className="mt-1">
                    {mockGroup.isPrivate ? "Private" : "Public"}
                  </Badge>
                </div>
              </div>

              {mockGroup.description && (
                <p className="text-sm text-muted-foreground mb-6">{mockGroup.description}</p>
              )}

              <nav className="space-y-2">
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => setIsInviteModalOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Invite Members
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => setIsEventModalOpen(true)}>
                  <Calendar className="h-4 w-4" />
                  Create Event
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleGroupChatClick}>
                  <MessageCircle className="h-4 w-4" />
                  Group Chat
                </Button>
                {mockGroup.creatorId === currentUserId && (
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Settings className="h-4 w-4" />
                    Group Settings
                  </Button>
                )}
                {mockGroup.creatorId !== currentUserId && (
                  <Button variant="destructive" className="w-full" onClick={handleLeaveGroup}>
                    Leave Group
                  </Button>
                )}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content - Posts */}
        <main className="lg:col-span-2 space-y-6">
          {/* Create Post Section */}
          <Card>
            <CardHeader>
              <CardTitle>Share with {mockGroup.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder={`What's on your mind?`} className="mb-4" />
              <Button onClick={() => handleCreatePost("New post content")}>Post</Button>
            </CardContent>
          </Card>

          {/* Posts List */}
          <div className="space-y-6">
            {posts.map(post => (
              <Card key={post.id}>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.user.avatar || "/placeholder.svg"} alt={post.user.name} />
                    <AvatarFallback>
                      {post.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{post.user.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{post.timestamp.toLocaleString()}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{post.content}</p>
                  <div className="flex gap-4 text-muted-foreground">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1 text-xs hover:text-foreground ${post.liked ? "text-red-500" : ""}`}
                    >
                      <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} />
                      {post.likes || 0}
                    </Button>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs hover:text-foreground">
                      <MessageCircle className="h-4 w-4" />
                      {post.comments || 0}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>

        {/* Right Sidebar - Members */}
        <aside className="hidden lg:block space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Members ({mockGroup.members.length})
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockGroup.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {member.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        @{member.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {member.id === mockGroup.creatorId && (
                      <Badge variant="outline" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Group Chat
              </h3>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGroupChatClick}
              >
                Open Chat
              </Button>
            </CardContent>
          </Card>

          {/* Events */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events ({events.length})
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.length > 0 ? (
                events.map((event) => {
                  const isGoing = event.attendees.going.includes(currentUserId);
                  const isNotGoing = event.attendees.notGoing.includes(currentUserId);
                  const eventDate = new Date(event.dateTime);
                  const isUpcoming = eventDate > new Date();
                  
                  return (
                    <div key={event.id} className="p-3 border rounded-lg space-y-2">
                      <div>
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {event.creatorName}
                        </p>
                      </div>
                      
                      {isUpcoming && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={isGoing ? "default" : "outline"}
                            onClick={() => handleEventResponse(event.id, "going")}
                            className="flex-1 text-xs"
                          >
                            Going
                          </Button>
                          <Button
                            size="sm"
                            variant={isNotGoing ? "destructive" : "outline"}
                            onClick={() => handleEventResponse(event.id, "not_going")}
                            className="flex-1 text-xs"
                          >
                            Not Going
                          </Button>
                        </div>
                      )}
                      
                      {!isUpcoming && (
                        <Badge variant="secondary" className="text-xs">
                          Past Event
                        </Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No events yet</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Modals */}
      {/* Invite Users Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Users to {mockGroup.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-search">Search Users</Label>
              <Input 
                id="invite-search" 
                value={inviteSearch} 
                onChange={(e) => setInviteSearch(e.target.value)} 
                placeholder="Enter username or name..." 
              />
            </div>
            <div className="space-y-2">
              {mockAvailableUsers
                .filter(user => user.name.toLowerCase().includes(inviteSearch.toLowerCase()) || user.username.toLowerCase().includes(inviteSearch.toLowerCase()))
                .map(user => (
                  <div 
                    key={user.id} 
                    className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent transition-colors ${
                      selectedUsers.includes(user.id) ? 'bg-accent border-primary' : ''
                    }`}
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback>
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    {selectedUsers.includes(user.id) && (
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-xs text-primary-foreground">✓</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsInviteModalOpen(false)
              setSelectedUsers([])
              setInviteSearch("")
            }}>Cancel</Button>
            <Button 
              onClick={handleInviteUsers}
              disabled={selectedUsers.length === 0}
            >
              Send Invites ({selectedUsers.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title</Label>
              <Input 
                id="event-title" 
                value={eventTitle} 
                onChange={(e) => setEventTitle(e.target.value)} 
                placeholder="Enter event title" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea 
                id="event-description" 
                value={eventDescription} 
                onChange={(e) => setEventDescription(e.target.value)} 
                placeholder="Enter event description" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-date">Date</Label>
                <Input 
                  id="event-date" 
                  type="date"
                  value={eventDate} 
                  onChange={(e) => setEventDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-time">Time</Label>
                <Input 
                  id="event-time" 
                  type="time"
                  value={eventTime} 
                  onChange={(e) => setEventTime(e.target.value)} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleCreateEvent({ 
                title: eventTitle, 
                description: eventDescription, 
                date: eventDate,
                time: eventTime,
                dateTime: new Date(`${eventDate}T${eventTime}`) 
              })}
              disabled={!eventTitle || !eventDate || !eventTime}
            >
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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