"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Users,
  UserPlus,
  Settings,
  Lock,
  Unlock,
  ArrowLeft,
  Calendar,
  Mail,
  User,
  Heart,
  MessageCircle,
  Share,
} from "lucide-react";
import { Post } from "@/components/feed";

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

interface FollowerData {
  user_uuid: string;
  first_name: string;
  last_name: string;
  nickname: string;
  avatar: string;
}

export default function MyProfilePage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followers, setFollowers] = useState<FollowerData[]>([]);
  const [following, setFollowing] = useState<FollowerData[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const verifySessionAndFetch = async () => {
      if (!currentUser) {
        setError("Please log in to view your profile");
        setLoading(false);
        return;
      }

      try {
        await checkSession();
        setIsAuthenticated(true);

        // Fetch profile
        const profileData = await fetchProfile("me");
        console.log("Profile Response:", profileData);
        if (!profileData || !profileData.success) {
          setError(profileData?.message || "Failed to load profile");
          setLoading(false);
          return;
        }
        setProfile(profileData.profile);
        setPrivacy(profileData.profile.privacy || "public");

        // Fetch followers
        const followersResponse = await fetch(
          `http://localhost:8080/api/followers/${currentUser.user_uuid}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        const followersData = await followersResponse.json();
        console.log("Followers Response:", followersData);
        console.log(
          "First follower avatar:",
          followersData.followers?.[0]?.avatar
        );
        if (followersData.success) {
          setFollowers(followersData.followers || []);
        } else {
          console.warn("Followers fetch error:", followersData.message);
          setFollowers([]);
        }

        // Fetch following
        const followingResponse = await fetch(
          `http://localhost:8080/api/following/${currentUser.user_uuid}`,
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

        // Fetch posts
        const myPostsRes = await fetch("http://localhost:8080/api/getmyposts", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!myPostsRes.ok) throw new Error("Failed to getmyposts");
        const myPostsData = await myPostsRes.json();
        setPosts(myPostsData);
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
  }, [currentUser]);

  const handlePrivacyToggle = async (newPrivacyValue?: string) => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    const newPrivacy =
      newPrivacyValue || (privacy === "public" ? "private" : "public");
    try {
      const response = await fetch(
        "http://localhost:8080/api/profile/privacy",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ privacy: newPrivacy }),
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setProfile({ ...profile!, privacy: newPrivacy });
        setPrivacy(newPrivacy);
      } else {
        setError(data.message || "Failed to update privacy");
      }
    } catch (err) {
      console.error("Privacy Update Error:", err);
      setError("Error updating privacy");
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
            <p className="text-muted-foreground mb-4">
              Please log in to view your profile.
            </p>
            <Button onClick={() => router.push("/login")}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {error || "Profile data not available."}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const displayName =
    profile.nickname || `${profile.first_name} ${profile.last_name}`;
  const fullName = `${profile.first_name} ${profile.last_name}`;

  console.log("MyProfile posts:", posts);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-32 w-32 mx-auto md:mx-0">
              <AvatarImage
                src={
                  profile.avatar && profile.avatar.trim() !== ""
                    ? `http://localhost:8080${profile.avatar}`
                    : "/placeholder.svg"
                }
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl">
                {profile.first_name[0]}
                {profile.last_name[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{displayName}</h1>
                  {profile.privacy === "public" ? (
                    <Unlock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                {profile.nickname && (
                  <p className="text-lg text-muted-foreground">{fullName}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDateOnly(profile.created_at)}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {followers.length} followers · {following.length} following
                </div>
              </div>

              {profile.about_me && (
                <p className="text-muted-foreground">{profile.about_me}</p>
              )}

              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="privacy-toggle"
                    checked={privacy === "private"}
                    onCheckedChange={async (checked) => {
                      const newPrivacy = checked ? "private" : "public";
                      await handlePrivacyToggle(newPrivacy);
                    }}
                  />
                  <Label htmlFor="privacy-toggle">Private Profile</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Content */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts">Posts ({posts?.length || 0})</TabsTrigger>
          <TabsTrigger value="followers">
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger value="following">
            Following ({following.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {posts?.length > 0 ? (
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
                      <Heart className="h-3 w-3" />0
                    </button>
                    <button className="flex items-center gap-1 text-xs hover:text-foreground">
                      <MessageCircle className="h-3 w-3" />
                      {post.comments?.length || 0}
                    </button>
                    {/* <button className="flex items-center gap-1 text-xs hover:text-foreground">
                      <Share className="h-3 w-3" />
                      0
                    </button> */}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No posts yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="followers" className="space-y-4">
          {followers.length > 0 ? (
            <div className="space-y-3">
              {followers.map((follower) => (
                <Link
                  key={follower.user_uuid}
                  href={`/profile/${follower.user_uuid}`}
                  className="flex items-center gap-3 hover:bg-muted p-2 rounded transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        follower.avatar && follower.avatar.trim() !== ""
                          ? `http://localhost:8080${follower.avatar}`
                          : undefined
                      }
                      alt={follower.nickname}
                      className="object-cover"
                    />
                    <AvatarFallback>
                      {follower.first_name?.charAt(0)}
                      {follower.last_name?.charAt(0)}
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
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No followers yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="space-y-4">
          {following.length > 0 ? (
            <div className="space-y-3">
              {following.map((follow) => (
                <Link
                  key={follow.user_uuid}
                  href={`/profile/${follow.user_uuid}`}
                  className="flex items-center gap-3 hover:bg-muted p-2 rounded transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        follow.avatar && follow.avatar.trim() !== ""
                          ? `http://localhost:8080${follow.avatar}`
                          : undefined
                      }
                      alt={follow.nickname}
                      className="object-cover"
                    />
                    <AvatarFallback>
                      {follow.first_name?.charAt(0)}
                      {follow.last_name?.charAt(0)}
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
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Not following anyone yet.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
