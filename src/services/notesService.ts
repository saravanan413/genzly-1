import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getFollowing, getFollowers } from './follow/followQueries';

export interface Note {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  createdAt: Date;
  expiresAt: Date;
}

// Get mutual followers (users who follow each other)
const getMutualFollowers = async (userId: string): Promise<string[]> => {
  try {
    const [following, followers] = await Promise.all([
      getFollowing(userId),
      getFollowers(userId)
    ]);

    const followingIds = new Set(following.map(f => f.followedId));
    const followerIds = new Set(followers.map(f => f.followerId));

    // Find mutual followers (users in both lists)
    const mutuals = [...followingIds].filter(id => followerIds.has(id));
    
    return mutuals;
  } catch (error) {
    console.error('Error getting mutual followers:', error);
    return [];
  }
};

// Create a new note
export const createNote = async (userId: string, text: string): Promise<void> => {
  try {
    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const mutualFollowers = await getMutualFollowers(userId);

    // Calculate expiry time (24 hours from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Delete existing note if any
    await deleteUserNotes(userId);

    // Create new note
    await addDoc(collection(db, 'notes'), {
      userId,
      username: userData.username || 'Unknown',
      userAvatar: userData.avatar || null,
      text,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      visibleTo: [userId, ...mutualFollowers] // Include self and mutual followers
    });
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
};

// Delete user's notes
const deleteUserNotes = async (userId: string): Promise<void> => {
  try {
    const notesQuery = query(
      collection(db, 'notes'),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(notesQuery);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting user notes:', error);
    throw error;
  }
};

// Delete a specific note
export const deleteNote = async (userId: string, noteId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'notes', noteId));
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};

// Subscribe to notes visible to current user
export const subscribeToNotes = (
  userId: string,
  callback: (notes: Note[]) => void
): (() => void) => {
  const notesQuery = query(
    collection(db, 'notes'),
    where('visibleTo', 'array-contains', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(notesQuery, (snapshot) => {
    const now = new Date();
    const notes: Note[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate();
      
      // Filter out expired notes
      if (expiresAt && expiresAt > now) {
        notes.push({
          id: doc.id,
          userId: data.userId,
          username: data.username,
          userAvatar: data.userAvatar,
          text: data.text,
          createdAt: data.createdAt?.toDate() || new Date(),
          expiresAt: expiresAt
        });
      }
    });

    callback(notes);
  }, (error) => {
    console.error('Error in notes subscription:', error);
    callback([]);
  });
};