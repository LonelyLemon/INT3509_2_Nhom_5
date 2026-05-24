import { create } from 'zustand';
import { api } from '../lib/api';

export interface Author {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface Comment {
  id: string;
  content: string;
  post_id: string;
  author_id: string;       // now returned by backend — used for owner checks
  author: Author;
  parent_id: string | null; // now returned by backend — used for reply threading
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;       // now returned by backend — used for owner checks
  author: Author;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface BlogState {
  posts: Post[];
  currentPost: Post | null;
  comments: Comment[];
  isLoadingPosts: boolean;
  isLoadingPost: boolean;
  isLoadingComments: boolean;
  isSubmitting: boolean;
  error: string | null;

  fetchPosts: () => Promise<void>;
  fetchPost: (postId: string) => Promise<void>;
  createPost: (title: string, content: string) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;

  fetchComments: (postId: string) => Promise<void>;
  createComment: (postId: string, content: string, parentId?: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;

  clearError: () => void;
}

export const useBlogStore = create<BlogState>((set) => ({
  posts: [],
  currentPost: null,
  comments: [],
  isLoadingPosts: false,
  isLoadingPost: false,
  isLoadingComments: false,
  isSubmitting: false,
  error: null,

  fetchPosts: async () => {
    set({ isLoadingPosts: true, error: null });
    try {
      const res = await api.get<Post[]>('/blog/posts');
      set({ posts: res.data });
    } catch {
      set({ error: 'Failed to load posts.' });
    } finally {
      set({ isLoadingPosts: false });
    }
  },

  fetchPost: async (postId) => {
    set({ isLoadingPost: true, error: null, currentPost: null });
    try {
      const res = await api.get<Post>(`/blog/posts/${postId}`);
      set({ currentPost: res.data });
    } catch {
      set({ error: 'Post not found.' });
    } finally {
      set({ isLoadingPost: false });
    }
  },

  createPost: async (title, content) => {
    set({ isSubmitting: true, error: null });
    try {
      const res = await api.post<Post>('/blog/posts', { title, content });
      set((state) => ({ posts: [res.data, ...state.posts] }));
      return res.data;
    } catch {
      set({ error: 'Failed to create post.' });
      throw new Error('Failed to create post');
    } finally {
      set({ isSubmitting: false });
    }
  },

  deletePost: async (postId) => {
    try {
      await api.delete(`/blog/posts/${postId}`);
      set((state) => ({ posts: state.posts.filter((p) => p.id !== postId) }));
    } catch {
      set({ error: 'Failed to delete post.' });
    }
  },

  fetchComments: async (postId) => {
    set({ isLoadingComments: true });
    try {
      const res = await api.get<Comment[]>(`/blog/posts/${postId}/comments`);
      set({ comments: res.data });
    } catch {
      set({ error: 'Failed to load comments.' });
    } finally {
      set({ isLoadingComments: false });
    }
  },

  createComment: async (postId, content, parentId) => {
    set({ isSubmitting: true });
    try {
      const res = await api.post<Comment>(`/blog/posts/${postId}/comments`, {
        content,
        parent_id: parentId ?? null,
      });
      set((state) => ({ comments: [...state.comments, res.data] }));
    } catch {
      set({ error: 'Failed to post comment.' });
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteComment: async (postId, commentId) => {
    try {
      await api.delete(`/blog/posts/${postId}/comments/${commentId}`);
      set((state) => ({
        // Remove the comment itself AND any child replies referencing it
        comments: state.comments.filter(
          (c) => c.id !== commentId && c.parent_id !== commentId
        ),
      }));
    } catch {
      set({ error: 'Failed to delete comment.' });
    }
  },

  clearError: () => set({ error: null }),
}));
