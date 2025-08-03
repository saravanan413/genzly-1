
import { 
  doc, 
  writeBatch,
  serverTimestamp,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { sendFollowRequest, cancelFollowRequest } from '../privacy/privacyService';

export const followUser = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) {
    console.log('Cannot follow yourself');
    return false;
  }

  try {
    console.log('Starting follow operation:', { currentUserId, targetUserId });
    
    // Get user profiles first to ensure they exist
    const [currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', currentUserId)),
      getDoc(doc(db, 'users', targetUserId))
    ]);
    
    if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
      console.error('User documents not found:', {
        currentUserExists: currentUserDoc.exists(),
        targetUserExists: targetUserDoc.exists()
      });
      return false;
    }

    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();

    // Check if target user has private account
    if (targetUserData.isPrivate) {
      console.log('Target user has private account, sending follow request');
      return await sendFollowRequest(currentUserId, targetUserId);
    }

    console.log('User data loaded, proceeding with follow operation');

    // Use batch write for atomic operations
    const batch = writeBatch(db);

    try {
      // Create document at /users/{targetUserId}/followers/{currentUserId}
      const followersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
      batch.set(followersRef, {
        uid: currentUserId,
        username: currentUserData.username || 'Unknown',
        displayName: currentUserData.displayName || 'Unknown User',
        avatar: currentUserData.avatar || null,
        timestamp: serverTimestamp()
      });

      // Create document at /users/{currentUserId}/following/{targetUserId}
      const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
      batch.set(followingRef, {
        uid: targetUserId,
        username: targetUserData.username || 'Unknown',
        displayName: targetUserData.displayName || 'Unknown User',
        avatar: targetUserData.avatar || null,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      console.log('Follow operation completed successfully');
      return true;
    } catch (firestoreError: any) {
      console.error('Firestore permission or write error during follow:', {
        code: firestoreError.code,
        message: firestoreError.message,
        currentUserId,
        targetUserId
      });
      
      // Handle specific Firestore errors
      if (firestoreError.code === 'permission-denied') {
        console.error('Permission denied - check Firestore rules for follow operation');
      } else if (firestoreError.code === 'not-found') {
        console.error('Document not found during follow operation');
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) {
    console.error('Cannot unfollow yourself');
    return false;
  }

  try {
    console.log('Starting unfollow operation:', { currentUserId, targetUserId });
    
    // Check if this is a follow request that needs to be cancelled
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
    if (targetUserDoc.exists() && targetUserDoc.data().isPrivate) {
      console.log('Target user is private, cancelling follow request');
      await cancelFollowRequest(currentUserId, targetUserId);
    }
    
    // Define the document references we need to check and potentially delete
    const followersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    
    console.log('Checking document existence...');

    // Check if the documents exist before trying to delete them
    const [followersDoc, followingDoc] = await Promise.all([
      getDoc(followersRef),
      getDoc(followingRef)
    ]);

    console.log('Document existence check results:', {
      followersDocExists: followersDoc.exists(),
      followingDocExists: followingDoc.exists()
    });

    // Use batch write for atomic operations
    const batch = writeBatch(db);
    let hasOperations = false;

    try {
      // Delete from followers if it exists
      if (followersDoc.exists()) {
        console.log('Adding followers deletion to batch');
        batch.delete(followersRef);
        hasOperations = true;
      }
      
      // Delete from following if it exists
      if (followingDoc.exists()) {
        console.log('Adding following deletion to batch');
        batch.delete(followingRef);
        hasOperations = true;
      }

      if (hasOperations) {
        console.log('Committing batch operations...');
        await batch.commit();
        console.log('Unfollow operation completed successfully');
        return true;
      } else {
        console.log('No follow relationship found to remove');
        return true; // Not an error - they weren't following anyway
      }
    } catch (firestoreError: any) {
      console.error('Firestore permission or write error during unfollow:', {
        code: firestoreError.code,
        message: firestoreError.message,
        currentUserId,
        targetUserId
      });
      
      // Handle specific Firestore errors
      if (firestoreError.code === 'permission-denied') {
        console.error('Permission denied - check Firestore rules for unfollow operation');
      } else if (firestoreError.code === 'not-found') {
        console.error('Document not found during unfollow operation');
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
};

export const removeFollower = async (currentUserId: string, followerUserId: string) => {
  if (currentUserId === followerUserId) {
    console.error('Cannot remove yourself as follower');
    return false;
  }

  try {
    console.log('Starting remove follower operation:', { currentUserId, followerUserId });
    
    // Define the document references we need to check and potentially delete
    const followersRef = doc(db, 'users', currentUserId, 'followers', followerUserId);
    const followingRef = doc(db, 'users', followerUserId, 'following', currentUserId);

    // Check if the documents exist before trying to delete them
    const [followersDoc, followingDoc] = await Promise.all([
      getDoc(followersRef),
      getDoc(followingRef)
    ]);

    console.log('Document existence check results:', {
      followersDocExists: followersDoc.exists(),
      followingDocExists: followingDoc.exists()
    });

    // Use batch write for atomic operations
    const batch = writeBatch(db);
    let hasOperations = false;

    try {
      // Remove from current user's followers collection if it exists
      if (followersDoc.exists()) {
        console.log('Adding followers deletion to batch');
        batch.delete(followersRef);
        hasOperations = true;
      }
      
      // Remove from follower's following collection if it exists
      if (followingDoc.exists()) {
        console.log('Adding following deletion to batch');
        batch.delete(followingRef);
        hasOperations = true;
      }

      if (hasOperations) {
        console.log('Committing batch operations...');
        await batch.commit();
        console.log('Remove follower operation completed successfully');
        return true;
      } else {
        console.log('No follower relationship found to remove');
        return true; // Not an error - they weren't following anyway
      }
    } catch (firestoreError: any) {
      console.error('Firestore permission or write error during remove follower:', {
        code: firestoreError.code,
        message: firestoreError.message,
        currentUserId,
        followerUserId
      });
      
      // Handle specific Firestore errors
      if (firestoreError.code === 'permission-denied') {
        console.error('Permission denied - check Firestore rules for remove follower operation');
      } else if (firestoreError.code === 'not-found') {
        console.error('Document not found during remove follower operation');
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error removing follower:', error);
    return false;
  }
};
