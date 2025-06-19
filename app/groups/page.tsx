"use client"

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
    if (!loading && !currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser) {
      fetchGroups();
    }
  }, [currentUser, loading, router]);

  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8080/api/groups', {
        method: 'GET',
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

  const handleCreateGroup = async (groupData: { name: string; description: string; avatar?: string; isPrivate: boolean }) => {
    try {
      const response = await fetch('http://localhost:8080/api/groups', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: groupData.name,
          description: groupData.description,
          isPrivate: groupData.isPrivate
        }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newGroup = await response.json();
      setGroups([...groups, newGroup]);
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group. Please try again.");
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/groups/${groupId}/request-join`, {
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
      setGroups(groups.map((group: Group) => group.group_id === parseInt(groupId) ? { ...group, isPending: true } : group));
    } catch (err) {
      console.error("Failed to join group:", err);
      alert("Failed to join group. Please try again.");
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    // Note: This is a placeholder as the backend might not have a direct leave endpoint yet
    try {
      // Assuming there's a way to leave or update membership status to declined
      const response = await fetch(`http://localhost:8080/api/groups/${groupId}/membership/${currentUser.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'declined' }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setGroups(groups.map((group: Group) => group.group_id === parseInt(groupId) ? { ...group, isMember: false, isPending: false } : group));
    } catch (err) {
      console.error("Failed to leave group:", err);
      alert("Failed to leave group. Please try again.");
    }
  };

  const handleViewGroup = (groupId: string) => {
    router.push(`/groups/${groupId}`);
  };

  // Filter groups based on selected tab
  const filteredGroups = selectedTab === "my"
    ? groups.filter((group) => group.isMember)
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
      <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab} className="w-full mb-6">
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
                memberCount: group.memberCount || 0,
                isPrivate: group.isPrivate || false,
                isMember: group.isMember || false, 
                isPending: group.isPending || false,
                events: group.events || []
              }} 
              onJoinGroup={handleJoinGroup} 
              onLeaveGroup={handleLeaveGroup} 
              onViewGroup={handleViewGroup} 
              currentUserId={currentUser?.id?.toString() || "0"} 
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