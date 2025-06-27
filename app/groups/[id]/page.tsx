"use client"

// This is the dynamic group detail page. It displays group info, posts, and actions (invite, event, post).

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Heart, MessageCircle, Users as UsersIcon, Settings, ArrowLeft, UserPlus, Calendar } from "lucide-react"
import { GroupChat } from "@/components/group-chat"
import { EventCard } from "@/components/event-card"
import { useAuth } from "@/contexts/AuthContext"
import type { Message, ChatUser } from "@/hooks/useWebSocket"
import { getUserById, getUsersByIds, getGroupById, formatUserName, getUserAvatarUrl, getGroupAvatarUrl, getGroupAvatarFallback, type UserInfo, type GroupInfo } from "@/utils/user-group-api"
import { Feed } from "@/components/feed"

// Backend data structures (clean, no redundant fields)
interface GroupMember {
  membership_id: number;
  inviter_id: number | null; // Can be null for join requests
  member_id: number;
  group_id: number;
  status: string;
  created_at: string;
}

interface Event {
  event_id: number;
  title: string;
  description: string;
  event_date_time: string;
  creator_id: number;
  group_id: number;
  status: string;
  created_at: string;
}

// Remove redundant GroupData interface - using GroupInfo from api.ts

// View-specific enriched data
interface MemberWithUser extends GroupMember {
  user?: UserInfo;
}

