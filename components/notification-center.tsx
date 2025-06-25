"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, Check, X, Users, UserPlus, Calendar, MessageSquare } from "lucide-react"

export interface Notification {
  id: string
  type: "follow_request" | "group_invitation" | "group_join_request" | "event_created" | "message"
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  actionRequired?: boolean
  fromUser?: {
    id: string
    name: string
    avatar: string
  }
  groupId?: string
  eventId?: string
  followId?: string;
}

interface NotificationCenterProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onAcceptFollowRequest: (userId: string, followId: string) => void
  onDeclineFollowRequest: (userId: string, followId: string) => void
  onAcceptGroupInvitation: (groupId: string) => void
  onDeclineGroupInvitation: (groupId: string) => void
  onAcceptGroupJoinRequest: (userId: string, groupId: string) => void
  onDeclineGroupJoinRequest: (userId: string, groupId: string) => void
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onAcceptFollowRequest,
  onDeclineFollowRequest,
  onAcceptGroupInvitation,
  onDeclineGroupInvitation,
  onAcceptGroupJoinRequest,
  onDeclineGroupJoinRequest,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notificationResponses, setNotificationResponses] = useState<Record<string, "accept" | "decline" | null>>({})
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const router = useRouter()

  const handleNotificationClick = (notification: Notification) => {
    // Handle navigation for event notifications
    if (notification.type === "event_created" && notification.groupId) {
      router.push(`/groups/${notification.groupId}`)
      setIsOpen(false) // Close the dropdown
    }
    
    // Mark as read if unread
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "follow_request":
        return <UserPlus className="h-4 w-4" />
      case "group_invitation":
      case "group_join_request":
        return <Users className="h-4 w-4" />
      case "event_created":
        return <Calendar className="h-4 w-4" />
      case "message":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const handleNotificationAction = (notification: Notification, action: "accept" | "decline") => {
    // Store the user's response for UI state
    setNotificationResponses(prev => ({
      ...prev,
      [notification.id]: action
    }));

    switch (notification.type) {
      case 'follow_request':
      if (notification.fromUser && notification.followId) {
        console.log('Calling follow request handler:', { userId: notification.fromUser.id, followId: notification.followId, action });
        if (action === 'accept') {
          onAcceptFollowRequest(notification.fromUser.id, notification.followId);
        } else {
          onDeclineFollowRequest(notification.fromUser.id, notification.followId);
        }
      } else {
        console.error('Missing fromUser or followId for follow_request:', notification);
      }
      break;
      case "group_invitation":
        if (notification.groupId) {
          if (action === "accept") {
            onAcceptGroupInvitation(notification.groupId)
          } else {
            onDeclineGroupInvitation(notification.groupId)
          }
        }
        break
      case "group_join_request":
        if (notification.fromUser && notification.groupId) {
          if (action === "accept") {
            onAcceptGroupJoinRequest(notification.fromUser.id, notification.groupId)
          } else {
            onDeclineGroupJoinRequest(notification.fromUser.id, notification.groupId)
          }
        }
        break
    }
    onMarkAsRead(notification.id)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No notifications yet</div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={`p-4 hover:bg-muted/50 cursor-pointer ${
                          !notification.isRead ? "bg-muted/30" : ""
                        } ${
                          notificationResponses[notification.id] || !notification.actionRequired ? "bg-gray-100 text-gray-600" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {notification.fromUser && (
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={notification.fromUser.avatar || "/placeholder.svg"}
                                    alt={notification.fromUser.name}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {notification.fromUser.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <h4 className="text-sm font-medium truncate">{notification.title}</h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 break-words whitespace-pre-wrap line-clamp-3">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">{notification.timestamp.toLocaleString()}</p>

                            {(notification.type === 'group_invitation' || notification.type === 'follow_request' || notification.type === 'group_join_request') && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant={notificationResponses[notification.id] === "accept" ? "default" : "outline"}
                                  disabled={!!notificationResponses[notification.id] || !notification.actionRequired}
                                  className={notificationResponses[notification.id] === "accept" ? "bg-green-600 hover:bg-green-700 text-white" : notification.actionRequired ? "hover:bg-green-50 hover:border-green-300 hover:text-green-700" : ""}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (notification.actionRequired) {
                                      handleNotificationAction(notification, "accept")
                                    }
                                  }}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant={notificationResponses[notification.id] === "decline" ? "destructive" : "outline"}
                                  disabled={!!notificationResponses[notification.id] || !notification.actionRequired}
                                  className={notificationResponses[notification.id] === "decline" ? "" : notification.actionRequired ? "hover:bg-red-50 hover:border-red-300 hover:text-red-700" : ""}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (notification.actionRequired) {
                                      handleNotificationAction(notification, "decline")
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 