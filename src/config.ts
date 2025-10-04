import { VaultConfig } from './types.js';

export const config: VaultConfig = {
  // Vault path must be provided via --vault-path CLI argument
  // This ensures explicit configuration and prevents accidental indexing
  vaultPath: '',
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
  searchWeights: {
    title: 3.0,
    tags: 2.5,
    frontmatter: 2.0,
    content: 1.0,
    recency: 1.5
  }
};
