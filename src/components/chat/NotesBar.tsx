import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToNotes, Note } from '../../services/notesService';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import CreateNoteModal from './CreateNoteModal';
import ViewNoteModal from './ViewNoteModal';

const NotesBar = () => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToNotes(currentUser.uid, (fetchedNotes) => {
      setNotes(fetchedNotes);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  const getCurrentUserNote = () => {
    return notes.find(note => note.userId === currentUser?.uid);
  };

  const getOtherNotes = () => {
    return notes.filter(note => note.userId !== currentUser?.uid);
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours >= 1) {
      return `${diffHours}h ago`;
    } else if (diffMinutes >= 1) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-border">
        <div className="flex space-x-3 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-1 flex-shrink-0">
              <div className="w-16 h-16 bg-muted rounded-full animate-pulse" />
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
    <>
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {/* Your Note */}
          <div className="flex flex-col items-center space-y-1 flex-shrink-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="w-16 h-16 rounded-full p-0 overflow-hidden border-2 border-dashed border-muted-foreground/30"
                onClick={() => setShowCreateModal(true)}
              >
                {currentUserNote ? (
                  <Avatar className="w-full h-full">
                    <AvatarImage src={currentUser?.photoURL || ''} />
                    <AvatarFallback>
                      {currentUser?.displayName?.[0] || currentUser?.email?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-muted/50">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </Button>
              {currentUserNote && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs text-primary-foreground">📝</span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium">Your note</span>
          </div>

          {/* Other Users' Notes */}
          {otherNotes.map((note) => (
            <div
              key={note.id}
              className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer"
              onClick={() => setSelectedNote(note)}
            >
              <div className="relative">
                <Avatar className="w-16 h-16 border-2 border-primary">
                  <AvatarImage src={note.userAvatar || ''} />
                  <AvatarFallback>
                    {note.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 max-w-8 h-6 bg-background border border-border rounded-full px-1 flex items-center justify-center">
                  <span className="text-xs truncate">{note.text.slice(0, 2)}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-16">
                {note.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Create Note Modal */}
      <CreateNoteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        existingNote={currentUserNote}
      />

      {/* View Note Modal */}
      <ViewNoteModal
        note={selectedNote}
        isOpen={selectedNote !== null}
        onClose={() => setSelectedNote(null)}
        formatTimeAgo={formatTimeAgo}
      />
    </>
  );
};

export default NotesBar;
