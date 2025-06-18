"use client"

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProfile } from "@/lib/profile";
import { checkSession } from "@/lib/auth";
import { formatDateTime, formatDateOnly } from "@/utils/formatDate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  UserPlus, 
  UserMinus,
  Clock,
  Lock, 
  Unlock,
  ArrowLeft,
  Calendar,
  Mail,
  User,
  Heart,
  MessageCircle,
  Share
} from "lucide-react";

interface ProfileData {
  user_uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  about_me: string;
  avatar: string;
  date_of_birth: string;
  created_at: string;
  privacy: string;
  role: string;
}

interface PostData {
  post_uuid: string;
  content: string;
  created_at: string;
  filename_new: string;
  privacy: string;
}

interface FollowerData {
  user_uuid: string;
  first_name: string;
  last_name: string;
  nickname: string;
  avatar: string;
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { currentUser } = useAuth();
  const userId = params.id as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followers, setFollowers] = useState<FollowerData[]>([]);
  const [following, setFollowing] = useState<FollowerData[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState("");

  useEffect(() => {
    const verifySessionAndFetch = async () => {
      if (!userId) {
        setError("Invalid user ID");
        setLoading(false);
        return;
      }

      try {
        await checkSession();
        setIsAuthenticated(true);

        // Fetch profile
        const profileData = await fetchProfile(userId);
        console.log("Profile Response:", profileData);
        if (!profileData || !profileData.success) {
          setError(profileData?.message || "Failed to load profile");
          setLoading(false);
          return;
        }
        setProfile(profileData.profile);

        // Fetch followers
        const followersResponse = await fetch(
          `http://localhost:8080/api/followers/${userId}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const followersData = await followersResponse.json();
        console.log("Followers Response:", followersData);
        if (followersData.success) {
          setFollowers(followersData.followers || []);
        } else {
          console.warn("Followers fetch error:", followersData.message);
          setFollowers([]);
        }

        // Fetch following
        const followingResponse = await fetch(
          `http://localhost:8080/api/following/${userId}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const followingData = await followingResponse.json();
        console.log("Following Response:", followingData);
        if (followingData.success) {
          setFollowing(followingData.following || []);
        } else {
          console.warn("Following fetch error:", followingData.message);
          setFollowing([]);
        }

        // Check follow status if not own profile
        if (currentUser && currentUser.user_uuid !== userId) {
          try {
            const followResponse = await fetch(
              `http://localhost:8080/api/follow/status/${userId}`,
              { credentials: "include" }
            );
            const followData = await followResponse.json();
            if (followData.success) {
              setIsFollowing(followData.isFollowing);
              setFollowStatus(followData.status || "");
            } else {
              console.warn("Follow status error:", followData.message);
              // Fallback: Check if current user is in followers list
              const isFollower = followersData.followers?.some(
                (f: any) => f.user_uuid === currentUser.user_uuid
              );
              setIsFollowing(isFollower);
              setFollowStatus(isFollower ? "accepted" : "");
            }
          } catch (err) {
            console.warn("Follow status fetch error:", err);
            // Fallback
            const isFollower = followersData.followers?.some(
              (f: any) => f.user_uuid === currentUser.user_uuid
            );
            setIsFollowing(isFollower);
            setFollowStatus(isFollower ? "accepted" : "");
          }
        }

        // Fetch posts - only if profile is public or we're following
        if (profileData.profile.privacy === "public" || 
            (currentUser && (isFollowing || currentUser.user_uuid === userId))) {
          try {
            const myPostsRes = await fetch("http://localhost:8080/api/getmyposts", {
              method: "GET",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            });
            if (myPostsRes.ok) {
              const myPostsData = await myPostsRes.json();
              setPosts(myPostsData);
            }
          } catch (err) {
            console.warn("Posts fetch error:", err);
            setPosts([]);
          }
        }
      } catch (err) {
        setIsAuthenticated(false);
        setError((err as Error).message || "Failed to load profile");
        setPosts([]);
        setFollowers([]);
        setFollowing([]);
      } finally {
        setLoading(false);
      }
    };

    verifySessionAndFetch();
  }, [userId, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/follow/${userId}`,
        {
          method: isFollowing ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      const followData = await response.json();
      if (followData.success) {
        setIsFollowing(
          followData.status === "pending" || followData.status === "accepted"
        );
        setFollowStatus(followData.status || "");
        
        // Refresh followers and following
        const followersResponse = await fetch(
          `http://localhost:8080/api/followers/${userId}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const followersData = await followersResponse.json();
        if (followersData.success) {
          setFollowers(followersData.followers || []);
        }
        
        const followingResponse = await fetch(
          `http://localhost:8080/api/following/${userId}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const followingData = await followingResponse.json();
        if (followingData.success) {
          setFollowing(followingData.following || []);
        }
      } else {
        setError(followData.message || "Failed to update follow status");
      }
    } catch (err) {
      console.error("Follow Toggle Error:", err);
      setError("Error updating follow status");
    }
  };

  const handleRetry = () => {
    setError("");
    setLoading(true);
    setProfile(null);
    setFollowers([]);
    setFollowing([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Please log in to view profiles.</p>
            <Button onClick={() => router.push('/login')}>
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <Alert className="mb-4">
              <AlertDescription>Error: {error}</AlertDescription>
            </Alert>
            <Button onClick={handleRetry}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Profile not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.user_uuid === userId;
  const displayName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.nickname || "Unknown User";
  
  const canViewDetails = profile.privacy === "public" || isOwnProfile || 
                        (isFollowing && followStatus === "accepted");

  const getFollowButtonText = () => {
    if (isFollowing) {
      return followStatus === "pending" ? "Cancel Request" : "Unfollow";
    }
    return "Follow";
  };

  const getFollowButtonIcon = () => {
    if (isFollowing) {
      return followStatus === "pending" ? <Clock className="h-4 w-4 mr-2" /> : <UserMinus className="h-4 w-4 mr-2" />;
    }
    return <UserPlus className="h-4 w-4 mr-2" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{displayName}</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <Avatar className="h-32 w-32">
                  <AvatarImage
                    src={profile.avatar && profile.avatar.trim() !== '' ? `http://localhost:8080${profile.avatar}` : undefined}
                    alt={`${displayName}'s avatar`}
                  />
                  <AvatarFallback className="text-2xl">
                    {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{displayName}</h2>
                  {profile.nickname && (
                    <p className="text-muted-foreground">@{profile.nickname}</p>
                  )}
                </div>

                {canViewDetails ? (
                  <>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {profile.email}
                      </div>
                      {profile.date_of_birth && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Born {formatDateOnly(profile.date_of_birth)}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Joined {formatDateTime(profile.created_at)}
                      </div>
                    </div>

                    {profile.about_me && (
                      <p className="text-sm">{profile.about_me}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Limited profile view</p>
                )}

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{followers.length}</span>
                    <span className="text-muted-foreground">followers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span className="font-semibold">{following.length}</span>
                    <span className="text-muted-foreground">following</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={profile.privacy === "public" ? "default" : "secondary"}>
                    {profile.privacy === "public" ? (
                      <>
                        <Unlock className="h-3 w-3 mr-1" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </>
                    )}
                  </Badge>
                  {profile.role && (
                    <Badge variant="outline">{profile.role}</Badge>
                  )}
                  {followStatus === "pending" && (
                    <Badge variant="outline" className="text-yellow-600">
                      <Clock className="h-3 w-3 mr-1" />
                      Request Pending
                    </Badge>
                  )}
                </div>

                {!isOwnProfile && currentUser && (
                  <Button onClick={handleFollowToggle} variant={isFollowing ? "outline" : "default"}>
                    {getFollowButtonIcon()}
                    {getFollowButtonText()}
                  </Button>
                )}

                {isOwnProfile && (
                  <Button variant="outline" onClick={() => router.push('/profile/me')}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Posts */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Posts ({posts.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canViewDetails ? (
                  <div className="text-center py-8">
                    <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">This user's posts are private</p>
                    {!isFollowing && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Follow this user to see their posts
                      </p>
                    )}
                  </div>
                ) : posts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No posts yet.</p>
                ) : (
                  posts.map((post) => (
                    <Card key={post.post_uuid} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center mb-2">
                          <span className="text-xs text-muted-foreground">
                            Posted on {formatDateTime(post.created_at)}
                          </span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {post.privacy}
                          </Badge>
                        </div>
                        <p className="text-sm mb-3">{post.content}</p>
                        {post.filename_new && (
                          <div className="mb-3">
                            <img
                              src={`http://localhost:8080/uploads/${post.filename_new}`}
                              alt="Post attachment"
                              className="max-w-xs max-h-48 rounded border object-cover"
                            />
                          </div>
                        )}
                        <div className="flex gap-4 text-muted-foreground">
                          <button className="flex items-center gap-1 text-xs hover:text-foreground">
                            <Heart className="h-3 w-3" />
                            0
                          </button>
                          <button className="flex items-center gap-1 text-xs hover:text-foreground">
                            <MessageCircle className="h-3 w-3" />
                            0
                          </button>
                          <button className="flex items-center gap-1 text-xs hover:text-foreground">
                            <Share className="h-3 w-3" />
                            0
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Followers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Followers ({followers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {followers.length > 0 ? (
                  <div className="space-y-3">
                    {followers.slice(0, 5).map((follower) => (
                      <Link
                        key={follower.user_uuid}
                        href={`/profile/${follower.user_uuid}`}
                        className="flex items-center gap-3 hover:bg-muted p-2 rounded transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={follower.avatar && follower.avatar.trim() !== '' ? `http://localhost:8080${follower.avatar}` : undefined}
                            alt={follower.nickname}
                          />
                          <AvatarFallback>
                            {follower.first_name?.charAt(0)}{follower.last_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {follower.first_name} {follower.last_name}
                          </p>
                          {follower.nickname && (
                            <p className="text-xs text-muted-foreground truncate">
                              @{follower.nickname}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                    {followers.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{followers.length - 5} more
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No followers yet</p>
                )}
              </CardContent>
            </Card>

            {/* Following */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Following ({following.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {following.length > 0 ? (
                  <div className="space-y-3">
                    {following.slice(0, 5).map((follow) => (
                      <Link
                        key={follow.user_uuid}
                        href={`/profile/${follow.user_uuid}`}
                        className="flex items-center gap-3 hover:bg-muted p-2 rounded transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={follow.avatar && follow.avatar.trim() !== '' ? `http://localhost:8080${follow.avatar}` : undefined}
                            alt={follow.nickname}
                          />
                          <AvatarFallback>
                            {follow.first_name?.charAt(0)}{follow.last_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {follow.first_name} {follow.last_name}
                          </p>
                          {follow.nickname && (
                            <p className="text-xs text-muted-foreground truncate">
                              @{follow.nickname}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                    {following.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{following.length - 5} more
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not following anyone yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 