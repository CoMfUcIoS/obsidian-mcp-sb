import { VaultConfig } from './types.js';
import { IStorage } from './storage.js';
import { DatabaseStorage } from './database-storage.js';
import { MemoryStorage } from './memory-storage.js';

/**
 * Factory for creating storage instances based on configuration
 */
export function createStorage(config: VaultConfig): IStorage {
  if (config.useMemory) {
    console.error('Using in-memory storage (Fuse.js)');
    return new MemoryStorage({
      title: config.searchWeights.title,
      tags: config.searchWeights.tags,
      frontmatter: config.searchWeights.frontmatter,
      content: config.searchWeights.content
    });
  }

  console.error('Using database storage (SQLite)');
  return new DatabaseStorage(config.vaultPath);
}
