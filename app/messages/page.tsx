"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from '@/contexts/AuthContext';
import { validateRegister } from '@/utils/validate';
import { registerUser } from '@/lib/auth';

/* type ChatMessage struct {
	ChatID     int        `json:"chat_id"`
	SenderID   int        `json:"sender_id"`
	ReceiverID int        `json:"receiver_id"` // Null for group chats
	GroupID    int        `json:"group_id"`    // Null for private chats
	Content    string     `json:"content"`
	Status     string     `json:"status"` // active, inactive
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  *time.Time `json:"updated_at"`
	UpdaterID  int        `json:"updater_id"`
} */

export default function MessagePage() {
    const router = useRouter();
    return <div><div>Messages will be here...</div>
    <a href="/messages/individual">Individual chats</a>
    <a href="/messages/group">Group chats</a></div>
}
