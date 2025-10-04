import Fuse from 'fuse.js';
import { Note, SearchOptions, parseDate } from './types.js';
import { IStorage } from './storage.js';

/**
 * In-memory storage implementation using Fuse.js for search
 * Good for small vaults or when persistence is not needed
 */
export class MemoryStorage implements IStorage {
  private notes: Map<string, Note> = new Map();
  private fuse: Fuse<Note> | null = null;
  private readonly searchWeights: {
    title: number;
    tags: number;
    frontmatter: number;
    content: number;
  };

  constructor(searchWeights: { title: number; tags: number; frontmatter: number; content: number }) {
    this.searchWeights = searchWeights;
  }

  async initialize(): Promise<void> {
    // Nothing to initialize for memory storage
  }

  async upsertNote(note: Note): Promise<void> {
    this.notes.set(note.path, note);
    this.rebuildSearchIndex();
  }

  async upsertNotes(notes: Note[]): Promise<void> {
    for (const note of notes) {
      this.notes.set(note.path, note);
    }
    this.rebuildSearchIndex();
  }

  async getNote(path: string): Promise<Note | null> {
    return this.notes.get(path) || null;
  }

  async getAllNotes(): Promise<Note[]> {
    return Array.from(this.notes.values());
  }

  async searchNotes(query: string, options: SearchOptions = {}): Promise<Note[]> {
    let results: Note[];

    if (query && this.fuse) {
      results = this.fuse.search(query).map(result => result.item);
    } else {
      results = Array.from(this.notes.values());
    }

    results = this.applyFilters(results, options);
    results = this.sortByRecency(results);

    const limit = options.limit || 20;
    return results.slice(0, limit);
  }

  async getNotesByTag(tag: string): Promise<Note[]> {
    const notes = Array.from(this.notes.values());
    const filtered = notes.filter(note =>
      note.frontmatter.tags?.some(noteTag => this.matchesTag(noteTag, tag))
    );
    return this.sortByRecency(filtered);
  }

  async getRecentNotes(limit: number): Promise<Note[]> {
    const notes = Array.from(this.notes.values());
    return this.sortByRecency(notes).slice(0, limit);
  }

  async clear(): Promise<void> {
    this.notes.clear();
    this.fuse = null;
  }

  async close(): Promise<void> {
    // Nothing to close for memory storage
  }

  /**
   * Rebuild Fuse.js search index
   */
  private rebuildSearchIndex(): void {
    const notesArray = Array.from(this.notes.values());
    this.fuse = new Fuse(notesArray, {
      keys: [
        { name: 'title', weight: this.searchWeights.title },
        { name: 'frontmatter.tags', weight: this.searchWeights.tags },
        { name: 'frontmatter.type', weight: this.searchWeights.frontmatter },
        { name: 'frontmatter.status', weight: this.searchWeights.frontmatter },
        { name: 'frontmatter.category', weight: this.searchWeights.frontmatter },
        { name: 'content', weight: this.searchWeights.content }
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true
    });
  }

  /**
   * Apply filters to notes
   */
  private applyFilters(notes: Note[], options: SearchOptions): Note[] {
    let filtered = notes;

    // Filter by path pattern
    if (options.path) {
      const pattern = options.path.toLowerCase();
      filtered = filtered.filter(note => {
        const notePath = note.path.toLowerCase();
        if (pattern.endsWith('/**')) {
          const prefix = pattern.slice(0, -3);
          return notePath.startsWith(prefix);
        }
        return notePath.includes(pattern);
      });
    }

    // Exclude Archive unless explicitly included
    if (!options.includeArchive) {
      filtered = filtered.filter(note => !note.path.toLowerCase().startsWith('archive/'));
    }

    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(note =>
        options.tags!.some(tag =>
          note.frontmatter.tags?.some(noteTag =>
            this.matchesTag(noteTag, tag)
          )
        )
      );
    }

    if (options.type) {
      filtered = filtered.filter(note => note.frontmatter.type === options.type);
    }

    if (options.status) {
      filtered = filtered.filter(note => note.frontmatter.status === options.status);
    }

    if (options.category) {
      filtered = filtered.filter(note => note.frontmatter.category === options.category);
    }

    if (options.dateFrom) {
      const fromDate = parseDate(options.dateFrom);
      if (fromDate) {
        filtered = filtered.filter(note => {
          const noteDate = parseDate(note.frontmatter.modified || '');
          return noteDate && noteDate >= fromDate;
        });
      }
    }

    if (options.dateTo) {
      const toDate = parseDate(options.dateTo);
      if (toDate) {
        filtered = filtered.filter(note => {
          const noteDate = parseDate(note.frontmatter.modified || '');
          return noteDate && noteDate <= toDate;
        });
      }
    }

    return filtered;
  }

  /**
   * Sort notes by recency (most recent first)
   */
  private sortByRecency(notes: Note[]): Note[] {
    return notes.sort((a, b) => {
      const dateA = new Date(a.frontmatter.modified || a.frontmatter.created || 0);
      const dateB = new Date(b.frontmatter.modified || b.frontmatter.created || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Matches a note tag against a search tag with support for hierarchical tags
   */
  private matchesTag(noteTag: string, searchTag: string): boolean {
    const normalizedNoteTag = noteTag.toLowerCase();
    const normalizedSearchTag = searchTag.toLowerCase();

    // Exact match
    if (normalizedNoteTag === normalizedSearchTag) {
      return true;
    }

    // Hierarchical match: search for parent tag (e.g., "work" matches "work/puppet")
    if (normalizedNoteTag.startsWith(normalizedSearchTag + '/')) {
      return true;
    }

    return false;
  }
}
