
import { 
  doc, 
  writeBatch,
  serverTimestamp,
  getDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { sendFollowRequest, cancelFollowRequest } from '../privacy/privacyService';
import { logger } from '../../utils/logger';

export const followUser = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) {
    logger.error('Cannot follow yourself');
    return false;
  }

  try {
    logger.debug('Starting follow operation:', { currentUserId, targetUserId });
    
    // Get user profiles first to ensure they exist
    const [currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', currentUserId)),
      getDoc(doc(db, 'users', targetUserId))
    ]);
    
    if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
      logger.error('User documents not found', {
        currentUserExists: currentUserDoc.exists(),
        targetUserExists: targetUserDoc.exists()
      });
      return false;
    }

    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();

    // Check if target user has private account
    if (targetUserData.isPrivate) {
      logger.debug('Target user has private account, sending follow request');
      return await sendFollowRequest(currentUserId, targetUserId);
    }

    logger.debug('User data loaded, proceeding with follow operation');

    // Use batch write for atomic operations
    const batch = writeBatch(db);

    // Create document at /users/{targetUserId}/followers/{currentUserId}
    const followersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
    batch.set(followersRef, {
      uid: currentUserId,
      username: currentUserData.username || 'Unknown',
      displayName: currentUserData.displayName || 'Unknown User',
      avatar: currentUserData.avatar || currentUserData.photoURL || '/assets/images/07e28f82-bd38-410c-a208-5db174616626.png',
      timestamp: serverTimestamp()
    });

    // Create document at /users/{currentUserId}/following/{targetUserId}
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    batch.set(followingRef, {
      uid: targetUserId,
      username: targetUserData.username || 'Unknown',
      displayName: targetUserData.displayName || 'Unknown User',
      avatar: targetUserData.avatar || targetUserData.photoURL || '/assets/images/07e28f82-bd38-410c-a208-5db174616626.png',
      timestamp: serverTimestamp()
    });

    // Update follower counts
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);
    
    batch.update(currentUserRef, {
      following: (currentUserData.following || 0) + 1
    });
    
    batch.update(targetUserRef, {
      followers: (targetUserData.followers || 0) + 1
    });

    await batch.commit();
    logger.debug('Follow operation completed successfully');
    return true;
  } catch (error: any) {
    logger.error('Error following user:', {
      error: error.message,
      code: error.code,
      currentUserId,
      targetUserId
    });
    
    // Handle specific Firestore errors
    if (error.code === 'permission-denied') {
      logger.error('Permission denied - check Firestore security rules');
    } else if (error.code === 'not-found') {
      logger.error('Document not found - user may not exist');
    } else if (error.code === 'network-request-failed') {
      logger.error('Network error - check internet connection');
    }
    
    return false;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) {
    logger.error('Cannot unfollow yourself');
    return false;
  }

  try {
    logger.debug('Starting unfollow operation:', { currentUserId, targetUserId });
    
    // Get user documents for count updates
    const [currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', currentUserId)),
      getDoc(doc(db, 'users', targetUserId))
    ]);
    
    if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
      logger.error('User documents not found for unfollow');
      return false;
    }

    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();
    
    // Check if this is a follow request that needs to be cancelled
    if (targetUserData.isPrivate) {
      logger.debug('Target user is private, cancelling follow request');
      await cancelFollowRequest(currentUserId, targetUserId);
    }
    
    // Define the document references we need to check and potentially delete
    const followersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    
    logger.debug('Checking document existence...');

    // Check if the documents exist before trying to delete them
    const [followersDoc, followingDoc] = await Promise.all([
      getDoc(followersRef),
      getDoc(followingRef)
    ]);

    logger.debug('Document existence check results:', {
      followersExists: followersDoc.exists(),
      followingExists: followingDoc.exists()
    });

    // Use batch write for atomic operations
    const batch = writeBatch(db);
    let hasOperations = false;

    // Delete from followers if it exists
    if (followersDoc.exists()) {
      logger.debug('Adding followers deletion to batch');
      batch.delete(followersRef);
      hasOperations = true;
      
      // Update target user's follower count
      const targetUserRef = doc(db, 'users', targetUserId);
      batch.update(targetUserRef, {
        followers: Math.max(0, (targetUserData.followers || 0) - 1)
      });
    }
    
    // Delete from following if it exists
    if (followingDoc.exists()) {
      logger.debug('Adding following deletion to batch');
      batch.delete(followingRef);
      hasOperations = true;
      
      // Update current user's following count
      const currentUserRef = doc(db, 'users', currentUserId);
      batch.update(currentUserRef, {
        following: Math.max(0, (currentUserData.following || 0) - 1)
      });
    }

    if (hasOperations) {
      logger.debug('Committing batch operations...');
      await batch.commit();
      logger.debug('Unfollow operation completed successfully');
      return true;
    } else {
      logger.debug('No follow relationship found to remove');
      return true; // Not an error - they weren't following anyway
    }
  } catch (error: any) {
    logger.error('Error unfollowing user:', {
      error: error.message,
      code: error.code,
      currentUserId,
      targetUserId
    });
    return false;
  }
};

