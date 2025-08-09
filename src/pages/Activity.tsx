
import React, { useState, useEffect } from "react";
import Layout from '../components/Layout';
import { Bell, Heart, MessageCircle, UserPlus, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToNotifications, Notification } from '../services/notifications';
import { useFollowRequests } from '../hooks/useFollowRequests';
import FollowRequestItem from '../components/activity/FollowRequestItem';

const Activity = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use the follow requests hook for real-time updates
  const { 
    followRequests, 
    loading: followRequestsLoading,
    acceptFollowRequest,
    declineFollowRequest 
  } = useFollowRequests();

  // Subscribe to notifications
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    console.log('Setting up notifications listener for user:', currentUser.uid);
    const unsubscribe = subscribeToNotifications(currentUser.uid, (newNotifications) => {
      console.log('Notifications updated, count:', newNotifications.length);
      setNotifications(newNotifications);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFallbackAvatar = () => {
    return '/lovable-uploads/07e28f82-bd38-410c-a208-5db174616626.png';
  };

  if (loading && followRequestsLoading) {
    return (
      <Layout>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading activity...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-10 border-b p-4">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Activity
          </h1>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="all">All Activity</TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Follow Requests
              {followRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {followRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="divide-y">
              {/* Follow Requests Section - Show in All Activity too */}
              {followRequests.length > 0 && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      Follow Requests ({followRequests.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {followRequests.slice(0, 3).map((request) => (
                      <FollowRequestItem
                        key={request.id}
                        request={request}
                        onAccept={acceptFollowRequest}
                        onDecline={declineFollowRequest}
                      />
                    ))}
                    {followRequests.length > 3 && (
                      <div className="text-center py-2">
                        <span className="text-sm text-muted-foreground">
                          +{followRequests.length - 3} more requests
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Regular Notifications */}
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="w-11 h-11 rounded-full flex-shrink-0 mr-3">
                      <img 
                        src={notification.senderProfile?.avatar || getFallbackAvatar()} 
                        alt={notification.senderProfile?.username || 'User'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <span className="font-medium">
                            {notification.senderProfile?.username || 'Someone'}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            {notification.message}
                          </span>
                        </div>
                        {notification.postThumbnail && (
                          <div className="w-10 h-10 rounded flex-shrink-0">
                            <img 
                              src={notification.postThumbnail} 
                              alt="Post" 
                              className="w-full h-full rounded object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {notification.timestamp ? new Date(notification.timestamp.toDate()).toLocaleDateString() : 'Recently'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No activity yet</p>
                  <p className="text-sm">When people interact with your posts, you'll see it here.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-0">
            <div className="divide-y">
              {followRequests.length > 0 ? (
                followRequests.map((request) => (
                  <FollowRequestItem
                    key={request.id}
                    request={request}
                    onAccept={acceptFollowRequest}
                    onDecline={declineFollowRequest}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No follow requests</p>
                  <p className="text-sm">When people request to follow you, they'll appear here.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Activity;
