"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Upload } from "lucide-react"

interface CreateGroupDialogProps {
  onCreateGroup: (groupData: {
    name: string
    description: string
    avatar?: string
    isPrivate: boolean
  }) => Promise<void>
}

export function CreateGroupDialog({ onCreateGroup }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatar: "",
    isPrivate: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.description.trim()) return

    setIsLoading(true)
    try {
      await onCreateGroup(formData)
      setFormData({ name: "", description: "", avatar: "", isPrivate: false })
      setOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData((prev) => ({ ...prev, avatar: e.target?.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </PopoverTrigger>
      <PopoverContent className="sm:max-w-md">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Create New Group</h3>
          <p className="text-sm text-muted-foreground">Create a group to connect with people who share your interests.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={formData.avatar || "/placeholder.svg"} alt="Group avatar" />
              <AvatarFallback>
                {formData.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Label htmlFor="group-avatar" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <Upload className="h-4 w-4" />
                Upload Group Image
              </div>
              <Input
                id="group-avatar"
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what your group is about"
              rows={3}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="private-group"
              checked={formData.isPrivate}
              onChange={(e) => setFormData((prev) => ({ ...prev, isPrivate: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="private-group">Private Group</Label>
          </div>
          <p className="text-sm text-muted-foreground">Private groups require approval to join</p>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
} 