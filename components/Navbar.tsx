"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Users,
  Bell,
  MessageCircle,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { NotificationCenter, Notification } from '@/components/notification-center';

export const Navbar: React.FC = () => {
  const { currentUser, logout, loggingOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Fetch notifications on component mount and when user changes
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
  setNotificationsLoading(true);
  try {
    const response = await fetch('http://localhost:8080/api/notifications', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      const data = await response.json();
      const formattedNotifications = data.notifications?.map((n: any) => ({
        id: n.id.toString(),
        type: mapBackendTypeToFrontend(n.type),
        title: generateNotificationTitle(n.type, n.message),
        message: n.message,
        timestamp: new Date(n.timestamp),
        isRead: n.status === 'read',
        actionRequired: n.type === 'group_join_request' || n.type === 'follow_request' || n.type === 'group_invitation',
        fromUser: n.actor_id ? {
          id: n.actor_id.toString(),
          name: n.sender,
          avatar: n.avatar ? `http://localhost:8080${n.avatar}` : "/placeholder.svg"
        } : undefined,
        groupId: n.parent_type === 'group' ? n.parent_id.toString() : undefined,
        followId: n.type === 'follow_request' ? n.parent_id.toString() : undefined, // Add this
      })) || [];
      setNotifications(formattedNotifications);
    }
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  } finally {
    setNotificationsLoading(false);
  }
};

  const mapBackendTypeToFrontend = (backendType: string): Notification['type'] => {
    switch (backendType) {
      case 'follow_request':
        return 'follow_request';
      case 'group_invite':
      case 'group_invitation':
        return 'group_invitation';
      case 'group_join_request':
        return 'group_join_request';
      case 'event':
      case 'group_event':
        return 'event_created';
      default:
        return 'message';
    }
  };

  const generateNotificationTitle = (type: string, message: string): string => {
    // For join request responses, determine title from message content
    if (message.includes('has been accepted')) {
      return 'Join Request Accepted';
    }
    if (message.includes('has been declined')) {
      return 'Join Request Declined';
    }
    
    switch (type) {
      case 'follow_request':
        return 'New Follow Request';
      case 'group_invitation':
        return 'Group Invitation';
      case 'group_join_request':
        return 'Group Join Request';
      case 'group_event':
        return 'New Event';
      case 'follow_accepted':
        return 'Request Accepted';
      default:
        return 'Notification';
    }
  };

  const handleLogout = async () => {
    try {
      // Set a timeout for logout to prevent infinite hanging
      const logoutPromise = logout();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 5000)
      );
      
      await Promise.race([logoutPromise, timeoutPromise]);
    } catch (error) {
      console.error('Logout failed or timed out:', error);
      // Continue with redirect even if logout fails
    } finally {
      // Always redirect regardless of logout success/failure
      window.location.replace('/login');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/notifications/${id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === id ? { ...n, isRead: true } : n
        ));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleAcceptFollowRequest = async (userId: string, followId: string) => {
  console.log('Attempting to accept follow request:', { userId, followId });
  try {
    const payload = { follow_id: parseInt(followId), action: 'accept' };
    console.log('Sending payload to /api/follow_requests:', payload);
    const response = await fetch('http://localhost:8080/api/follow_requests', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    let responseBody;
    try {
      responseBody = await response.json();
    } catch (e) {
      responseBody = await response.text();
    }
    console.log('Response status:', response.status, 'Response ok:', response.ok, 'Body:', responseBody);
    if (response.status === 401) {
      console.log('Session expired, redirecting to login');
      window.location.replace('/login');
      return;
    }
    if (response.status === 404) {
      console.log('Follow request no longer pending, refreshing notifications');
      fetchNotifications();
      return;
    }
    if (response.ok && responseBody.status === 'accepted') {
      console.log('Follow request accepted for follow_id:', followId);
      fetchNotifications();
    } else {
      console.error('Failed to accept follow request, unexpected response:', responseBody, 'Status:', response.status);
    }
  } catch (error) {
    console.error('Failed to accept follow request:', error);
  }
};

 const handleDeclineFollowRequest = async (userId: string, followId: string) => {
    console.log('Attempting to decline follow request:', { userId, followId });
    try {
      const payload = { follow_id: parseInt(followId), action: 'decline' };
      console.log('Sending payload to /api/follow_requests:', payload);
      const response = await fetch('http://localhost:8080/api/follow_requests', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      console.log('Response status:', response.status, 'Response ok:', response.ok);
      if (response.status === 401) {
        console.log('Session expired, redirecting to login');
        window.location.replace('/login');
        return;
      }
      if (response.status === 404) {
        console.log('Follow request no longer pending, refreshing notifications');
        fetchNotifications();
        return;
      }
      if (response.ok) {
        console.log('Follow request declined for follow_id:', followId);
        fetchNotifications();
      } else {
        const errorData = await response.json();
        console.error('Failed to decline follow request:', errorData.message, 'Status:', response.status);
      }
    } catch (error) {
      console.error('Failed to decline follow request:', error);
    }
  };

  const handleAcceptGroupInvitation = (groupId: string) => {
    console.log("Accepting group invitation for:", groupId);
    // TODO: Implement group invitation acceptance
  };

  const handleDeclineGroupInvitation = (groupId: string) => {
    console.log("Declining group invitation for:", groupId);
    // TODO: Implement group invitation decline
  };

  const handleAcceptGroupJoinRequest = async (userId: string, groupId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/groups/${groupId}/membership/${userId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'accepted' }),
      });
      if (response.ok) {
        // Refresh notifications to remove the processed request
        fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to accept group join request:", error);
    }
  };

  const handleDeclineGroupJoinRequest = async (userId: string, groupId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/groups/${groupId}/membership/${userId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'declined' }),
      });
      if (response.ok) {
        // Refresh notifications to remove the processed request
        fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to decline group join request:", error);
    }
  };

  const isActivePage = (path: string) => {
    return pathname === path;
  };

  interface NavItem {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    isActive: boolean;
    badge?: number;
    onClick?: () => void;
  }

  const navItems: NavItem[] = [
    {
      href: '/',
      icon: Home,
      label: 'Home',
      isActive: isActivePage('/'),
    },
    {
      href: '/groups',
      icon: Users,
      label: 'Groups',
      isActive: isActivePage('/groups'),
    },
  ];

  if (!currentUser) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-primary">SocialHub</h1>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            item.onClick ? (
              <Button
                key={item.label}
                variant={item.isActive ? "default" : "ghost"}
                size="sm"
                className="relative"
                onClick={item.onClick}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </Button>
            ) : (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={item.isActive ? "default" : "ghost"}
                  size="sm"
                  className="relative"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            )
          ))}
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onAcceptFollowRequest={handleAcceptFollowRequest}
            onDeclineFollowRequest={handleDeclineFollowRequest}
            onAcceptGroupInvitation={handleAcceptGroupInvitation}
            onDeclineGroupInvitation={handleDeclineGroupInvitation}
            onAcceptGroupJoinRequest={handleAcceptGroupJoinRequest}
            onDeclineGroupJoinRequest={handleDeclineGroupJoinRequest}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={currentUser?.avatar && currentUser.avatar.trim() !== '' ? `http://localhost:8080${currentUser.avatar}` : undefined}
                    alt={currentUser?.nickname || "User"}
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {currentUser?.first_name?.charAt(0)}{currentUser?.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">
                    {currentUser?.first_name} {currentUser?.last_name}
                  </p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    @{currentUser?.nickname}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile/me" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="cursor-pointer"
                disabled={loggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{loggingOut ? 'Logging out...' : 'Log out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-1">
          {navItems.slice(0, 2).map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={item.isActive ? "default" : "ghost"}
                size="icon"
                className="relative"
              >
                <item.icon className="h-4 w-4" />
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onAcceptFollowRequest={handleAcceptFollowRequest}
            onDeclineFollowRequest={handleDeclineFollowRequest}
            onAcceptGroupInvitation={handleAcceptGroupInvitation}
            onDeclineGroupInvitation={handleDeclineGroupInvitation}
            onAcceptGroupJoinRequest={handleAcceptGroupJoinRequest}
            onDeclineGroupJoinRequest={handleDeclineGroupJoinRequest}
          />
        </div>
      </div>
    </nav>
  );
}; 