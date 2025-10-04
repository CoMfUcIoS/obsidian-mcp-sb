import { VaultConfig } from './types.js';

/**
 * Default configuration values
 * These can be overridden via CLI arguments in mcp.json
 */
export const defaultConfig: Partial<VaultConfig> = {
  indexPatterns: [
    'Work/**/*.md',
    'Projects/**/*.md',
    'Knowledge/**/*.md',
    'Life/**/*.md',
    'Dailies/**/*.md'
  ],
  excludePatterns: [
    'Archive/**/*.md',
    '_Meta/Attachments/**',
    '.trash/**',
    'node_modules/**',
    '.git/**'
  ],
  metadataFields: ['tags', 'type', 'status', 'category', 'created', 'modified'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxSearchResults: 100,
  maxRecentNotes: 100,
  searchWeights: {
    title: 3.0,
    tags: 2.5,
    frontmatter: 2.0,
    content: 1.0,
    recency: 1.5
  }
};
