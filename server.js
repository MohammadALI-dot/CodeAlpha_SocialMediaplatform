const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// In-memory database (replace with real database in production)
let users = [
  { id: 1, username: 'john_doe', email: 'john@example.com', bio: 'Tech enthusiast', avatar: '👨‍💻' },
  { id: 2, username: 'jane_smith', email: 'jane@example.com', bio: 'Designer & Creator', avatar: '🎨' },
  { id: 3, username: 'mike_dev', email: 'mike@example.com', bio: 'Full-stack developer', avatar: '💻' }
];

let posts = [
  { id: 1, userId: 1, content: 'Just finished building my first React app! 🚀', timestamp: new Date('2024-01-15T10:30:00'), likes: 5 },
  { id: 2, userId: 2, content: 'Working on some amazing UI designs today ✨', timestamp: new Date('2024-01-15T14:20:00'), likes: 8 },
  { id: 3, userId: 3, content: 'Coffee + Code = Perfect Monday morning ☕', timestamp: new Date('2024-01-16T09:15:00'), likes: 3 }
];

let comments = [
  { id: 1, postId: 1, userId: 2, content: 'Awesome work! Keep it up!', timestamp: new Date('2024-01-15T11:00:00') },
  { id: 2, postId: 1, userId: 3, content: 'React is amazing, great choice!', timestamp: new Date('2024-01-15T11:30:00') }
];

let followers = [
  { followerId: 1, followingId: 2 },
  { followerId: 2, followingId: 3 },
  { followerId: 3, followingId: 1 }
];

let likes = [
  { userId: 1, postId: 2 },
  { userId: 2, postId: 1 },
  { userId: 3, postId: 1 }
];

// Helper functions
const getUserById = (id) => users.find(user => user.id === parseInt(id));
const getPostById = (id) => posts.find(post => post.id === parseInt(id));
const getUserPosts = (userId) => posts.filter(post => post.userId === parseInt(userId));
const getPostComments = (postId) => comments.filter(comment => comment.postId === parseInt(postId));
const getFollowers = (userId) => followers.filter(f => f.followingId === parseInt(userId));
const getFollowing = (userId) => followers.filter(f => f.followerId === parseInt(userId));
const isLiked = (userId, postId) => likes.some(like => like.userId === parseInt(userId) && like.postId === parseInt(postId));

// Routes

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes

// Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const userPosts = getUserPosts(user.id);
  const followerCount = getFollowers(user.id).length;
  const followingCount = getFollowing(user.id).length;
  
  res.json({
    ...user,
    posts: userPosts,
    followers: followerCount,
    following: followingCount
  });
});

// Create new user
app.post('/api/users', (req, res) => {
  const { username, email, bio, avatar } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }
  
  const newUser = {
    id: users.length + 1,
    username,
    email,
    bio: bio || '',
    avatar: avatar || '👤'
  };
  
  users.push(newUser);
  res.status(201).json(newUser);
});

// Get all posts with user info and comments
app.get('/api/posts', (req, res) => {
  const postsWithDetails = posts.map(post => {
    const user = getUserById(post.userId);
    const postComments = getPostComments(post.id).map(comment => ({
      ...comment,
      user: getUserById(comment.userId)
    }));
    
    return {
      ...post,
      user,
      comments: postComments,
      likesCount: likes.filter(like => like.postId === post.id).length
    };
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json(postsWithDetails);
});

// Create new post
app.post('/api/posts', (req, res) => {
  const { userId, content } = req.body;
  
  if (!userId || !content) {
    return res.status(400).json({ error: 'User ID and content are required' });
  }
  
  const user = getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const newPost = {
    id: posts.length + 1,
    userId: parseInt(userId),
    content,
    timestamp: new Date(),
    likes: 0
  };
  
  posts.push(newPost);
  res.status(201).json(newPost);
});

// Add comment to post
app.post('/api/posts/:postId/comments', (req, res) => {
  const { userId, content } = req.body;
  const postId = parseInt(req.params.postId);
  
  if (!userId || !content) {
    return res.status(400).json({ error: 'User ID and content are required' });
  }
  
  const post = getPostById(postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  const user = getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const newComment = {
    id: comments.length + 1,
    postId,
    userId: parseInt(userId),
    content,
    timestamp: new Date()
  };
  
  comments.push(newComment);
  res.status(201).json(newComment);
});

// Like/Unlike post
app.post('/api/posts/:postId/like', (req, res) => {
  const { userId } = req.body;
  const postId = parseInt(req.params.postId);
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const post = getPostById(postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  const existingLike = likes.find(like => like.userId === parseInt(userId) && like.postId === postId);
  
  if (existingLike) {
    // Unlike
    likes = likes.filter(like => !(like.userId === parseInt(userId) && like.postId === postId));
    res.json({ liked: false, message: 'Post unliked' });
  } else {
    // Like
    likes.push({ userId: parseInt(userId), postId });
    res.json({ liked: true, message: 'Post liked' });
  }
});

// Follow/Unfollow user
app.post('/api/users/:userId/follow', (req, res) => {
  const { followerId } = req.body;
  const followingId = parseInt(req.params.userId);
  
  if (!followerId) {
    return res.status(400).json({ error: 'Follower ID is required' });
  }
  
  if (parseInt(followerId) === followingId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  
  const userToFollow = getUserById(followingId);
  const followerUser = getUserById(followerId);
  
  if (!userToFollow || !followerUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const existingFollow = followers.find(f => f.followerId === parseInt(followerId) && f.followingId === followingId);
  
  if (existingFollow) {
    // Unfollow
    followers = followers.filter(f => !(f.followerId === parseInt(followerId) && f.followingId === followingId));
    res.json({ following: false, message: 'User unfollowed' });
  } else {
    // Follow
    followers.push({ followerId: parseInt(followerId), followingId });
    res.json({ following: true, message: 'User followed' });
  }
});

// Check if user is following another user
app.get('/api/users/:userId/following/:targetUserId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const targetUserId = parseInt(req.params.targetUserId);
  
  const isFollowing = followers.some(f => f.followerId === userId && f.followingId === targetUserId);
  res.json({ following: isFollowing });
});

// Get user's feed (posts from followed users)
app.get('/api/users/:userId/feed', (req, res) => {
  const userId = parseInt(req.params.userId);
  const following = getFollowing(userId);
  const followingIds = following.map(f => f.followingId);
  followingIds.push(userId); // Include own posts
  
  const feedPosts = posts.filter(post => followingIds.includes(post.userId))
    .map(post => {
      const user = getUserById(post.userId);
      const postComments = getPostComments(post.id).map(comment => ({
        ...comment,
        user: getUserById(comment.userId)
      }));
      
      return {
        ...post,
        user,
        comments: postComments,
        likesCount: likes.filter(like => like.postId === post.id).length,
        isLiked: isLiked(userId, post.id)
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json(feedPosts);
});

// Start server
app.listen(PORT, () => {
  console.log(`Social Media App running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET /api/users - Get all users');
  console.log('- GET /api/users/:id - Get user by ID');
  console.log('- POST /api/users - Create new user');
  console.log('- GET /api/posts - Get all posts');
  console.log('- POST /api/posts - Create new post');
  console.log('- POST /api/posts/:postId/comments - Add comment');
  console.log('- POST /api/posts/:postId/like - Like/unlike post');
  console.log('- POST /api/users/:userId/follow - Follow/unfollow user');
  console.log('- GET /api/users/:userId/feed - Get user feed');
});

module.exports = app;