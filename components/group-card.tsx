"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Lock,
  Globe,
  Calendar,
  MessageSquare,
  Crown,
  Settings,
} from "lucide-react";

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  creatorId: string;
  creatorName: string;
  memberCount: number;
  isPrivate: boolean;
  isMember: boolean;
  isPending: boolean;
  events: Event[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  dateTime: Date;
  groupId: string;
  creatorId: string;
  responses: {
    going: string[];
    notGoing: string[];
  };
}

interface GroupCardProps {
  group: Group;
  onJoinGroup: (groupId: string) => void;
  onViewGroup: (groupId: string) => void;
  currentUserId: string;
}

export function GroupCard({
  group,
  onJoinGroup,
  onViewGroup,
  currentUserId,
}: GroupCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Safety checks
  if (!group) {
    return null;
  }

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      await onJoinGroup(group.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    onViewGroup(group.id);
  };

  const upcomingEvents = (group.events || []).filter(
    (event) => event.dateTime > new Date()
  ).length;
  const groupName = group.name || "Unknown Group";
  const memberCount = group.memberCount || 0;
  const isCreator = group.creatorId === currentUserId;
  const isMember = group.isMember || isCreator;
  const isPending = group.isPending && !isCreator;

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={
                group.avatar
                  ? group.avatar.startsWith("/uploads/")
                    ? `${API_URL}${group.avatar}`
                    : `${API_URL}/uploads/${group.avatar}`
                  : "/placeholder.svg"
              }
              alt={groupName}
              className="object-cover"
            />
            <AvatarFallback>
              {groupName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold break-words">{groupName}</h3>
              {group.isPrivate ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Globe className="h-4 w-4 text-muted-foreground" />
              )}
              {isCreator && <Crown className="h-4 w-4 text-yellow-500" />}
            </div>
            <p className="text-sm text-muted-foreground break-words">
              Created by {group.creatorName}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2 break-words">
          {group.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {memberCount} members
          </div>
          {upcomingEvents > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {upcomingEvents} events
            </div>
          )}
        </div>

        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewGroup(group.id)}
            className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            View
          </Button>

          {!isCreator && !isMember && !isPending && (
            <Button
              size="sm"
              onClick={handleJoin}
              disabled={isLoading}
              variant="default"
              className="flex-1 hover:bg-primary/90 transition-colors"
            >
              {isLoading ? "Loading..." : "Join"}
            </Button>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 flex-wrap">
          {isCreator && (
            <Badge
              variant="default"
              className="w-fit bg-yellow-500 hover:bg-yellow-600 transition-colors"
            >
              <Crown className="h-3 w-3 mr-1" />
              Owner
            </Badge>
          )}
          {isMember && !isCreator && (
            <Badge variant="secondary" className="w-fit">
              Member
            </Badge>
          )}
          {isPending && !isCreator && (
            <Badge
              variant="outline"
              className="w-fit text-orange-600 border-orange-600"
            >
              Request Pending
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
