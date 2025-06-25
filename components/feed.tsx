"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { sanitize } from "@/utils/sanitize";
import { formatDateTime } from "@/utils/formatDate";


interface Comment {
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
}

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
  comments?: Comment[];
}

// Reusable Avatar component
const UserAvatar = ({ user, size = "md" }: { user: any; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-10 w-10"
  };

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarImage
        src={user?.avatar?.trim() ? `${API_URL}${user.avatar}` : "/placeholder.svg"}
        alt={`@${user?.nickname || 'User'}_avatar`}
        className="object-cover"
      />
      <AvatarFallback>
        {user?.nickname?.charAt(0)?.toUpperCase() || 
         (user?.first_name?.charAt(0) + user?.last_name?.charAt(0)) || "U"}
      </AvatarFallback>
    </Avatar>
  );
};

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
  const [commentContent, setCommentContent] = useState<Record<string, string>>({});
  const [commentImage, setCommentImage] = useState<Record<string, File | null>>({});
  const [commentImagePreview, setCommentImagePreview] = useState<Record<string, string | null>>({});
  const [followers, setFollowers] = useState<any[]>([]);
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const postsUrl = groupId ? `${API_URL}/api/getgroupposts/${groupId}` : `${API_URL}/api/getfeedposts`;
  const filteredPosts = groupId 
    ? posts.filter(post => post.group_id === Number(groupId))
    : posts.filter(post => !post.group_id);

  const fetchPosts = async () => {
    try {
      const res = await fetch(postsUrl, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const posts = await res.json();
        setPosts(posts);
      }
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await fetchPosts();

        // Fetch followers only for non-group feeds
        if (!groupId) {
          const followersResponse = await fetch(`${API_URL}/api/followers/${currentUser.user_uuid}`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
          const followersData = await followersResponse.json();
          setFollowers(followersData.success ? followersData.followers || [] : []);
        }
      } catch {
        setPosts([]);
        setFollowers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, groupId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, postUUID?: string) => {
    const file = e.target.files?.[0];
    
    if (postUUID) {
      setCommentImage(prev => ({ ...prev, [postUUID]: file || null }));
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setCommentImagePreview(prev => ({ 
          ...prev, [postUUID]: reader.result as string 
        }));
        reader.readAsDataURL(file);
      } else {
        setCommentImagePreview(prev => ({ ...prev, [postUUID]: null }));
      }
    } else {
      setImage(file || null);
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    }
  };

  const removeImage = (postUUID?: string) => {
    if (postUUID) {
      setCommentImage(prev => ({ ...prev, [postUUID]: null }));
      setCommentImagePreview(prev => ({ ...prev, [postUUID]: null }));
    } else {
      setImage(null);
      setImagePreview(null);
    }
  };

  const resetForm = () => {
    setContent("");
    setImage(null);
    setImagePreview(null);
    setPrivacy("public");
    setSelectedFollowers([]);
    setError(null);
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

    const formData = new FormData();
    formData.append("content", sanitize(content));
    
    if (groupId) {
      formData.append("privacy", "semi-private");
      formData.append("group_id", String(groupId));
      formData.append("selectedFollowers", JSON.stringify(groupMembers.map((m: any) => m.user.user_uuid)));
    } else {
      formData.append("privacy", privacy);
      if (privacy === "semi-private") {
        formData.append("selectedFollowers", JSON.stringify(followers.map((f: any) => f.user_uuid)));
      } else if (privacy === "private") {
        formData.append("selectedFollowers", JSON.stringify(selectedFollowers));
      }
    }
    
    if (image) formData.append("file", image);

    try {
      const res = await fetch(`${API_URL}/api/createposts`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to create post: ${res.status}`);

      resetForm();
      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error && err.message.includes("Content too long") 
        ? "Content is too long. Maximum is 1000 characters."
        : "Error creating post: " + (err as Error).message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async (postUUID: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const content = commentContent[postUUID];
    if (!content?.trim()) return;

    const formData = new FormData();
    formData.append("post_uuid", postUUID);
    formData.append("content", content);
    if (commentImage[postUUID]) formData.append("file", commentImage[postUUID]);
    if (groupId) formData.append("group_id", String(groupId));

    try {
      const res = await fetch(`${API_URL}/api/createcomment`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error(`Failed to create comment: ${res.status}`);

      // Reset comment form
      setCommentContent(prev => ({ ...prev, [postUUID]: "" }));
      setCommentImage(prev => ({ ...prev, [postUUID]: null }));
      setCommentImagePreview(prev => ({ ...prev, [postUUID]: null }));

      await fetchPosts();
    } catch (err) {
      alert("Error creating comment: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const toggleComments = (postUUID: string) => {
    setExpandedPostUUID(expandedPostUUID === postUUID ? null : postUUID);
  };

  if (!currentUser) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Please log in to view your feed.</p>
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

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <UserAvatar user={currentUser} size="lg" />
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => e.target.value.length <= 1000 && setContent(e.target.value)}
                className="min-h-[100px] resize-none placeholder:text-muted-foreground break-all"
                maxLength={1000}
              />
              <div className="text-right text-xs text-muted-foreground">
                {content.length}/1000
              </div>
              {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
              
              {imagePreview && (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-w-40 max-h-40 object-cover rounded-lg border" />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => removeImage()}
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
                        onChange={(e) => handleImageChange(e)}
                      />
                    </label>
                  </Button>
                  
                  {!groupId && (
                    <select
                      value={privacy}
                      onChange={(e) => {
                        setPrivacy(e.target.value);
                        if (e.target.value !== "private") setSelectedFollowers([]);
                      }}
                      className="text-xs border rounded px-2 py-1 bg-background"
                    >
                      <option value="public">Public</option>
                      <option value="semi-private">All Followers</option>
                      <option value="private">Select Followers</option>
                    </select>
                  )}
                </div>
                
                <Button onClick={handlePost} disabled={!content.trim() || submitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </div>
              
              {!groupId && privacy === "private" && (
                <div className="ml-2">
                  <label className="block text-xs mb-1">Hold Ctrl/Cmd to select multiple followers:</label>
                  <select
                    multiple
                    value={selectedFollowers}
                    onChange={(e) => setSelectedFollowers(Array.from(e.target.selectedOptions, o => o.value))}
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
        {filteredPosts.length === 0 ? (
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
                    <UserAvatar user={post} size="lg" />
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
                <p className="text-sm leading-relaxed mb-4 break-all whitespace-pre-wrap">{post.content}</p>
                
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
                  <Button variant="ghost" size="sm" onClick={() => toggleComments(post.post_uuid)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {post.comments?.length || 0}
                  </Button>
                </div>

                {/* Comment Section */}
                {expandedPostUUID === post.post_uuid && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border-t">
                    <form onSubmit={(e) => handleCommentSubmit(post.post_uuid, e)}>
                      <div className="flex gap-3 mb-4">
                        <UserAvatar user={currentUser} size="md" />
                        <Textarea
                          placeholder="Write a comment..."
                          value={commentContent[post.post_uuid] || ""}
                          onChange={(e) => e.target.value.length <= 1000 && setCommentContent(prev => ({
                            ...prev,
                            [post.post_uuid]: e.target.value,
                          }))}
                          className="min-h-[80px] resize-none placeholder:text-muted-foreground break-all"
                          maxLength={1000}
                          required
                        />
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground">
                        {commentContent[post.post_uuid]?.length || 0}/1000
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <Button variant="ghost" size="sm" asChild>
                          <label className="cursor-pointer">
                            <Camera className="h-4 w-4 mr-2" />
                            Add Photo
                            <input
                              type="file"
                              accept="image/*,image/gif"
                              className="hidden"
                              onChange={(e) => handleImageChange(e, post.post_uuid)}
                            />
                          </label>
                        </Button>
                        
                        {commentImagePreview[post.post_uuid] && (
                          <div className="relative">
                            <img
                              src={commentImagePreview[post.post_uuid]!}
                              alt="Preview"
                              className="w-20 h-20 object-cover rounded-lg border"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={() => removeImage(post.post_uuid)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        
                        <Button type="submit" size="sm" disabled={!commentContent[post.post_uuid]?.trim()}>
                          <Send className="h-4 w-4 mr-2" />
                          Comment
                        </Button>
                      </div>
                    </form>

                    {/* Comments List */}
                    <div className="space-y-3">
                      {!post.comments?.length ? (
                        <p className="text-center text-muted-foreground py-4">No comments yet.</p>
                      ) : (
                        post.comments.map((comment) => (
                          <Card key={comment.comment_id} className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <UserAvatar user={comment} size="sm" />
                              <span className="font-semibold text-sm">{comment.nickname}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(comment.created_at)}
                              </span>
                            </div>
                            <div className="pl-8">
                              <p className="text-sm leading-relaxed mb-4 break-all whitespace-pre-wrap">
                                {comment.content}
                              </p>
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
