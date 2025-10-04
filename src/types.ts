/**
 * YAML frontmatter structure for Obsidian notes
 */
export interface NoteFrontmatter {
  /** Creation date in YYYY-MM-DD format */
  created?: string;
  /** Last modification date in YYYY-MM-DD format */
  modified?: string;
  /** Array of hierarchical tags (e.g., ["work/puppet", "tech/golang"]) */
  tags?: string[];
  /** Type of note */
  type?: 'note' | 'project' | 'task' | 'daily' | 'meeting';
  /** Current status of the note */
  status?: 'active' | 'archived' | 'idea' | 'completed';
  /** Category for organizational purposes */
  category?: 'work' | 'personal' | 'knowledge' | 'life' | 'dailies';
  /** Allow additional custom frontmatter fields */
  [key: string]: any;
}

/**
 * Represents a single note in the vault
 */
export interface Note {
  /** Relative path from vault root */
  path: string;
  /** Note title (filename without extension) */
  title: string;
  /** Full markdown content */
  content: string;
  /** Parsed YAML frontmatter */
  frontmatter: NoteFrontmatter;
  /** Plain text excerpt (markdown stripped) */
  excerpt?: string;
}

/**
 * Search and filter options for querying notes
 */
export interface SearchOptions {
  /** Filter by tags (supports hierarchical matching) */
  tags?: string[];
  /** Filter by note type */
  type?: NoteFrontmatter['type'];
  /** Filter by status */
  status?: NoteFrontmatter['status'];
  /** Filter by category */
  category?: NoteFrontmatter['category'];
  /** Filter notes modified from this date (YYYY-MM-DD) */
  dateFrom?: string;
  /** Filter notes modified until this date (YYYY-MM-DD) */
  dateTo?: string;
  /** Maximum number of results to return (1-100) */
  limit?: number;
}

/**
 * Configuration for vault indexing and search
 */
export interface VaultConfig {
  /** Absolute path to the Obsidian vault directory */
  vaultPath: string;
  /** Glob patterns for files to index */
  indexPatterns: string[];
  /** Glob patterns for files to exclude */
  excludePatterns: string[];
  /** Metadata fields to extract from frontmatter */
  metadataFields: string[];
  /** Search scoring weights */
  searchWeights: {
    /** Weight for title matches */
    title: number;
    /** Weight for tag matches */
    tags: number;
    /** Weight for frontmatter matches */
    frontmatter: number;
    /** Weight for content matches */
    content: number;
    /** Weight boost for recent notes */
    recency: number;
  };
}
