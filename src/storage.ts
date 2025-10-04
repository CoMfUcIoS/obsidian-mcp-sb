import { Note, SearchOptions } from './types.js';

/**
 * Storage interface for note indexing and retrieval
 * Implementations: DatabaseStorage (default) and MemoryStorage (optional)
 */
export interface IStorage {
  /**
   * Initialize the storage (create tables, indexes, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Store or update a note
   */
  upsertNote(note: Note): Promise<void>;

  /**
   * Store or update multiple notes (bulk operation)
   */
  upsertNotes(notes: Note[]): Promise<void>;

  /**
   * Get a note by path
   */
  getNote(path: string): Promise<Note | null>;

  /**
   * Get all notes
   */
  getAllNotes(): Promise<Note[]>;

  /**
   * Search notes with filters
   */
  searchNotes(query: string, options: SearchOptions): Promise<Note[]>;

  /**
   * Get notes by tag (with hierarchical support)
   */
  getNotesByTag(tag: string): Promise<Note[]>;

  /**
   * Get recent notes
   */
  getRecentNotes(limit: number): Promise<Note[]>;

  /**
   * Clear all stored notes
   */
  clear(): Promise<void>;

  /**
   * Close the storage connection
   */
  close(): Promise<void>;
}

/**
 * Search result with score for ranking
 */
export interface SearchResult {
  note: Note;
  score: number;
}
