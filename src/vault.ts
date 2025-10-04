import { readFile } from 'fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';
import { basename, join } from 'path';
import Fuse from 'fuse.js';
import { Note, SearchOptions, VaultConfig } from './types.js';

/**
 * Manages indexing and searching of an Obsidian vault
 */
export class ObsidianVault {
  private notes: Note[] = [];
  private fuse: Fuse<Note> | null = null;
  private config: VaultConfig;

  constructor(config: VaultConfig) {
    this.config = config;
  }

  /**
   * Initialize the vault by indexing all notes and setting up search
   * @throws {Error} If vault initialization fails
   */
  async initialize(): Promise<void> {
    try {
      console.error('Initializing Obsidian vault...');
      await this.indexNotes();
      this.initializeSearch();
      console.error(`Indexed ${this.notes.length} notes`);
    } catch (error) {
      console.error('Failed to initialize vault:', error instanceof Error ? error.message : String(error));
      throw new Error(`Vault initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async indexNotes(): Promise<void> {
    const files: string[] = [];

    try {
      for (const pattern of this.config.indexPatterns) {
        const matches = await glob(pattern, {
          cwd: this.config.vaultPath,
          absolute: true,
          ignore: this.config.excludePatterns
        });
        files.push(...matches);
      }
    } catch (error) {
      throw new Error(`Failed to scan vault directory: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (files.length === 0) {
      console.error('Warning: No markdown files found matching the index patterns');
    }

    const notesWithPossibleNulls = await Promise.all(
      files.map(async (filePath) => {
        try {
          const content = await readFile(filePath, 'utf-8');
          const { data, content: markdownContent } = matter(content);

          const title = basename(filePath, '.md');
          const excerpt = this.createExcerpt(markdownContent);

          // Provide safe defaults for missing frontmatter fields
          const frontmatter: any = {
            created: data.created || '',
            modified: data.modified || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            type: data.type || 'note',
            status: data.status || 'active',
            category: data.category || 'personal',
            ...data
          };

          return {
            path: filePath.replace(this.config.vaultPath + '/', ''),
            title,
            content: markdownContent,
            frontmatter,
            excerpt
          } as Note;
        } catch (error) {
          console.error(`Error reading ${filePath}:`, error);
          return null;
        }
      })
    );

    this.notes = notesWithPossibleNulls.filter((n): n is Note => n !== null);
  }

  private createExcerpt(content: string, length: number = 200): string {
    let cleanContent = content
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Remove images
      .replace(/!\[.*?\]\(.*?\)/g, '')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove wiki links but keep text
      .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove extra whitespace
      .replace(/\n{2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanContent.slice(0, length) + (cleanContent.length > length ? '...' : '');
  }

  /**
   * Parses a date string and returns a Date object, or null if invalid.
   * Supports formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, ISO 8601
   */
  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error(`Invalid date format: ${dateString}`);
      return null;
    }

    return date;
  }

  /**
   * Matches a note tag against a search tag with support for hierarchical tags.
   * Examples:
   *   - "work/puppet" matches "work/puppet" (exact)
   *   - "work" matches "work/puppet" (parent tag)
   *   - "work/puppet" does NOT match "work" (child tag doesn't match parent search)
   *   - "work" does NOT match "homework" (prevents false positives)
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

  private initializeSearch(): void {
    this.fuse = new Fuse(this.notes, {
      keys: [
        { name: 'title', weight: this.config.searchWeights.title },
        { name: 'frontmatter.tags', weight: this.config.searchWeights.tags },
        { name: 'content', weight: this.config.searchWeights.content }
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true
    });
  }

  /**
   * Search notes with fuzzy matching and filters
   * @param query - Search query string (optional)
   * @param options - Filter and limit options
   * @returns Array of matching notes sorted by relevance and recency
   */
  searchNotes(query: string, options: SearchOptions = {}): Note[] {
    let results = query && this.fuse
      ? this.fuse.search(query).map(result => result.item)
      : [...this.notes];

    results = this.applyFilters(results, options);
    results = this.applyRecencyBoost(results);

    const limit = options.limit || 20;
    return results.slice(0, limit);
  }

  private applyFilters(notes: Note[], options: SearchOptions): Note[] {
    let filtered = notes;

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
      const fromDate = this.parseDate(options.dateFrom);
      if (fromDate) {
        filtered = filtered.filter(note => {
          const noteDate = this.parseDate(note.frontmatter.modified || '');
          return noteDate && noteDate >= fromDate;
        });
      }
    }

    if (options.dateTo) {
      const toDate = this.parseDate(options.dateTo);
      if (toDate) {
        filtered = filtered.filter(note => {
          const noteDate = this.parseDate(note.frontmatter.modified || '');
          return noteDate && noteDate <= toDate;
        });
      }
    }

    return filtered;
  }

  private applyRecencyBoost(notes: Note[]): Note[] {
    return notes.sort((a, b) => {
      const dateA = new Date(a.frontmatter.modified || a.frontmatter.created || 0);
      const dateB = new Date(b.frontmatter.modified || b.frontmatter.created || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get a specific note by its path
   * @param path - Relative path from vault root
   * @returns The note or undefined if not found
   */
  getNote(path: string): Note | undefined {
    return this.notes.find(note => note.path === path);
  }

  /**
   * Get all indexed notes
   * @returns Array of all notes
   */
  getAllNotes(): Note[] {
    return [...this.notes];
  }

  /**
   * Get notes with a specific tag (supports hierarchical matching)
   * @param tag - Tag to search for (e.g., "work" or "work/puppet")
   * @returns Array of matching notes
   */
  getNotesByTag(tag: string): Note[] {
    return this.notes.filter(note =>
      note.frontmatter.tags?.some(t =>
        this.matchesTag(t, tag)
      )
    );
  }

  /**
   * Get notes by type
   * @param type - Note type to filter by
   * @returns Array of matching notes
   */
  getNotesByType(type: string): Note[] {
    return this.notes.filter(note => note.frontmatter.type === type);
  }

  /**
   * Get notes by status
   * @param status - Status to filter by
   * @returns Array of matching notes
   */
  getNotesByStatus(status: string): Note[] {
    return this.notes.filter(note => note.frontmatter.status === status);
  }

  /**
   * Get the most recently modified notes
   * @param limit - Maximum number of notes to return
   * @returns Array of notes sorted by modification date (newest first)
   */
  getRecentNotes(limit: number = 10): Note[] {
    return this.applyRecencyBoost([...this.notes]).slice(0, limit);
  }
}
