"use client"

// This is the dynamic group detail page. It displays group info, posts, and actions (invite, event, post).

import React, { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Heart } from "lucide-react"

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
    { id: "1", name: "Admin", username: "admin", avatar: "", isOnline: true },
    { id: "2", name: "User Two", username: "user2", avatar: "", isOnline: false },
  ],
}

const mockEvents = []
const mockAvailableUsers = [
  { id: "3", name: "User Three", username: "user3", avatar: "", isOnline: true },
]

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params?.id as string

  // TODO: Replace with real user id
  const currentUserId = "1"

  // State for modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [inviteSearch, setInviteSearch] = useState("")
  const [eventTitle, setEventTitle] = useState("")
  const [eventDescription, setEventDescription] = useState("")

  // Move mockPosts to state
  const [posts, setPosts] = React.useState([
    {
      id: "p1",
      user: { id: "1", name: "Admin", username: "admin", avatar: "" },
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
  const handleCreatePost = (content, image) => {
    // Implement post creation logic
    alert(`Post created: ${content}`)
  }
  const handleLikePost = (postId) => {
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
  const handleInviteUsers = (userIds) => {
    // Implement invite logic
    alert(`Invited users: ${userIds.join(", ")}`)
    setIsInviteModalOpen(false)
  }
  const handleCreateEvent = (eventData) => {
    // Implement event creation logic
    alert(`Event created: ${eventData.title}`)
    setIsEventModalOpen(false)
  }
  const handleLeaveGroup = () => {
    // Implement leave logic
    alert("Left group")
  }
  const handleEventResponse = (eventId, response) => {
    // Implement event response logic
    alert(`Event ${eventId}: ${response}`)
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      {/* Group Header */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="w-16 h-16">
            <img src={mockGroup.avatar} alt={mockGroup.name} />
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{mockGroup.name}</CardTitle>
            <p className="text-muted-foreground">{mockGroup.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">{mockGroup.memberCount} members</p>
              <Badge variant={mockGroup.isPrivate ? "default" : "secondary"}>
                {mockGroup.isPrivate ? "Private" : "Public"}
              </Badge>
            </div>
          </div>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">...</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => alert("Report Group")}>Report Group</DropdownMenuItem>
                {mockGroup.creatorId === currentUserId && (
                  <DropdownMenuItem onClick={() => alert("Group Settings")}>Group Settings</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsInviteModalOpen(true)}>Invite</Button>
            <Button variant="secondary" onClick={() => setIsEventModalOpen(true)}>Start Event</Button>
            {mockGroup.creatorId !== currentUserId && (
              <Button variant="destructive" onClick={handleLeaveGroup}>Leave Group</Button>
            )}
          </div>
        </CardContent>
      </Card>

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
                  <div key={user.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent">
                    <Avatar>
                      <img src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
            <Button onClick={() => handleInviteUsers(["3"])}>Send Invites</Button>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>Cancel</Button>
            <Button onClick={() => handleCreateEvent({ title: eventTitle, description: eventDescription, dateTime: new Date() })}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Create Post Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create Post</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder={`Share something with ${mockGroup.name}...`} className="mb-4" />
              <Button onClick={() => handleCreatePost("New post content")}>Post</Button>
            </CardContent>
          </Card>

          {/* Posts List */}
          <div className="space-y-6">
            {posts.map(post => (
              <Card key={post.id}>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Avatar>
                    <img src={post.user.avatar || "/placeholder.svg"} alt={post.user.name} />
                  </Avatar>
                  <div>
                    <CardTitle>{post.user.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{post.timestamp.toLocaleString()}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{post.content}</p>
                  <div className="flex gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikePost(post.id)}
                      className={post.liked ? "text-red-500" : ""}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${post.liked ? "fill-current" : ""}`} />
                      {post.likes || 0}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="ghost" className="justify-start" onClick={() => setIsInviteModalOpen(true)}>Invite Friends</Button>
              <Button variant="ghost" className="justify-start" onClick={() => setIsEventModalOpen(true)}>Create Event</Button>
              <Button variant="ghost" className="justify-start" onClick={() => handleCreatePost("New post content")}>Create Post</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members ({mockGroup.members.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockGroup.members.map(member => (
                <div key={member.id} className="flex items-center gap-4">
                  <Avatar>
                    <img src={member.avatar || "/placeholder.svg"} alt={member.name} />
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">@{member.username}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 