"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface EventCardProps {
  event: {
    event_id: number;
    title: string;
    description: string;
    event_date_time: string;
    creator?: {
      first_name: string;
      last_name: string;
    };
    group?: {
      title: string;
    };
  };
  rsvpStatus?: "going" | "not_going" | null;
  onRsvpChange?: (eventId: number, response: "going" | "not_going") => void;
  showRsvpButtons?: boolean;
  variant?: "home" | "group";
}

export function EventCard({
  event,
  rsvpStatus,
  onRsvpChange,
  showRsvpButtons = true,
  variant = "home"
}: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const eventDate = new Date(event.event_date_time);
  const isUpcoming = eventDate > new Date();
  const isGoing = rsvpStatus === "going";
  const isNotGoing = rsvpStatus === "not_going";
  
  const formatUserName = (creator: { first_name: string; last_name: string }) => {
    return `${creator.first_name} ${creator.last_name}`;
  };

  const handleRsvp = (response: "going" | "not_going") => {
    onRsvpChange?.(event.event_id, response);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only expand if clicking on the description area, not on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className="p-3 border rounded-lg space-y-2 cursor-pointer hover:bg-muted/20 transition-colors"
      onClick={handleCardClick}
    >
      <div>
        <h4 className="font-medium text-sm">{event.title}</h4>
        
        {/* Show description on group page, group name on home page */}
        {variant === "group" && event.description && (
          <p className={`text-xs text-muted-foreground transition-all duration-200 mt-3 mb-3 ${
            isExpanded ? "" : "line-clamp-2"
          }`}>
            {event.description}
          </p>
        )}
        
        {variant === "home" && event.group && (
          <p className="text-xs text-muted-foreground">{event.group.title}</p>
        )}
        
        {/* Date and time */}
        <p className="text-xs text-muted-foreground">
          {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
        
        {/* Creator info (for group page) */}
        {variant === "group" && event.creator && (
          <p className="text-xs text-muted-foreground">
            by {formatUserName(event.creator)}
          </p>
        )}
        
        {/* Expand/Collapse hint for group page descriptions */}
        {variant === "group" && event.description && event.description.length > 100 && (
          <p className="text-xs text-blue-500 mt-1">
            {isExpanded ? "Click to collapse" : "Click to read more"}
          </p>
        )}
      </div>
      
      {/* RSVP Buttons for upcoming events */}
      {isUpcoming && showRsvpButtons && onRsvpChange && (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant={isGoing ? "default" : "outline"}
            onClick={() => handleRsvp("going")}
            className="flex-1 text-xs"
          >
            Going
          </Button>
          <Button
            size="sm"
            variant={isNotGoing ? "destructive" : "outline"}
            onClick={() => handleRsvp("not_going")}
            className="flex-1 text-xs"
          >
            Not Going
          </Button>
        </div>
      )}
      
      {/* Past event badge */}
      {!isUpcoming && (
        <Badge variant="secondary" className="text-xs">
          Past Event
        </Badge>
      )}
    </div>
  );
} 