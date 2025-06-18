"use client"

import React from 'react';
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
import { NotificationCenter } from '@/components/notification-center';

// Mock data for notifications (to be replaced with API calls in the future)
const mockNotifications = [
  {
    id: "1",
    type: "follow_request" as const,
    title: "New Friend Request",
    message: "John Doe has sent you a friend request.",
    timestamp: new Date(),
    isRead: false,
    actionRequired: true,
    fromUser: {
      id: "user123",
      name: "John Doe",
      avatar: "/placeholder.svg"
    }
  },
  {
    id: "2",
    type: "group_invitation" as const,
    title: "Group Invitation",
    message: "You have been invited to join Tech Enthusiasts.",
    timestamp: new Date(Date.now() - 3600000),
    isRead: false,
    actionRequired: true,
    groupId: "group456"
  },
  {
    id: "3",
    type: "message" as const,
    title: "New Message",
    message: "Jane Smith sent you a message.",
    timestamp: new Date(Date.now() - 7200000),
    isRead: true,
    fromUser: {
      id: "user789",
      name: "Jane Smith",
      avatar: "/placeholder.svg"
    }
  }
];

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMarkAsRead = (id: string) => {
    // Logic to mark notification as read (API call in the future)
    console.log("Marking notification as read:", id);
  };

  const handleAcceptFollowRequest = (userId: string) => {
    console.log("Accepting follow request from:", userId);
  };

  const handleDeclineFollowRequest = (userId: string) => {
    console.log("Declining follow request from:", userId);
  };

  const handleAcceptGroupInvitation = (groupId: string) => {
    console.log("Accepting group invitation for:", groupId);
  };

  const handleDeclineGroupInvitation = (groupId: string) => {
    console.log("Declining group invitation for:", groupId);
  };

  const handleAcceptGroupJoinRequest = (userId: string, groupId: string) => {
    console.log(`Accepting group join request from user ${userId} for group ${groupId}`);
  };

  const handleDeclineGroupJoinRequest = (userId: string, groupId: string) => {
    console.log(`Declining group join request from user ${userId} for group ${groupId}`);
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
    {
      href: '/messages',
      icon: MessageCircle,
      label: 'Messages',
      isActive: isActivePage('/messages'),
    },
    {
      href: '#',
      icon: LogOut,
      label: 'Logout',
      isActive: false,
      onClick: handleLogout,
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
            notifications={mockNotifications}
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
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
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
            notifications={mockNotifications}
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