
import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createFollowNotification } from '../services/notifications';

export interface FollowRequest {
  id: string;
  uid: string;
  username: string;
  displayName: string;
  avatar: string | null;
  timestamp: any;
  status: 'pending';
}

export const useFollowRequests = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to follow requests for current user
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    console.log('Setting up follow requests listener for:', currentUser.uid);
    const followRequestsRef = collection(db, 'users', currentUser.uid, 'followRequests');
    const followRequestsQuery = query(followRequestsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(followRequestsQuery, 
      (snapshot) => {
        console.log('Follow requests updated, count:', snapshot.size);
        const requests: FollowRequest[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            id: doc.id,
            uid: data.uid,
            username: data.username || 'Unknown',
            displayName: data.displayName || 'Unknown User',
            avatar: data.avatar || null,
            timestamp: data.timestamp,
            status: data.status || 'pending'
          });
        });
        
        setFollowRequests(requests);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to follow requests:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid]);

  // Accept follow request
  const acceptFollowRequest = async (requesterId: string) => {
    if (!currentUser?.uid) return false;

    try {
      console.log('Accepting follow request from:', requesterId);

      // Get requester and current user data
      const [requesterDoc, currentUserDoc] = await Promise.all([
        getDoc(doc(db, 'users', requesterId)),
        getDoc(doc(db, 'users', currentUser.uid))
      ]);

      if (!requesterDoc.exists() || !currentUserDoc.exists()) {
        throw new Error('User data not found');
      }

      const requesterData = requesterDoc.data();
      const currentUserData = currentUserDoc.data();

      // Use batch write for atomic operations
      const batch = writeBatch(db);

      // Add requester to current user's followers
      const followersRef = doc(db, 'users', currentUser.uid, 'followers', requesterId);
      batch.set(followersRef, {
        uid: requesterId,
        username: requesterData.username || 'Unknown',
        displayName: requesterData.displayName || 'Unknown User',
        avatar: requesterData.avatar || null,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Add current user to requester's following
      const followingRef = doc(db, 'users', requesterId, 'following', currentUser.uid);
      batch.set(followingRef, {
        uid: currentUser.uid,
        username: currentUserData.username || 'Unknown',
        displayName: currentUserData.displayName || 'Unknown User',
        avatar: currentUserData.avatar || null,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Remove from follow requests
      const requestRef = doc(db, 'users', currentUser.uid, 'followRequests', requesterId);
      batch.delete(requestRef);

      await batch.commit();

      // Create follow acceptance notification
      await createFollowNotification(requesterId, currentUser.uid);

      toast({
        title: "Follow request accepted",
        description: `${requesterData.username || 'User'} is now following you`,
        duration: 3000
      });

      console.log('Follow request accepted successfully');
      return true;
    } catch (error) {
      console.error('Error accepting follow request:', error);
      toast({
        title: "Error",
        description: "Failed to accept follow request",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }
  };

  // Decline follow request
  const declineFollowRequest = async (requesterId: string) => {
    if (!currentUser?.uid) return false;

    try {
      console.log('Declining follow request from:', requesterId);

      const requestRef = doc(db, 'users', currentUser.uid, 'followRequests', requesterId);
      await deleteDoc(requestRef);

      toast({
        title: "Follow request declined",
        description: "Request removed",
        duration: 3000
      });

      console.log('Follow request declined successfully');
      return true;
    } catch (error) {
      console.error('Error declining follow request:', error);
      toast({
        title: "Error",
        description: "Failed to decline follow request",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }
  };

  return {
    followRequests,
    loading,
    acceptFollowRequest,
    declineFollowRequest
  };
};
