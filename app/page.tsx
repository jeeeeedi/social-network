"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, User, Users as UsersIcon, Calendar } from "lucide-react";
import { ChatInterface } from "@/components/chat-interface";
import { GroupChat } from "@/components/group-chat";
import { useWebSocket, type ChatUser } from "@/hooks/useWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import { Feed } from "@/components/feed";
import { useRouter } from "next/navigation";
import { EventCard } from "@/components/event-card"
import {
  getUserEvents,
  enrichEvents,
  respondToEvent,
  type EventWithDetails,
} from "@/utils/user-group-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Group {
  group_id: number;
  member_count: number;
  title: string;
  avatar: string;
  members?: any[];
}

export default function SocialNetworkPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const { messages, sendMessage, isConnected } = useWebSocket();
  const [activeChat, setActiveChat] = useState<ChatUser | null>(null);
  const [activeGroupChat, setActiveGroupChat] = useState<any>(null);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);

  const [userRSVPs, setUserRSVPs] = useState<{ [key: number]: "going" | "not_going" }>({});
  const [userEvents, setUserEvents] = useState<EventWithDetails[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);

  // NEW: Fetch groups, chat users and events once the current user is available
  useEffect(() => {
    if (!currentUser) return;

    // Helper to fetch the user's groups
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${API_URL}/api/groups`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch groups");
        }
        const data = await res.json();
        // Filter for groups where the user is a member (accepted status)
        const myGroups = Array.isArray(data)
          ? (data as any[]).filter((g) => g.user_status === 'accepted')
          : [];
        setGroups(myGroups);
      } catch (err) {
        console.error("Failed to load groups:", err);
      }
    };

    // Helper to fetch users that can participate in private chats (followers / following)
    const fetchChatUsers = async () => {
      try {
        const [allUsersRes, followersRes, followingRes] = await Promise.all([
          fetch(`${API_URL}/api/users`, { credentials: "include" }),
          fetch(`${API_URL}/api/followers/${currentUser.user_uuid}`, { credentials: "include" }),
          fetch(`${API_URL}/api/following/${currentUser.user_uuid}`, { credentials: "include" }),
        ]);

        if (!allUsersRes.ok) {
          throw new Error("Failed to fetch users");
        }

        const allUsersData = await allUsersRes.json();
        const allUsers = allUsersData.users || allUsersData;

        const followersData = followersRes.ok ? await followersRes.json() : { followers: [] };
        const followingData = followingRes.ok ? await followingRes.json() : { followers: [] };

        const followerUUIDs = new Set<string>(
          (followersData.followers || []).map((f: any) => f.user_uuid)
        );
        const followingUUIDs = new Set<string>(
          (followingData.followers || followingData.following || []).map((f: any) => f.user_uuid)
        );

        const transformed = (allUsers as any[])
          .filter((u) =>
            // exclude self and keep only followers or following
            u.user_uuid !== currentUser.user_uuid &&
            (followingUUIDs.has(u.user_uuid) || followerUUIDs.has(u.user_uuid))
          )
          .map((u) => ({
            user_uuid: u.user_uuid,
            first_name: u.first_name,
            last_name: u.last_name,
            id: u.user_uuid,
            name: `${u.first_name} ${u.last_name}`.trim(),
            username: u.nickname || u.first_name,
            avatar: u.avatar
              ? u.avatar.startsWith("http")
                ? u.avatar
                : `${API_URL}${u.avatar}`
              : "/placeholder.svg",
            isFollowing: followingUUIDs.has(u.user_uuid),
            isFollowedBy: followerUUIDs.has(u.user_uuid),
            lastSeen: undefined,
          }));

        setChatUsers(transformed);
      } catch (err) {
        console.error("Failed to load chat users:", err);
      }
    };

    // Helper to fetch and enrich events
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const events = await getUserEvents();
        const enriched = await enrichEvents(events);
        setUserEvents(enriched);
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchGroups();
    fetchChatUsers();
    fetchEvents();
  }, [currentUser]);

  const handleEventResponse = async (eventId: number, response: "going" | "not_going") => {
    if (!currentUser) return;

    try {
      const success = await respondToEvent(eventId, response);
      if (success) {
        setUserRSVPs((prev) => ({ ...prev, [eventId]: response }));
      } else {
        alert("Failed to update RSVP. Please try again.");
      }
    } catch (error) {
      console.error("Failed to update RSVP:", error);
      alert("Failed to update RSVP. Please try again.");
    }
  };

  const handleUserClick = (user: ChatUser) => {
    setActiveChat(user);
  };

  const handleGroupClick = (group: any) => {
    setActiveGroupChat(group);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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
            <Button className="w-full" onClick={() => router.push("/login")}>
              Login
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/register")}>
              Register
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
                    src={
                      currentUser?.avatar && currentUser.avatar.trim() !== ""
                        ? `${API_URL}${currentUser.avatar}`
                        : "/placeholder.svg?height=48&width=48"
                    }
                    alt={currentUser?.nickname || "User"}
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {currentUser
                      ? currentUser.first_name?.charAt(0) + currentUser.last_name?.charAt(0)
                      : "YU"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {currentUser
                      ? `${currentUser.first_name} ${currentUser.last_name}`
                      : "Your Name"}
                  </h3>
                  <p className="text-sm text-muted-foreground">@{currentUser?.nickname || ""}</p>
                </div>
              </div>

              <nav className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => window.location.href = "/profile/me"}
                >
                  <User className="h-5 w-5" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => window.location.href = "/groups"}
                >
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
                  .map((event) => (
                    <EventCard
                      key={event.event_id}
                      event={event}
                      rsvpStatus={userRSVPs[event.event_id] as "going" | "not_going" | null}
                      onRsvpChange={handleEventResponse}
                      variant="home"
                    />
                  ))
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
                {isConnected}
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {chatUsers.length > 0 ? (
                chatUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
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
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  No chats available
                </p>
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
                    key={group.group_id}
                    className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleGroupClick(group)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={
                            group.avatar
                              ? group.avatar.startsWith("http")
                                ? group.avatar
                                : `${API_URL}${group.avatar}`
                              : "/placeholder.svg"
                          } 
                          alt={group.title} 
                        />
                        <AvatarFallback>
                          {group.title
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{group.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.member_count || 0} members
                        </p>
                      </div>
                    </div>
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
  );
}
