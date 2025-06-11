// Mock data for groups in the social network

export const mockGroups = [
  {
    id: 1,
    title: 'Tech Enthusiasts',
    description: 'A group for people passionate about technology and innovation.',
    members: 256,
    image: 'https://picsum.photos/150',
    isPublic: true,
    creator: 'John Doe',
    createdAt: '2023-01-15'
  },
  {
    id: 2,
    title: 'Book Lovers',
    description: 'Discuss your favorite books and authors with fellow readers.',
    members: 189,
    image: 'https://picsum.photos/150',
    isPublic: false,
    creator: 'Jane Smith',
    createdAt: '2023-03-22'
  },
  {
    id: 3,
    title: 'Fitness Goals',
    description: 'Share tips, routines, and motivation for staying fit.',
    members: 312,
    image: 'https://picsum.photos/150',
    isPublic: true,
    creator: 'Mike Johnson',
    createdAt: '2023-05-10'
  },
  {
    id: 4,
    title: 'Travel Buddies',
    description: 'Plan trips and share travel experiences with others.',
    members: 145,
    image: 'https://picsum.photos/150',
    isPublic: false,
    creator: 'Emily Brown',
    createdAt: '2023-07-18'
  },
  {
    id: 5,
    title: 'Cooking Recipes',
    description: 'Exchange recipes and cooking tips with food lovers.',
    members: 203,
    image: 'https://picsum.photos/150',
    isPublic: true,
    creator: 'Alex Wilson',
    createdAt: '2023-09-05'
  }
];

// Mock data for notifications in the social network

export const mockNotifications = [
  {
    id: 1,
    type: 'friend_request',
    message: 'John Doe sent you a friend request.',
    sender: 'John Doe',
    avatar: 'https://picsum.photos/50',
    timestamp: '2023-11-01T10:30:00Z',
    status: 'pending'
  },
  {
    id: 2,
    type: 'group_invite',
    message: 'Jane Smith invited you to join the group "Book Lovers".',
    sender: 'Jane Smith',
    avatar: 'https://picsum.photos/50',
    timestamp: '2023-11-02T14:45:00Z',
    status: 'pending'
  },
  {
    id: 3,
    type: 'event',
    message: 'There is an upcoming event "Tech Meetup" in the group "Tech Enthusiasts".',
    sender: 'Tech Enthusiasts',
    avatar: 'https://picsum.photos/50',
    timestamp: '2023-11-03T09:15:00Z',
    status: 'new'
  },
  {
    id: 4,
    type: 'friend_request',
    message: 'Mike Johnson sent you a friend request.',
    sender: 'Mike Johnson',
    avatar: 'https://picsum.photos/50',
    timestamp: '2023-10-30T16:20:00Z',
    status: 'accepted'
  },
  {
    id: 5,
    type: 'group_invite',
    message: 'Emily Brown invited you to join the group "Travel Buddies".',
    sender: 'Emily Brown',
    avatar: 'https://picsum.photos/50',
    timestamp: '2023-10-29T11:10:00Z',
    status: 'declined'
  }
]; 