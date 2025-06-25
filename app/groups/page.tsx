"use client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { GroupCard } from "@/components/group-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Define interface for Group data structure to avoid 'any' type
interface Group {
  group_id: number;
  title: string;
  description: string;
  creator_id: number;
  creator_name: string;
  created_at: string;
  member_count: number;
  user_status?: string;
  isMember?: boolean;
  isPending?: boolean;
  // Optional fields that might not be provided by backend
  avatar?: string;
  creatorId?: string;
  memberCount?: number;
  isPrivate?: boolean;
  events?: any[];
}

export default function GroupsPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("all");

  useEffect(() => {
    // Only fetch groups if user is authenticated and not loading
    if (!loading && currentUser) {
      fetchGroups();
    }
  }, [currentUser, loading]);

  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/groups`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        console.error('Failed to parse JSON:', jsonErr, 'Raw response:', text);
        throw new Error('Invalid JSON response from server');
      }
      setGroups(data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError('Failed to load groups. Please try again later.');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleCreateGroup = async (groupData: { name: string; description: string; avatar?: string; avatarFile?: File | null; isPrivate: boolean }) => {
    try {
      const formData = new FormData();
      formData.append('title', groupData.name);
      formData.append('description', groupData.description);
      if (groupData.isPrivate) {
        formData.append('isPrivate', 'true');
      }
      if (groupData.avatarFile) {
        formData.append('avatar', groupData.avatarFile);
      }

      const response = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        credentials: 'include',
        body: formData, // Send FormData instead of JSON
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newGroup = await response.json();
      // Refetch all groups to get enriched data with creator name and member count
      await fetchGroups();
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group. Please try again.");
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/request-join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Refetch groups to get updated status instead of manually setting isPending
      await fetchGroups();
    } catch (err) {
      console.error("Failed to join group:", err);
      alert("Failed to join group. Please try again.");
    }
  };



  const handleViewGroup = (groupId: string) => {
    router.push(`/groups/${groupId}`);
  };

  // Filter groups based on selected tab
  const filteredGroups = selectedTab === "my"
    ? groups.filter((group) => 
        group.creator_id === currentUser?.user_id || group.user_status === 'accepted'
      )
    : groups;

  if (loading || isLoadingGroups) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="col-span-full">
          <CardContent className="text-center py-8">
            <CardTitle>Error</CardTitle>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={fetchGroups} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Groups</h1>
        <CreateGroupDialog onCreateGroup={handleCreateGroup} />
      </div>

      {/* Tabs for All / My Groups */}
      <Tabs defaultValue="all" onValueChange={setSelectedTab} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="my">My Groups</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group: Group) => (
            <GroupCard 
              key={group.group_id} 
              group={{ 
                id: group.group_id.toString(), 
                name: group.title,
                description: group.description,
                avatar: group.avatar || "/placeholder.svg",
                creatorId: group.creator_id.toString(),
                creatorName: group.creator_name || "Unknown",
                memberCount: group.member_count || 0,
                isPrivate: group.isPrivate || false,
                isMember: group.user_status === 'accepted',
                isPending: group.user_status === 'requested' || group.user_status === 'invited',
                events: group.events || []
              }} 
              onJoinGroup={handleJoinGroup} 
              onViewGroup={handleViewGroup} 
              currentUserId={currentUser?.user_id?.toString() || "0"} 
            />
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <CardTitle>No groups found</CardTitle>
              <p className="text-muted-foreground mt-2">
                {selectedTab === "my" ? "You are not a member of any groups yet." : "No groups available."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 