import { VaultConfig } from './types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config: VaultConfig = {
  vaultPath: join(__dirname, '../..'),
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
    'obsidian-mcp-sb/**'
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
