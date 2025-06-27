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

// DEPRECATED: Mock notifications removed - using real notification system
// All notification data now comes from the backend API 