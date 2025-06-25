/**
 * - User and group data fetching by ID
 * - Batch user fetching for performance
 * - In-memory caching to reduce API calls
 * - Consistent avatar URL handling
 * - Helper functions for display formatting
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface UserInfo {
  user_id: number;
  user_uuid: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  privacy?: string;
  status: string;
}

export interface GroupInfo {
  group_id: number;
  title: string;
  description: string;
  avatar?: string;
  creator_id: number;
  created_at: string;
}

export interface EventInfo {
  event_id: number;
  creator_id: number;
  group_id: number;
  title: string;
  description: string;
  event_date_time: string;
  status: string;
  created_at: string;
}

export interface EventWithDetails extends EventInfo {
  creator?: UserInfo;
  group?: GroupInfo;
  user_rsvp?: string; // "going" | "not_going" | null
}

// Cache to avoid duplicate API calls
const userCache = new Map<number, UserInfo>();
const groupCache = new Map<number, GroupInfo>();

/**
 * Fetch user information by user ID
 */
export async function getUserById(userId: number): Promise<UserInfo | null> {
  // Check cache first
  if (userCache.has(userId)) {
    return userCache.get(userId)!;
  }

  try {
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch user ${userId}: ${response.status}`);
      return null;
    }

    const user: UserInfo = await response.json();
    userCache.set(userId, user);
    return user;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
}

/**
 * Fetch multiple users by their IDs
 */
export async function getUsersByIds(userIds: number[]): Promise<Map<number, UserInfo>> {
  const result = new Map<number, UserInfo>();
  const uncachedIds: number[] = [];

  // Check cache first
  for (const id of userIds) {
    if (userCache.has(id)) {
      result.set(id, userCache.get(id)!);
    } else {
      uncachedIds.push(id);
    }
  }

  // Fetch uncached users
  if (uncachedIds.length > 0) {
    try {
      const response = await fetch(`${API_URL}/api/users/batch`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ids: uncachedIds }),
      });

      if (response.ok) {
        const users: UserInfo[] = await response.json();
        for (const user of users) {
          userCache.set(user.user_id, user);
          result.set(user.user_id, user);
        }
      } else {
        // Fallback to individual requests if batch endpoint doesn't exist
        for (const id of uncachedIds) {
          const user = await getUserById(id);
          if (user) {
            result.set(id, user);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching users in batch:', error);
      // Fallback to individual requests
      for (const id of uncachedIds) {
        const user = await getUserById(id);
        if (user) {
          result.set(id, user);
        }
      }
    }
  }

  return result;
}

/**
 * Fetch group information by group ID
 */
export async function getGroupById(groupId: number): Promise<GroupInfo | null> {
  // Check cache first
  if (groupCache.has(groupId)) {
    return groupCache.get(groupId)!;
  }

  try {
    const response = await fetch(`${API_URL}/api/groups/${groupId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch group ${groupId}: ${response.status}`);
      return null;
    }

    const responseData = await response.json();
    const group: GroupInfo = responseData.group || responseData;
    groupCache.set(groupId, group);
    return group;
  } catch (error) {
    console.error(`Error fetching group ${groupId}:`, error);
    return null;
  }
}

/**
 * Clear caches (useful for testing or when data might be stale)
 */
export function clearCaches() {
  userCache.clear();
  groupCache.clear();
}

/**
 * Helper function to format user display name
 */
export function formatUserName(user: UserInfo): string {
  if (!user) {
    return "Unknown User";
  }
  return user.nickname || `${user.first_name} ${user.last_name}`;
}

/**
 * Helper function to get user avatar URL
 */
export function getUserAvatarUrl(user: UserInfo): string {
  if (!user) {
    return "/placeholder.svg";
  }
  if (user.avatar) {
    return user.avatar.startsWith('http') 
      ? user.avatar 
      : `${API_URL}${user.avatar}`;
  }
  return "/placeholder.svg";
}

/**
 * Helper function to get group avatar URL
 */
export function getGroupAvatarUrl(group: GroupInfo): string {
  if (!group) {
    return "/placeholder.svg";
  }
  if (group.avatar) {
    return group.avatar.startsWith('http') 
      ? group.avatar 
      : `${API_URL}${group.avatar}`;
  }
  return "/placeholder.svg";
}

/**
 * Helper function to get group avatar fallback initials
 */
export function getGroupAvatarFallback(group: GroupInfo): string {
  if (!group || !group.title) {
    return "GR"; // Default fallback
  }
  return group.title
    .split(" ")
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Fetch all events from groups that the user is a member of
 */
export async function getUserEvents(): Promise<EventInfo[]> {
  try {
    const response = await fetch(`${API_URL}/api/events`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch user events: ${response.status}`);
      return [];
    }

    const events: EventInfo[] = await response.json();
    return events;
  } catch (error) {
    console.error('Error fetching user events:', error);
    return [];
  }
}

/**
 * Enrich events with creator and group details
 */
export async function enrichEvents(events: EventInfo[]): Promise<EventWithDetails[]> {
  // Get unique creator and group IDs
  const creatorIds = Array.from(new Set(events.map(e => e.creator_id)));
  const groupIds = Array.from(new Set(events.map(e => e.group_id)));

  // Fetch creators and groups in parallel
  const [creators, groups] = await Promise.all([
    getUsersByIds(creatorIds),
    Promise.all(groupIds.map(id => getGroupById(id))).then(results => 
      new Map(results.filter(g => g !== null).map(g => [g!.group_id, g!]))
    )
  ]);

  // Enrich events with creator and group details
  return events.map(event => ({
    ...event,
    creator: creators.get(event.creator_id),
    group: groups.get(event.group_id),
  }));
}

/**
 * Submit RSVP response for an event
 */
export async function respondToEvent(eventId: number, response: "going" | "not_going"): Promise<boolean> {
  try {
    const apiResponse = await fetch(`${API_URL}/api/events/${eventId}/rsvp`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response: response
      }),
    });

    return apiResponse.ok;
  } catch (error) {
    console.error('Error submitting RSVP:', error);
    return false;
  }
}

/**
 * Get user's RSVP status for an event
 */
export async function getUserEventRSVP(eventId: number): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/api/events/${eventId}/rsvps`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const rsvps = await response.json();
    // This would need to be implemented in the backend to filter by current user
    // For now, we'll return null and handle RSVP state in the frontend
    return null;
  } catch (error) {
    console.error('Error fetching RSVP status:', error);
    return null;
  }
}