import { readFile } from 'fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';
import { basename, join } from 'path';
import Fuse from 'fuse.js';
import { Note, SearchOptions, VaultConfig } from './types.js';

export class ObsidianVault {
  private notes: Note[] = [];
  private fuse: Fuse<Note> | null = null;
  private config: VaultConfig;

  constructor(config: VaultConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.error('Initializing Obsidian vault...');
    await this.indexNotes();
    this.initializeSearch();
    console.error(`Indexed ${this.notes.length} notes`);
  }

  private async indexNotes(): Promise<void> {
    const files: string[] = [];

    for (const pattern of this.config.indexPatterns) {
      const matches = await glob(pattern, {
        cwd: this.config.vaultPath,
        absolute: true,
        ignore: this.config.excludePatterns
      });
      files.push(...matches);
    }

    this.notes = await Promise.all(
      files.map(async (filePath) => {
        try {
          const content = await readFile(filePath, 'utf-8');
          const { data, content: markdownContent } = matter(content);

          const title = basename(filePath, '.md');
          const excerpt = this.createExcerpt(markdownContent);

          return {
            path: filePath.replace(this.config.vaultPath + '/', ''),
            title,
            content: markdownContent,
            frontmatter: data as any,
            excerpt
          };
        } catch (error) {
          console.error(`Error reading ${filePath}:`, error);
          return null;
        }
      })
    ).then(notes => notes.filter((n): n is Note => n !== null));
  }

  private createExcerpt(content: string, length: number = 200): string {
    const cleanContent = content.replace(/^#+ .*$/gm, '').trim();
    return cleanContent.slice(0, length) + (cleanContent.length > length ? '...' : '');
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
            noteTag.toLowerCase().includes(tag.toLowerCase())
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
      filtered = filtered.filter(note =>
        note.frontmatter.modified >= options.dateFrom!
      );
    }

    if (options.dateTo) {
      filtered = filtered.filter(note =>
        note.frontmatter.modified <= options.dateTo!
      );
    }

    return filtered;
  }

  private applyRecencyBoost(notes: Note[]): Note[] {
    return notes.sort((a, b) => {
      const dateA = new Date(a.frontmatter.modified || a.frontmatter.created);
      const dateB = new Date(b.frontmatter.modified || b.frontmatter.created);
      return dateB.getTime() - dateA.getTime();
    });
  }

  getNote(path: string): Note | undefined {
    return this.notes.find(note => note.path === path);
  }

  getAllNotes(): Note[] {
    return [...this.notes];
  }

  getNotesByTag(tag: string): Note[] {
    return this.notes.filter(note =>
      note.frontmatter.tags?.some(t =>
        t.toLowerCase().includes(tag.toLowerCase())
      )
    );
  }

  getNotesByType(type: string): Note[] {
    return this.notes.filter(note => note.frontmatter.type === type);
  }

  getNotesByStatus(status: string): Note[] {
    return this.notes.filter(note => note.frontmatter.status === status);
  }

  getRecentNotes(limit: number = 10): Note[] {
    return this.applyRecencyBoost([...this.notes]).slice(0, limit);
  }
}