export const removeFollower = async (currentUserId: string, followerUserId: string) => {
  if (currentUserId === followerUserId) {
    logger.error('Cannot remove yourself as follower');
    return false;
  }

  try {
    logger.debug('Starting remove follower operation:', { currentUserId, followerUserId });
    
    // Get user documents for count updates
    const [currentUserDoc, followerUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', currentUserId)),
      getDoc(doc(db, 'users', followerUserId))
    ]);
    
    if (!currentUserDoc.exists() || !followerUserDoc.exists()) {
      logger.error('User documents not found for remove follower');
      return false;
    }

    const currentUserData = currentUserDoc.data();
    const followerUserData = followerUserDoc.data();
    
    // Define the document references we need to check and potentially delete
    const followersRef = doc(db, 'users', currentUserId, 'followers', followerUserId);
    const followingRef = doc(db, 'users', followerUserId, 'following', currentUserId);
    
    logger.debug('Document references:', {
      followersPath: followersRef.path,
      followingPath: followingRef.path
    });

    // Check if the documents exist before trying to delete them
    const [followersDoc, followingDoc] = await Promise.all([
      getDoc(followersRef),
      getDoc(followingRef)
    ]);

    logger.debug('Document existence check results:', {
      followersExists: followersDoc.exists(),
      followingExists: followingDoc.exists()
    });

    // Use batch write for atomic operations
    const batch = writeBatch(db);
    let hasOperations = false;

    // Remove from current user's followers collection if it exists
    if (followersDoc.exists()) {
      logger.debug('Adding followers deletion to batch');
      batch.delete(followersRef);
      hasOperations = true;
      
      // Update current user's follower count
      const currentUserRef = doc(db, 'users', currentUserId);
      batch.update(currentUserRef, {
        followers: Math.max(0, (currentUserData.followers || 0) - 1)
      });
    }
    
    // Remove from follower's following collection if it exists
    if (followingDoc.exists()) {
      logger.debug('Adding following deletion to batch');
      batch.delete(followingRef);
      hasOperations = true;
      
      // Update follower user's following count
      const followerUserRef = doc(db, 'users', followerUserId);
      batch.update(followerUserRef, {
        following: Math.max(0, (followerUserData.following || 0) - 1)
      });
    }

    if (hasOperations) {
      logger.debug('Committing batch operations...');
      await batch.commit();
      logger.debug('Remove follower operation completed successfully');
      return true;
    } else {
      logger.debug('No follower relationship found to remove');
      return true; // Not an error - they weren't following anyway
    }
  } catch (error: any) {
    logger.error('Error removing follower:', {
      error: error.message,
      code: error.code,
      currentUserId,
      followerUserId
    });
    return false;
  }
};
