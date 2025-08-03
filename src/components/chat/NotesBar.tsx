
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToNotes, Note } from '../../services/notesService';
import CreateNoteModal from './CreateNoteModal';
import ViewNoteModal from './ViewNoteModal';

const NotesBar = () => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToNotes(currentUser.uid, (notesData) => {
      setNotes(notesData);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  const getCurrentUserNote = (): Note | undefined => {
    return notes.find(note => note.uid === currentUser?.uid);
  };

  const getOtherNotes = (): Note[] => {
    return notes.filter(note => note.uid !== currentUser?.uid);
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    }
  };

  const getProfileImageUrl = (user: any): string => {
    if (user?.userAvatar) return user.userAvatar;
    if (user?.uid) return `https://firebasestorage.googleapis.com/v0/b/genzly.appspot.com/o/profiles%2F${user.uid}.jpg?alt=media`;
    return '/assets/images/07e28f82-bd38-410c-a208-5db174616626.png';
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/assets/images/07e28f82-bd38-410c-a208-5db174616626.png';
  };

  if (loading) {
    return (
      <div className="p-4 border-b border-border">
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center space-y-2 min-w-0 flex-shrink-0">
              <div className="w-14 h-14 bg-muted rounded-full animate-pulse" />
              <div className="w-12 h-3 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentUserNote = getCurrentUserNote();
  const otherNotes = getOtherNotes();

  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Your Note */}
        <div className="flex flex-col items-center flex-shrink-0 min-w-0">
          {/* Note content above profile picture */}
          {currentUserNote && (
            <div className="bg-card border border-border rounded-full px-3 py-1 mb-2 max-w-[120px] shadow-sm">
              <p className="text-xs text-foreground truncate text-center font-medium">
                {currentUserNote.content.length > 60 ? 
                  currentUserNote.content.substring(0, 60) + '...' : 
                  currentUserNote.content
                }
              </p>
            </div>
          )}
          
          {/* Profile picture */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="relative w-14 h-14 rounded-full overflow-hidden"
          >
            {currentUserNote ? (
              <img 
                src={getProfileImageUrl({ userAvatar: currentUser?.photoURL, uid: currentUser?.uid })} 
                alt="Your profile"
                className="w-full h-full object-cover border-2 border-primary rounded-full" 
                onError={handleImageError}
              />
            ) : (
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center bg-background">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </button>
          
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[60px]">Your note</p>
        </div>

        {/* Other Users' Notes */}
        {otherNotes.map((note) => (
          <div
            key={note.uid}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer min-w-0"
            onClick={() => {
              setSelectedNote(note);
              setShowViewModal(true);
            }}
          >
            {/* Note content above profile picture */}
            <div className="bg-card border border-border rounded-full px-3 py-1 mb-2 max-w-[120px] shadow-sm">
              <p className="text-xs text-foreground truncate text-center font-medium">
                {note.content.length > 60 ? 
                  note.content.substring(0, 60) + '...' : 
                  note.content
                }
              </p>
            </div>
            
            {/* Profile picture */}
            <div className="w-14 h-14 rounded-full overflow-hidden">
              <img 
                src={getProfileImageUrl(note)} 
                alt={`${note.username}'s profile`}
                className="w-full h-full object-cover border-2 border-primary rounded-full" 
                onError={handleImageError}
              />
            </div>
            
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[60px]">
              {note.username || 'User'}
            </p>
          </div>
        ))}
      </div>

      <CreateNoteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        existingNote={currentUserNote}
      />

      <ViewNoteModal
        note={selectedNote}
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        formatTimeAgo={formatTimeAgo}
      />
    </div>
  );
};

export default NotesBar;