interface EventWithCreator extends Event {
  creator?: UserInfo;
}

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params?.id as string
  const { currentUser, loading: authLoading } = useAuth()

  // State for data
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [events, setEvents] = useState<EventWithCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for modals and chat
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [inviteSearch, setInviteSearch] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [eventTitle, setEventTitle] = useState("")
  const [eventDescription, setEventDescription] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [activeGroupChat, setActiveGroupChat] = useState<{
    group_id: number;
    member_count: number;
    title: string;
    avatar: string;
    members: ChatUser[];
    description?: string;
  } | null>(null)
  const [eventRsvps, setEventRsvps] = useState<Record<number, "going" | "not_going" | null>>({})

  const [messages, setMessages] = useState<Message[]>([])
  const [availableUsers, setAvailableUsers] = useState<UserInfo[]>([])

  // Fetch group data and enrich with user details
  useEffect(() => {
    if (!groupId || authLoading || !currentUser) return;
    
    const fetchGroupData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch group details using utility
        const groupData = await getGroupById(parseInt(groupId));
        if (!groupData) {
          setError('Group not found or access denied');
          return;
        }
        setGroup(groupData);

        // Fetch group members
        const membersResponse = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (membersResponse.ok) {
          const response = await membersResponse.json();
          const membersData: GroupMember[] = response.members || [];
          
          // Enrich members with user details
          const memberIds = membersData.map(m => m.member_id);
          const users = await getUsersByIds(memberIds);
          
          const enrichedMembers: MemberWithUser[] = membersData.map(member => ({
            ...member,
            user: users.get(member.member_id)
          }));
          
          setMembers(enrichedMembers);
        }

        // Fetch group events
        const eventsResponse = await fetch(`${API_URL}/api/groups/${groupId}/events`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (eventsResponse.ok) {
          const eventsData: Event[] = await eventsResponse.json();
          
          // Enrich events with creator details
          const creatorIds = Array.from(new Set(eventsData.map(e => e.creator_id)));
          const creators = await getUsersByIds(creatorIds);
          
          const enrichedEvents: EventWithCreator[] = eventsData.map(event => ({
            ...event,
            creator: creators.get(event.creator_id)
          }));
          
          setEvents(enrichedEvents);
        }

      } catch (err) {
        console.error('Failed to fetch group data:', err);
        setError('Failed to load group data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId, authLoading, currentUser, router]);

  // Handler functions (simplified)
  const handleBack = () => router.push("/groups")

  const handleOpenInviteModal = async () => {
    setIsInviteModalOpen(true);
    
    // Simple fetch on modal open - reuse existing API
    try {
      console.log('🔍 Fetching users for invitation...');
      const response = await fetch('http://localhost:8080/api/users', {
        credentials: 'include',
      });
      console.log('📡 Users API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Users API response data:', data);
        const allUsers = data.users || [];
        console.log('👥 All users count:', allUsers.length);
        
        // Filter out current members using existing data
        const memberIds = new Set(members.map(m => m.member_id));
        console.log('🏷️ Current member IDs:', Array.from(memberIds));
        const filtered = allUsers.filter((user: UserInfo) => !memberIds.has(user.user_id));
        console.log('✅ Available users after filtering:', filtered.length, filtered);
        setAvailableUsers(filtered);
      } else {
        console.error('❌ Users API failed with status:', response.status);
      }
    } catch (err) {
      console.error('💥 Failed to fetch users:', err);
    }
  };
  
  const handleInviteUsers = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      for (const userId of selectedUsers) {
        const response = await fetch(`${API_URL}/api/groups/${groupId}/invite`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invitee_id: parseInt(userId)
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to invite user ${userId}`);
        }
      }
      
      alert(`Successfully invited ${selectedUsers.length} user(s)!`);
      setIsInviteModalOpen(false);
      setSelectedUsers([]);
      setInviteSearch("");
    } catch (err) {
      console.error('Failed to invite users:', err);
      alert('Failed to invite users. Please try again.');
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }
  
  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventDescription.trim() || !eventDate || !eventTime) {
      alert('Please fill in all event details');
      return;
    }
    
    try {
      const eventDateTime = new Date(`${eventDate}T${eventTime}`);
      
      const response = await fetch(`${API_URL}/api/groups/${groupId}/events`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDescription,
          event_date_time: eventDateTime.toISOString(),
          group_id: parseInt(groupId),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }
      
      const newEvent: Event = await response.json();
      const creator = await getUserById(newEvent.creator_id);
      
      const enrichedEvent: EventWithCreator = {
        ...newEvent,
        creator: creator || undefined
      };
      
      setEvents(prev => [enrichedEvent, ...prev]);
      
      setIsEventModalOpen(false);
      setEventTitle("");
      setEventDescription("");
      setEventDate("");
      setEventTime("");
      
      alert('Event created successfully!');
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('Failed to create event. Please try again.');
    }
  }
  
  const handleEventResponse = async (eventId: number, response: "going" | "not_going") => {
    try {
      const apiResponse = await fetch(`${API_URL}/api/events/${eventId}/rsvp`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: response
        }),
      });
      
      if (!apiResponse.ok) {
        throw new Error(`Failed to update RSVP: ${apiResponse.status}`);
      }
      
      // Update local state to reflect the user's choice
      setEventRsvps(prev => ({
        ...prev,
        [eventId]: response
      }));
      
      alert(`RSVP updated: ${response === 'going' ? 'Going' : 'Not Going'}`);
      
    } catch (err) {
      console.error('Failed to update RSVP:', err);
      alert('Failed to update RSVP. Please try again.');
    }
  }

  const handleGroupChatClick = () => {
    if (!group) return;
    
    const acceptedMembers = members.filter(member => member.status === 'accepted' && member.user)

    const groupChat = {
      group_id: group.group_id,
      member_count: acceptedMembers.length,
      title: group.title,
      avatar: getGroupAvatarUrl(group),
      members: acceptedMembers.map(member => ({
        user_uuid: member.user!.user_uuid,
        first_name: member.user!.first_name,
        last_name: member.user!.last_name,
        id: member.member_id.toString(),
        name: formatUserName(member.user!),
        username: member.user!.nickname || member.user!.first_name,
        avatar: getUserAvatarUrl(member.user!),
        isFollowing: false,
        isFollowedBy: false,
      })),
      description: group.description,
    };
    
    setActiveGroupChat(groupChat);
  }

  const sendMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  }

  // Authentication check
  if (!authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center py-8">
            <CardTitle>Authentication Required</CardTitle>
            <p className="text-muted-foreground mt-2">Please log in to view group details.</p>
            <Button onClick={() => router.push('/login')} className="mt-4">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center py-8">
            <CardTitle>Error</CardTitle>
            <p className="text-muted-foreground mt-2">{error || 'Group not found'}</p>
            <Button onClick={handleBack} className="mt-4">Back to Groups</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is member
  const currentUserMember = members.find(member => 
    member.member_id === currentUser?.user_id && member.status === 'accepted'
  );
  const isCreator = group.creator_id === currentUser?.user_id;
  const isMember = !!currentUserMember || isCreator;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-4">
        {/* Left Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <Button variant="ghost" className="mb-4 p-0" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
                Back to Groups
              </Button>
      
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={getGroupAvatarUrl(group)} 
                    alt={group.title}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-lg">
                    {getGroupAvatarFallback(group)}
                  </AvatarFallback>
          </Avatar>
          <div>
                  <h3 className="font-semibold text-lg">{group.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {members.filter(m => m.status === 'accepted').length} members
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    Public
              </Badge>
            </div>
          </div>

              {group.description && (
                <p className="text-sm text-muted-foreground mb-6">{group.description}</p>
              )}

              {isMember && (
                <nav className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleOpenInviteModal}>
                    <UserPlus className="h-4 w-4" />
                    Invite Members
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => setIsEventModalOpen(true)}>
                    <Calendar className="h-4 w-4" />
                    Create Event
                  </Button>
                  {!isCreator && (
                    <Button variant="ghost" className="w-full justify-start gap-3 text-destructive">
                      <Settings className="h-4 w-4" />
                      Leave Group
                    </Button>
                  )}
                </nav>
              )}
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Members ({members.filter(m => m.status === 'accepted').length})
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {members
                .filter(member => member.status === 'accepted' && member.user)
                .slice(0, 6)
                .map((member) => (
                <div key={member.membership_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={getUserAvatarUrl(member.user!)} 
                      alt={formatUserName(member.user!)} 
                    />
                    <AvatarFallback>
                      {member.user!.first_name.charAt(0)}{member.user!.last_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {formatUserName(member.user!)}
                    </p>
                    {member.member_id === group.creator_id && (
                      <Badge variant="outline" className="text-xs">Admin</Badge>
                    )}
                  </div>
          </div>
              ))}
              {members.filter(m => m.status === 'accepted').length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{members.filter(m => m.status === 'accepted').length - 6} more
                </p>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-2 space-y-6">
          {isMember ? (
            <Feed
              currentUser={currentUser}
              groupId={groupId}
              groupMembers={members.filter(m => m.status === "accepted" && m.user)}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  You need to be a member to view group content.
                </p>
              </CardContent>
            </Card>
          )}
        </main>

        {/* Right Sidebar - Events */}
        <aside className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events ({events.length})
              </h3>
        </CardHeader>
            <CardContent className="space-y-3">
              {events.length > 0 ? (
                events.slice(0, 3).map((event) => (
                  <EventCard
                    key={event.event_id}
                    event={event}
                    rsvpStatus={eventRsvps[event.event_id]}
                    onRsvpChange={handleEventResponse}
                    showRsvpButtons={isMember}
                    variant="group"
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No events yet</p>
              )}
        </CardContent>
      </Card>
        </aside>
      </div>

      {/* Invite Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Members to {group.title}</DialogTitle>
            <DialogDescription>
              Search and select users to invite to this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
              <Input 
              placeholder="Search users..."
                value={inviteSearch} 
                onChange={(e) => setInviteSearch(e.target.value)} 
              />
            <div className="max-h-60 overflow-y-auto space-y-2">
              {availableUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No users available to invite</p>
                  <p className="text-xs mt-1">
                    {members.length > 1 ? 'All users are already members' : 'Loading users...'}
                  </p>
                </div>
              ) : (
                availableUsers
                  .filter(user => 
                    formatUserName(user).toLowerCase().includes(inviteSearch.toLowerCase()) ||
                    user.nickname?.toLowerCase().includes(inviteSearch.toLowerCase())
                  )
                  .map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getUserAvatarUrl(user)} alt={formatUserName(user)} />
                        <AvatarFallback>
                          {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{formatUserName(user)}</p>
                        <p className="text-xs text-muted-foreground">@{user.nickname || user.first_name}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={selectedUsers.includes(user.user_id.toString()) ? "default" : "outline"}
                      onClick={() => toggleUserSelection(user.user_id.toString())}
                    >
                      {selectedUsers.includes(user.user_id.toString()) ? "Selected" : "Select"}
                    </Button>
                    </div>
                  ))
                )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUsers} disabled={selectedUsers.length === 0}>
              Invite {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Create a new event for group members to participate in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="eventTitle">Event Title</Label>
              <Input 
                id="eventTitle"
                placeholder="Enter event title"
                value={eventTitle} 
                onChange={(e) => setEventTitle(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="eventDescription">Description</Label>
              <Textarea 
                id="eventDescription"
                placeholder="Enter event description"
                value={eventDescription} 
                onChange={(e) => setEventDescription(e.target.value)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventDate">Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="eventTime">Time</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>
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
        />
      )}
    </div>
  )
}