"use client";

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

interface Post {
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

export function Feed({ currentUser }: { currentUser: any }) {
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState("public");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedPostUUID, setExpandedPostUUID] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<number, any[]>>(
    {}
  );
  const [commentContent, setCommentContent] = useState<Record<string, string>>(
    {}
  );
  const [commentImage, setCommentImage] = useState<Record<string, File | null>>(
    {}
  );
  const [commentImagePreview, setCommentImagePreview] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8080/api/getfeedposts", {
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
    };
    fetchPosts();
  }, []);

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
    const sanitizedContent = sanitize(content);
    const formData = new FormData();
    formData.append("content", sanitizedContent);
    formData.append("privacy", privacy);
    if (image) formData.append("file", image);

    try {
      const res = await fetch("http://localhost:8080/api/createposts", {
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

      // Refresh posts
      const postsRes = await fetch("http://localhost:8080/api/getfeedposts", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (postsRes.ok) {
        const posts = await postsRes.json();
        setPosts(posts);
      }
    } catch (err) {
      alert("Error creating post: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentClick = async (postUUID: string) => {
    if (expandedPostUUID === postUUID) {
      setExpandedPostUUID(null); // Collapse if already open
      return;
    }
    // Fetch comments only if not already fetched
    if (!commentsByPost[Number(postUUID)]) {
      const res = await fetch(
        `http://localhost:8080/api/getcomments/${postUUID}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) throw new Error(`Failed to fetch comments: ${res.status}`);
      const comments = await res.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postUUID]: comments,
      }));
    }
    setExpandedPostUUID(postUUID);
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

    try {
      const res = await fetch("http://localhost:8080/api/createcomment", {
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

      // Refresh comments for this post
      const commentsRes = await fetch(
        `http://localhost:8080/api/getcomments/${postUUID}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!commentsRes.ok)
        throw new Error(`Failed to fetch comments: ${commentsRes.status}`);
      const comments = await commentsRes.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postUUID]: comments,
      }));

      // Update the comment count in the posts state
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.post_uuid === postUUID
            ? {
                ...post,
                comments: comments, // Update with fresh comments array
              }
            : post
        )
      );
    } catch (err) {
      alert(
        "Error creating comment: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading feed...</p>
      </div>
    );
  }
  console.log("Posts fetched:", posts);
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
                    ? `http://localhost:8080${currentUser.avatar}`
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
                  if (e.target.value.length <= 3000) setContent(e.target.value);
                }}
                className="min-h-[100px] resize-none border-0 p-0 text-lg placeholder:text-muted-foreground focus-visible:ring-0"
                maxLength={3000}
              />
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
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value)}
                    className="text-sm border rounded px-2 py-1 bg-background"
                  >
                    <option value="public">Public</option>
                    <option value="semiprivate">Semiprivate</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <Button
                  onClick={handlePost}
                  disabled={!content.trim() || submitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Posts Feed */}
      <div className="space-y-6">
        {!posts || posts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No posts yet.</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.post_uuid}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          post.avatar && post.avatar.trim() !== ""
                            ? `http://localhost:8080${post.avatar}`
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
                      <p className="text-sm text-muted-foreground">
                        @{post.nickname} · {formatDateTime(post.created_at)}
                      </p>
                    </div>
                  </div>
                  {/* <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Save post</DropdownMenuItem>
                      <DropdownMenuItem>Report</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu> */}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed mb-4">{post.content}</p>
                {post.filename_new && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={`http://localhost:8080/uploads/${post.filename_new}`}
                      alt={`postImage_${post.filename_new}`}
                      className="w-full max-w-md object-cover mx-auto"
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
                                ? `http://localhost:8080${currentUser.avatar}`
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
                            if (e.target.value.length <= 3000) {
                              setCommentContent((prev) => ({
                                ...prev,
                                [post.post_uuid]: e.target.value,
                              }));
                            }
                          }}
                          className="min-h-[80px] resize-none"
                          maxLength={3000}
                          required
                        />
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
                                      ? `http://localhost:8080${comment.avatar}`
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
                              <span className="font-medium text-sm">
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
                                    src={`http://localhost:8080/uploads/${comment.filename_new}`}
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
