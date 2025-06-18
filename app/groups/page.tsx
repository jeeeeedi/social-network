"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { GroupCard } from "@/components/group-card";

// Мок-данные для групп (заменить на API-запросы в будущем)
const mockGroups = [
  {
    id: "1",
    name: "Tech Enthusiasts",
    description: "A group for tech lovers to discuss latest trends and innovations.",
    avatar: "/placeholder.svg",
    creatorId: "creator1",
    creatorName: "John Doe",
    memberCount: 25,
    isPrivate: false,
    isMember: false,
    isPending: false,
    events: []
  },
  {
    id: "2",
    name: "Book Club",
    description: "Join us to discuss your favorite books and authors.",
    avatar: "/placeholder.svg",
    creatorId: "creator2",
    creatorName: "Jane Smith",
    memberCount: 18,
    isPrivate: true,
    isMember: false,
    isPending: false,
    events: []
  }
];

export default function GroupsPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser) {
      // Здесь можно добавить загрузку данных о группах из API
      setGroups(mockGroups);
    }
  }, [currentUser, loading, router]);

  const handleCreateGroup = async (groupData: { name: string; description: string; avatar?: string; isPrivate: boolean }) => {
    // Логика создания группы (API-запрос)
    console.log("Creating group:", groupData);
    // После создания группы можно обновить список групп
    setGroups([...groups, { ...groupData, id: Date.now().toString(), creatorId: "you", creatorName: "You", memberCount: 1, isMember: true, isPending: false, events: [] }]);
  };

  const handleJoinGroup = (groupId: string) => {
    // Логика присоединения к группе (API-запрос)
    console.log("Joining group:", groupId);
    setGroups(groups.map(group => group.id === groupId ? { ...group, isPending: true } : group));
  };

  const handleLeaveGroup = (groupId: string) => {
    // Логика выхода из группы (API-запрос)
    console.log("Leaving group:", groupId);
    setGroups(groups.map(group => group.id === groupId ? { ...group, isMember: false, isPending: false } : group));
  };

  const handleViewGroup = (groupId: string) => {
    // Перенаправление на страницу группы (в будущем можно создать отдельную страницу)
    console.log("Viewing group:", groupId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Groups</h1>
        <CreateGroupDialog onCreateGroup={handleCreateGroup} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.length > 0 ? (
          groups.map(group => (
            <GroupCard 
              key={group.id} 
              group={group} 
              onJoinGroup={handleJoinGroup} 
              onLeaveGroup={handleLeaveGroup} 
              onViewGroup={handleViewGroup} 
              currentUserId="you" 
            />
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <CardTitle>No groups found</CardTitle>
              <p className="text-muted-foreground mt-2">Create a new group to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 