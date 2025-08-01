import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createNote, deleteNote, Note } from '../../services/notesService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNote?: Note;
}

const CreateNoteModal = ({ isOpen, onClose, existingNote }: CreateNoteModalProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState(existingNote?.text || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !text.trim()) return;

    setLoading(true);
    try {
      await createNote(currentUser.uid, text.trim());
      toast({
        title: "Note posted",
        description: "Your note will be visible for 24 hours",
      });
      onClose();
      setText('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser?.uid || !existingNote) return;

    setLoading(true);
    try {
      await deleteNote(currentUser.uid, existingNote.id);
      toast({
        title: "Note deleted",
        description: "Your note has been removed",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setText(existingNote?.text || '');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingNote ? 'Edit your note' : 'Add a note'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share a thought..."
              maxLength={60}
              className="text-center text-lg"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {text.length}/60 characters • Visible for 24 hours
            </p>
          </div>

          <div className="flex space-x-2">
            {existingNote && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1"
              >
                Delete
              </Button>
            )}
            <Button
              type="submit"
              disabled={!text.trim() || loading}
              className="flex-1"
            >
              {loading ? 'Posting...' : existingNote ? 'Update' : 'Share'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateNoteModal;