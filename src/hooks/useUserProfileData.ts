
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToFollowStatus,
  subscribeToFollowersCount,
  subscribeToFollowingCount,
  followUser,
  unfollowUser
} from '../services/follow';
import { 
  subscribeToFollowRequestStatus,
  subscribeToBlockedStatus
} from '../services/privacy/privacyService';
import { logger } from '../utils/logger';

export const useUserProfileData = (userId: string | undefined) => {
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasFollowRequest, setHasFollowRequest] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = userId === currentUser?.uid;

  // Subscribe to follow status with real-time updates
  useEffect(() => {
    if (currentUser && userId && !isOwnProfile) {
      logger.debug('Setting up follow status subscription for:', currentUser.uid, 'and', userId);
      setInitialLoading(true);
      
      const unsubscribe = subscribeToFollowStatus(currentUser.uid, userId, (status) => {
        logger.debug('Follow status updated:', status);
        setIsFollowing(status);
        setInitialLoading(false);
      });
      
      return unsubscribe;
    } else {
      setInitialLoading(false);
    }
  }, [currentUser, userId, isOwnProfile]);

  // Subscribe to follow request status
  useEffect(() => {
    if (currentUser && userId && !isOwnProfile) {
      logger.debug('Setting up follow request status subscription for:', currentUser.uid, 'and', userId);
      
      const unsubscribe = subscribeToFollowRequestStatus(currentUser.uid, userId, (hasRequest) => {
        logger.debug('Follow request status updated:', hasRequest);
        setHasFollowRequest(hasRequest);
      });
      
      return unsubscribe;
    }
  }, [currentUser, userId, isOwnProfile]);

  // Subscribe to blocked status
  useEffect(() => {
    if (currentUser && userId && !isOwnProfile) {
      logger.debug('Setting up blocked status subscription for:', currentUser.uid, 'and', userId);
      
      const unsubscribe = subscribeToBlockedStatus(currentUser.uid, userId, (blocked) => {
        logger.debug('Blocked status updated:', blocked);
        setIsBlocked(blocked);
      });
      
      return unsubscribe;
    }
  }, [currentUser, userId, isOwnProfile]);

  // Subscribe to followers count with real-time updates
  useEffect(() => {
    if (userId) {
      logger.debug('Setting up followers count subscription for:', userId);
      const unsubscribe = subscribeToFollowersCount(userId, (count) => {
        logger.debug('Followers count updated:', count);
        setFollowCounts(prev => ({ ...prev, followers: count }));
      });
      return unsubscribe;
    }
  }, [userId]);

  // Subscribe to following count with real-time updates
  useEffect(() => {
    if (userId) {
      logger.debug('Setting up following count subscription for:', userId);
      const unsubscribe = subscribeToFollowingCount(userId, (count) => {
        logger.debug('Following count updated:', count);
        setFollowCounts(prev => ({ ...prev, following: count }));
      });
      return unsubscribe;
    }
  }, [userId]);

  const handleFollowClick = async () => {
    if (!currentUser || !userId || loading || isOwnProfile || initialLoading) {
      logger.debug('Cannot follow - validation failed:', { 
        currentUser: !!currentUser, 
        userId, 
        loading, 
        isOwnProfile, 
        initialLoading 
      });
      return;
    }

    logger.debug('Follow button clicked. Current status:', { isFollowing, hasFollowRequest });
    setLoading(true);
    setError(null);
    
    try {
      let success = false;
      let actionType = '';
      
      if (isFollowing || hasFollowRequest) {
        logger.debug('Attempting to unfollow user or cancel request...');
        actionType = hasFollowRequest ? 'cancel request' : 'unfollow';
        success = await unfollowUser(currentUser.uid, userId);
        
        if (success) {
          logger.debug(`Successfully ${actionType} user`);
        } else {
          setError(`Failed to ${actionType}. Please try again.`);
        }
      } else {
        logger.debug('Attempting to follow user...');
        actionType = 'follow';
        success = await followUser(currentUser.uid, userId);
        
        if (success) {
          logger.debug('Successfully followed user or sent request');
        } else {
          setError('Failed to follow user. Please check your connection and try again.');
        }
      }

      if (!success) {
        logger.error(`${actionType} operation failed`);
        
        // Clear error after 3 seconds
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
    } catch (error: any) {
      logger.error('Error updating follow status:', error);
      setError('An unexpected error occurred. Please try again.');
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return {
    isFollowing,
    hasFollowRequest,
    isBlocked,
    followCounts,
    loading: loading || initialLoading,
    isOwnProfile,
    error,
    handleFollowClick
  };
};
