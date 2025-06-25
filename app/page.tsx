"use client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, User, Users as UsersIcon, Calendar } from "lucide-react"
import { ChatInterface } from "@/components/chat-interface"
import { GroupChat } from "@/components/group-chat"
import { useWebSocket, type ChatUser } from "@/hooks/useWebSocket"
import { useAuth } from "@/contexts/AuthContext"
import { Feed } from "@/components/feed"
import { useRouter } from "next/navigation"
import { getUserEvents, enrichEvents, respondToEvent, type EventWithDetails } from "@/utils/user-group-api"

export default function SocialNetworkPage() {
  const router = useRouter()
  const { currentUser, loading: authLoading } = useAuth()
  const [userEvents, setUserEvents] = useState<EventWithDetails[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [userRSVPs, setUserRSVPs] = useState<Record<number, string>>({})

  const { messages, sendMessage, isConnected } = useWebSocket()
  const [activeChat, setActiveChat] = useState<ChatUser | null>(null)
  const [activeGroupChat, setActiveGroupChat] = useState<any>(null)

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

  const handleEventResponse = async (eventId: number, response: "going" | "not_going") => {
    if (!currentUser) return;
    
    try {
      const success = await respondToEvent(eventId, response);
      if (success) {
        setUserRSVPs(prev => ({ ...prev, [eventId]: response }));
      } else {
        alert('Failed to update RSVP. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update RSVP:', error);
      alert('Failed to update RSVP. Please try again.');
    }
  }

  const handleUserClick = (user: ChatUser) => {
    if (user.isFollowing || user.isFollowedBy) {
      setActiveChat(user);
    }
  }

  const handleGroupClick = (group: any) => {
    setActiveGroupChat(group);
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

  // Redirect to login if not authenticated
  if (!currentUser) {
    router.push('/login');
    return null;
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
                    src={currentUser?.avatar && currentUser.avatar.trim() !== '' ? `${API_URL}${currentUser.avatar}` : "/placeholder.svg?height=48&width=48"} 
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
              {chatUsers.length > 0 ? (
                chatUsers.map((user) => (
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
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No chats available</p>
              )}
            </CardContent>
          </Card>

          {/* Group Chats */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Group Chats
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.length > 0 ? (
                groups.map((group) => (
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
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.members?.length || 0} members</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {group.members?.filter((m: any) => m.isOnline).length || 0} online
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No group chats available</p>
              )}
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