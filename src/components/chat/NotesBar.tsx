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
    return '';
  };

  if (loading) {
    return (
      <div className="p-4 border-b border-border">
        <div className="flex gap-3 overflow-x-auto">
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
      <div className="flex overflow-x-auto gap-3 p-2">
        {/* Your Note */}
        <div className="flex flex-col items-center flex-shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="relative w-14 h-14 rounded-full"
          >
            {currentUserNote ? (
              <div className="relative w-14 h-14 rounded-full border-2 border-primary">
                <img 
                  src={getProfileImageUrl({ userAvatar: currentUser?.photoURL, uid: currentUser?.uid })} 
                  alt="Your profile"
                  className="rounded-full w-full h-full object-cover" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = currentUser?.photoURL || '';
                  }}
                />
                <div className="absolute bottom-0 text-xs w-full text-center text-white bg-black bg-opacity-50 truncate rounded-b-full px-1">
                  {currentUserNote.content}
                </div>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </button>
          <p className="text-xs text-foreground mt-1">Your note</p>
        </div>

        {/* Other Users' Notes */}
        {otherNotes.map((note) => (
          <div
            key={note.uid}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer"
            onClick={() => {
              setSelectedNote(note);
              setShowViewModal(true);
            }}
          >
            <div className="relative w-14 h-14 rounded-full border-2 border-primary">
              <img 
                src={getProfileImageUrl(note)} 
                alt={`${note.username}'s profile`}
                className="rounded-full w-full h-full object-cover" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = note.userAvatar || '';
                }}
              />
              <div className="absolute bottom-0 text-xs w-full text-center text-white bg-black bg-opacity-50 truncate rounded-b-full px-1">
                {note.content}
              </div>
            </div>
            <p className="text-xs text-foreground mt-1">{note.username}</p>
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
