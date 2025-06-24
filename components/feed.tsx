"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Camera,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Send,
  Share,
  X,
} from "lucide-react";
import { sanitize } from "@/utils/sanitize";
import { formatDateTime } from "@/utils/formatDate";

export interface Post {
  post_id: number;
  post_uuid: string;
  poster_id: number;
  group_id?: number | null;
  content: string;
  privacy: string;
  status: string;
  created_at: string;
  nickname?: string;
  file_id?: number;
  filename_new?: string;
  avatar?: string;
  comments?: {
    comment_id: number;
    commenter_id: number;
    post_uuid: string;
    group_id?: number | null;
    content: string;
    privacy: string;
    status: string;
    created_at: string;
    nickname?: string;
    file_id?: number;
    filename_new?: string;
    avatar?: string;
  }[];
  shares?: number;
  likes?: number;
  liked?: boolean;
}

// Helper function to filter posts based on context
function getFilteredPosts(posts?: Post[], groupId?: string | number) {
  if (!posts) return [];
  if (groupId) {
    return posts.filter((post) => post.group_id === Number(groupId));
  } else {
    return posts.filter((post) => !post.group_id);
  }
}

export function Feed({
  currentUser,
  groupId,
  groupMembers = [],
}: {
  currentUser: any;
  groupId?: string | number;
  groupMembers?: any[];
}) {
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState("public");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedPostUUID, setExpandedPostUUID] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState<Record<string, string>>(
    {}
  );
  const [commentImage, setCommentImage] = useState<Record<string, File | null>>(
    {}
  );
  const [commentImagePreview, setCommentImagePreview] = useState<
    Record<string, string | null>
  >({});
  const [followers, setFollowers] = useState<any[]>([]);
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch posts (group or global)
        const url = groupId
          ? `${API_URL}/getgroupposts/${groupId}`
          : `${API_URL}/getfeedposts`;
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
        const posts = await res.json();
        setPosts(posts);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }

      // Fetch followers (skip for group feed if not needed)
      if (!groupId) {
        try {
          const followersResponse = await fetch(
            `${API_URL}/followers/${currentUser.user_uuid}`,
            {
              method: "GET",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            }
          );
          const followersData = await followersResponse.json();
          if (followersData.success) {
            setFollowers(followersData.followers || []);
          } else {
            setFollowers([]);
          }
        } catch (err) {
          setFollowers([]);
        }
      }
    };

    fetchData();
  }, [currentUser, groupId]);

  // console.log("groupId:", groupId, "| groupMembers:", groupMembers);

  const handleLike = async (postUUID: string) => {
    setPosts(
      posts.map((post) =>
        post.post_uuid === postUUID
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? (post.likes || 0) - 1 : (post.likes || 0) + 1,
            }
          : post
      )
    );
    // TODO: Send like status to backend API
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImage(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    if (content.length > 1000) {
      setError("Content is too long. Maximum is 1000 characters.");
      setSubmitting(false);
      return;
    }
    const sanitizedContent = sanitize(content);
    const formData = new FormData();
    formData.append("content", sanitizedContent);

    // If this is a group feed, set privacy to "group" and include groupId
    if (groupId) {
      formData.append("privacy", "semi-private");
      formData.append("group_id", String(groupId));
      formData.append(
        "selectedFollowers",
        JSON.stringify(groupMembers.map((m: any) => m.user.user_uuid))
      );
    } else {
      formData.append("privacy", privacy);
      // For semi-private: send all follower IDs; for private: send only selected
      if (privacy === "semi-private") {
        formData.append(
          "selectedFollowers",
          JSON.stringify(followers.map((f: any) => f.user_uuid))
        );
      } else if (privacy === "private") {
        formData.append("selectedFollowers", JSON.stringify(selectedFollowers));
      }
    }
    if (image) formData.append("file", image);

    try {
      const res = await fetch(`${API_URL}/createposts`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to create post: ${res.status}`);

      // Reset the form after successful post
      setContent("");
      setImage(null);
      setImagePreview(null);
      setPrivacy("public");
      setSelectedFollowers([]);

      // Refresh posts
      const postsRes = await fetch(
        groupId
          ? `${API_URL}/getgroupposts/${groupId}`
          : `${API_URL}/getfeedposts`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (postsRes.ok) {
        const posts = await postsRes.json();
        setPosts(posts);
      }
    } catch (err) {
      if ((err as Error).message.includes("Content too long")) {
        setError("Content is too long. Maximum is 1000 characters.");
      } else {
        setError("Error creating post: " + (err as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentClick = (postUUID: string) => {
    setExpandedPostUUID(expandedPostUUID === postUUID ? null : postUUID);
  };

  const handleCommentSubmit = async (
    postUUID: string,
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const content = commentContent[postUUID];
    if (!content?.trim()) return;

    const formData = new FormData();
    formData.append("post_uuid", postUUID);
    formData.append("content", content);
    if (commentImage[postUUID]) formData.append("file", commentImage[postUUID]);
    // If this is a group feed, include groupId
    if (groupId) {
      formData.append("group_id", String(groupId));
    }

    try {
      const res = await fetch(`${API_URL}/createcomment`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error(`Failed to create comment: ${res.status}`);

      setCommentContent((prev) => ({
        ...prev,
        [postUUID]: "",
      }));
      setCommentImage((prev) => ({
        ...prev,
        [postUUID]: null,
      }));
      setCommentImagePreview((prev) => ({
        ...prev,
        [postUUID]: null,
      }));

      // Refresh posts to get updated comments
      const postsRes = await fetch(
        groupId
          ? `${API_URL}/getgroupposts/${groupId}`
          : `${API_URL}/getfeedposts`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (postsRes.ok) {
        const posts = await postsRes.json();
        setPosts(posts);
      }
    } catch (err) {
      alert(
        "Error creating comment: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  if (!currentUser) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">
          Please log in to view your feed.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading feed...</p>
      </div>
    );
  }
  
  // console.log("Posts fetched:", posts);

  // Use the helper to filter posts for rendering
  const filteredPosts = getFilteredPosts(posts, groupId);
  // console.log("Filtered posts:", filteredPosts);
  
  return (
    <div className="space-y-6">
      {/* Create Post */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={
                  currentUser?.avatar && currentUser.avatar.trim() !== ""
                    ? `${API_URL}${currentUser.avatar}`
                    : "/placeholder.svg?height=40&width=40"
                }
                alt={currentUser?.nickname || "User"}
                className="object-cover"
              />
              <AvatarFallback>
                {currentUser
                  ? currentUser.first_name?.charAt(0) +
                    currentUser.last_name?.charAt(0)
                  : "YU"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => {
                  if (e.target.value.length <= 1000) setContent(e.target.value);
                }}
                className="min-h-[100px] resize-none placeholder:text-muted-foreground"
                maxLength={1000}
              />
              <div className="text-right text-xs text-muted-foreground">
                {content.length}/1000
              </div>
              {error && (
                <div className="text-red-500 text-sm mt-1">{error}</div>
              )}
              {imagePreview && (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-40 max-h-40 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  <Button variant="ghost" size="sm" asChild>
                    <label className="cursor-pointer">
                      <Camera className="h-4 w-4 mr-2" />
                      Photo
                      <input
                        type="file"
                        accept="image/*,image/gif"
                        className="hidden"
                        onChange={handleAddPhoto}
                      />
                    </label>
                  </Button>
                  {/* Only show privacy dropdown if not a group feed */}
                  {!groupId && (
                    <select
                      value={privacy}
                      onChange={(e) => {
                        setPrivacy(e.target.value);
                        if (e.target.value !== "private")
                          setSelectedFollowers([]);
                      }}
                      className="text-xs border rounded px-2 py-1 bg-background"
                    >
                      <option value="public">Public</option>
                      <option value="semi-private">All Followers</option>
                      <option value="private">Select Followers</option>
                    </select>
                  )}
                </div>
                <Button
                  onClick={handlePost}
                  disabled={!content.trim() || submitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </div>
              {/* Show follower selection only for private and not group */}
              {!groupId && privacy === "private" && (
                <div className="ml-2">
                  <label className="block text-xs mb-1">
                    Hold Ctrl/Cmd to select multiple followers:
                  </label>
                  <select
                    multiple
                    value={selectedFollowers.map(String)}
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions);
                      setSelectedFollowers(options.map((o) => String(o.value)));
                    }}
                    className="text-xs border rounded px-1 py-1 bg-background min-w-[120px]"
                    style={{ maxHeight: 80 }}
                  >
                    {followers.map((f: any) => (
                      <option key={f.user_uuid} value={f.user_uuid}>
                        {f.nickname || f.first_name || f.user_uuid}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Posts Feed */}
      <div className="space-y-6">
        {!filteredPosts || filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No posts yet.</p>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.post_uuid}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          post.avatar && post.avatar.trim() !== ""
                            ? `${API_URL}${post.avatar}`
                            : "/placeholder.svg"
                        }
                        alt={`@${post.nickname}_avatar`}
                        className="object-cover"
                      />
                      <AvatarFallback>
                        {post.nickname?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{post.nickname}</h4>
                      <span className="text-xs text-muted-foreground">
                        Posted on {formatDateTime(post.created_at)}
                      </span>
                    </div>
                  </div>
                  {!groupId && (
                    <Badge variant="outline" className="text-xs">
                      {post.privacy}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed mb-4">{post.content}</p>
                {post.filename_new && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={`${API_URL}/uploads/${post.filename_new}`}
                      alt={`postImage_${post.filename_new}`}
                      className="mx-auto object-cover max-w-[300px] max-h-[300px]"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.post_uuid)}
                      className={post.liked ? "text-red-500" : ""}
                    >
                      <Heart
                        className={`h-4 w-4 mr-2 ${
                          post.liked ? "fill-current" : ""
                        }`}
                      />
                      {post.likes || 0}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCommentClick(post.post_uuid)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {post.comments?.length || 0}
                    </Button>
                    {/* <Button variant="ghost" size="sm">
                      <Repeat2 className="h-4 w-4 mr-2" />
                      {post.shares || 0}
                    </Button> */}
                  </div>
                  {/* <Button variant="ghost" size="sm">
                    <Share className="h-4 w-4" />
                  </Button> */}
                </div>
                {/* Comment Section */}
                {expandedPostUUID === String(post.post_uuid) && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border-t">
                    <form
                      onSubmit={(e) =>
                        handleCommentSubmit(String(post.post_uuid), e)
                      }
                      encType="multipart/form-data"
                    >
                      <div className="flex gap-3 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={
                              currentUser?.avatar &&
                              currentUser.avatar.trim() !== ""
                                ? `${API_URL}${currentUser.avatar}`
                                : "/placeholder.svg?height=32&width=32"
                            }
                            alt={currentUser?.nickname || "User"}
                            className="object-cover"
                          />
                          <AvatarFallback>
                            {currentUser
                              ? currentUser.first_name?.charAt(0) +
                                currentUser.last_name?.charAt(0)
                              : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <Textarea
                          placeholder="Write a comment..."
                          value={commentContent[post.post_uuid] || ""}
                          onChange={(e) => {
                            if (e.target.value.length <= 1000) {
                              setCommentContent((prev) => ({
                                ...prev,
                                [post.post_uuid]: e.target.value,
                              }));
                            }
                          }}
                          className="min-h-[80px] resize-none"
                          maxLength={1000}
                          required
                        />
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {commentContent[post.post_uuid]?.length || 0}/1000
                      </div>
                      {error && (
                        <div className="text-red-500 text-sm mt-1">{error}</div>
                      )}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <Button variant="ghost" size="sm" asChild>
                          <label className="cursor-pointer">
                            <Camera className="h-4 w-4 mr-2" />
                            Add Photo
                            <input
                              type="file"
                              accept="image/*,image/gif"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                setCommentImage((prev) => ({
                                  ...prev,
                                  [post.post_uuid]: file ?? null,
                                }));
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () =>
                                    setCommentImagePreview((prev) => ({
                                      ...prev,
                                      [post.post_uuid]:
                                        typeof reader.result === "string"
                                          ? reader.result
                                          : null,
                                    }));
                                  reader.readAsDataURL(file);
                                } else {
                                  setCommentImagePreview((prev) => ({
                                    ...prev,
                                    [post.post_uuid]: null,
                                  }));
                                }
                              }}
                            />
                          </label>
                        </Button>
                        {commentImagePreview &&
                          commentImagePreview[post.post_uuid] && (
                            <div className="relative">
                              <img
                                src={
                                  commentImagePreview[post.post_uuid] ??
                                  undefined
                                }
                                alt="Preview"
                                className="w-20 h-20 object-cover rounded-lg border"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                onClick={() => {
                                  setCommentImage((prev) => ({
                                    ...prev,
                                    [post.post_uuid]: null,
                                  }));
                                  setCommentImagePreview((prev) => ({
                                    ...prev,
                                    [post.post_uuid]: null,
                                  }));
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!commentContent[post.post_uuid]?.trim()}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Comment
                        </Button>
                      </div>
                    </form>
                    {/* Comments Feed */}
                    <div className="space-y-3">
                      {!post.comments || post.comments?.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          No comments yet.
                        </p>
                      ) : (
                        post.comments.map((comment) => (
                          <Card key={comment.comment_id} className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={
                                    comment.avatar &&
                                    comment.avatar.trim() !== ""
                                      ? `${API_URL}${comment.avatar}`
                                      : "/placeholder.svg"
                                  }
                                  alt={`@${comment.nickname}_avatar`}
                                  className="object-cover"
                                />
                                <AvatarFallback>
                                  {comment.nickname?.charAt(0)?.toUpperCase() ||
                                    "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-sm">
                                {comment.nickname}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(comment.created_at)}
                              </span>
                            </div>
                            <div className="pl-8">
                              <p className="text-sm">{comment.content}</p>
                              {comment.filename_new && (
                                <div className="mt-2 rounded-lg overflow-hidden">
                                  <img
                                    src={`${API_URL}/uploads/${comment.filename_new}`}
                                    alt="Comment image"
                                    className="max-w-80 max-h-80 object-cover mx-auto"
                                  />
                                </div>
                              )}
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
