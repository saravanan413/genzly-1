
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FollowRequest } from '../../hooks/useFollowRequests';

interface FollowRequestItemProps {
  request: FollowRequest;
  onAccept: (requesterId: string) => Promise<boolean>;
  onDecline: (requesterId: string) => Promise<boolean>;
}

const FollowRequestItem: React.FC<FollowRequestItemProps> = ({
  request,
  onAccept,
  onDecline
}) => {
  const navigate = useNavigate();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept(request.uid);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await onDecline(request.uid);
    } finally {
      setIsDeclining(false);
    }
  };

  const handleUserClick = () => {
    navigate(`/user/${request.uid}`);
  };

  const getFallbackAvatar = () => {
    return '/lovable-uploads/07e28f82-bd38-410c-a208-5db174616626.png';
  };

  const avatarUrl = request.avatar || getFallbackAvatar();

  return (
    <div className="flex items-center px-4 py-3 hover:bg-muted/50 transition-colors">
      {/* Profile Picture */}
      <div 
        className="w-11 h-11 rounded-full flex-shrink-0 cursor-pointer mr-3"
        onClick={handleUserClick}
      >
        <img 
          src={avatarUrl} 
          alt={request.username} 
          className="w-full h-full rounded-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1">
          <span 
            className="font-semibold cursor-pointer hover:underline"
            onClick={handleUserClick}
          >
            {request.username}
          </span>
          <span className="text-muted-foreground">requested to follow you</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {request.timestamp ? new Date(request.timestamp.toDate()).toLocaleDateString() : 'Recently'}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={isAccepting || isDeclining}
          className="px-4 py-1 h-8"
        >
          {isAccepting ? 'Accepting...' : 'Accept'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={isAccepting || isDeclining}
          className="px-4 py-1 h-8"
        >
          {isDeclining ? 'Declining...' : 'Decline'}
        </Button>
      </div>
    </div>
  );
};

export default FollowRequestItem;
