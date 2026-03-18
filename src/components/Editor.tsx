import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
  id: string;
  content: string;
  timestamp: number;
}

const Editor = () => {
  const [content, setContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState<Note[]>(() => {
    const stored = localStorage.getItem("blank-notes");
    return stored ? JSON.parse(stored) : [];
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "s") {
          e.preventDefault();
          saveNote();
        }
        if (e.key === "k") {
          e.preventDefault();
          setSearchOpen((prev) => !prev);
        }
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [content]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  }, [searchOpen]);

  const saveNote = useCallback(() => {
    if (!content.trim()) return;
    const note: Note = {
      id: crypto.randomUUID(),
      content: content.trim(),
      timestamp: Date.now(),
    };
    const updated = [note, ...notes];
    setNotes(updated);
    localStorage.setItem("blank-notes", JSON.stringify(updated));
    setContent("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [content, notes]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 1500);
  };

  const loadNote = (note: Note) => {
    setContent(note.content);
    setSearchOpen(false);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    localStorage.setItem("blank-notes", JSON.stringify(updated));
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const filteredNotes = notes.filter((n) =>
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center bg-background">
      {/* Ghost Sidebar Trigger */}
      <GhostSidebar
        notes={notes}
        onSelect={loadNote}
        onDelete={deleteNote}
        isTyping={isTyping}
      />

      {/* Editor */}
      <div className="relative flex w-full max-w-[65ch] flex-1 flex-col justify-center px-6">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Start typing..."
          className="editor-surface w-full flex-1 resize-none border-none bg-transparent py-24 text-lg leading-[1.6] placeholder:text-muted-foreground/40 focus:outline-none"
          spellCheck={false}
        />
      </div>

      {/* Bottom bar */}
      <motion.div
        className="ui-label fixed bottom-0 left-0 right-0 flex items-center justify-center gap-6 pb-6"
        animate={{ opacity: isTyping ? 0.2 : 0.5 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        {wordCount > 0 && (
          <span className="tabular-nums">
            {wordCount.toLocaleString()} words · {readingTime}m read
          </span>
        )}
        <span className="text-muted-foreground/30">
          ⌘S save · ⌘K search
        </span>
      </motion.div>

      {/* Save toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="ui-label fixed bottom-12 rounded-full bg-muted px-4 py-2 shadow-md"
          >
            Saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <SearchModal
            query={searchQuery}
            onQueryChange={setSearchQuery}
            notes={filteredNotes}
            onSelect={loadNote}
            onClose={() => setSearchOpen(false)}
            inputRef={searchInputRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface GhostSidebarProps {
  notes: Note[];
  onSelect: (note: Note) => void;
  onDelete: (id: string) => void;
  isTyping: boolean;
}

const GhostSidebar = ({ notes, onSelect, onDelete, isTyping }: GhostSidebarProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="fixed left-0 top-0 z-50 h-full w-10"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered && !isTyping && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-0 top-0 h-full w-72 bg-card/95 p-6 backdrop-blur-sm"
          >
            <p className="ui-label mb-6">History</p>
            <div className="flex flex-col gap-2">
              {notes.length === 0 && (
                <p className="ui-label text-muted-foreground/30">No saved notes</p>
              )}
              {notes.slice(0, 20).map((note) => (
                <motion.div
                  key={note.id}
                  whileTap={{ scale: 0.98 }}
                  className="group flex cursor-pointer items-start justify-between rounded-md p-3 transition-colors hover:bg-muted"
                  onClick={() => onSelect(note)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-secondary-foreground">
                      {note.content.slice(0, 60)}
                    </p>
                    <p className="ui-label mt-1 text-muted-foreground/40">
                      {new Date(note.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(note.id);
                    }}
                    className="ml-2 opacity-0 transition-opacity group-hover:opacity-50 hover:!opacity-100 text-muted-foreground text-xs"
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SearchModalProps {
  query: string;
  onQueryChange: (q: string) => void;
  notes: Note[];
  onSelect: (note: Note) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const SearchModal = ({
  query,
  onQueryChange,
  notes,
  onSelect,
  onClose,
  inputRef,
}: SearchModalProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.18 }}
    className="fixed inset-0 z-[100] flex items-start justify-center bg-background/80 pt-[20vh] backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-lg rounded-lg bg-card p-4 shadow-md"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search notes..."
        className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
      />
      {notes.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          {notes.slice(0, 8).map((note) => (
            <motion.div
              key={note.id}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer rounded-md p-3 text-sm text-secondary-foreground transition-colors hover:bg-muted"
              onClick={() => onSelect(note)}
            >
              <p className="truncate">{note.content.slice(0, 80)}</p>
              <p className="ui-label mt-1 text-muted-foreground/40">
                {new Date(note.timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  </motion.div>
);

export default Editor;
