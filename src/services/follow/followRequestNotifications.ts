
import { createFollowNotification } from '../notifications';
import { getUserProfile } from '../firestoreService';

export const createFollowRequestNotification = async (
  targetUserId: string,
  requesterId: string
) => {
  try {
    // Get requester profile for notification
    const requesterProfile = await getUserProfile(requesterId);
    if (!requesterProfile) return;

    await createFollowNotification(targetUserId, requesterId);
    console.log('Follow request notification created for:', { targetUserId, requesterId });
  } catch (error) {
    console.error('Error creating follow request notification:', error);
  }
};
