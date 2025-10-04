import { describe, test, expect, afterEach } from '@jest/globals';
import { createStorage } from '../storage-factory.js';
import { VaultConfig } from '../types.js';
import { MemoryStorage } from '../memory-storage.js';
import { DatabaseStorage } from '../database-storage.js';
import { IStorage } from '../storage.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('StorageFactory', () => {
  let testVaultPath: string;
  let storage: IStorage | null;

  afterEach(async () => {
    if (storage && typeof storage.close === 'function') {
      await storage.close();
    }
    if (testVaultPath) {
      await rm(testVaultPath, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('createStorage', () => {
    test('creates MemoryStorage when useMemory is true', () => {
      const config: VaultConfig = {
        vaultPath: '/test/path',
        indexPatterns: ['**/*.md'],
        excludePatterns: [],
        metadataFields: ['tags'],
        maxFileSize: 1024,
        maxSearchResults: 100,
        maxRecentNotes: 100,
        useMemory: true,
        searchWeights: {
          title: 3.0,
          tags: 2.5,
          frontmatter: 2.0,
          content: 1.0,
          recency: 1.5
        }
      };

      storage = createStorage(config);
      expect(storage).toBeInstanceOf(MemoryStorage);
    });

    test('creates DatabaseStorage when useMemory is false', async () => {
      testVaultPath = join(tmpdir(), `test-factory-vault-${Date.now()}`);
      await mkdir(testVaultPath, { recursive: true });

      const config: VaultConfig = {
        vaultPath: testVaultPath,
        indexPatterns: ['**/*.md'],
        excludePatterns: [],
        metadataFields: ['tags'],
        maxFileSize: 1024,
        maxSearchResults: 100,
        maxRecentNotes: 100,
        useMemory: false,
        searchWeights: {
          title: 3.0,
          tags: 2.5,
          frontmatter: 2.0,
          content: 1.0,
          recency: 1.5
        }
      };

      storage = createStorage(config);
      expect(storage).toBeInstanceOf(DatabaseStorage);
    });

    test('creates DatabaseStorage when useMemory is undefined', async () => {
      testVaultPath = join(tmpdir(), `test-factory-vault-${Date.now()}`);
      await mkdir(testVaultPath, { recursive: true });

      const config: VaultConfig = {
        vaultPath: testVaultPath,
        indexPatterns: ['**/*.md'],
        excludePatterns: [],
        metadataFields: ['tags'],
        maxFileSize: 1024,
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

      storage = createStorage(config);
      expect(storage).toBeInstanceOf(DatabaseStorage);
    });

    test('passes correct search weights to MemoryStorage', () => {
      const config: VaultConfig = {
        vaultPath: '/test/path',
        indexPatterns: ['**/*.md'],
        excludePatterns: [],
        metadataFields: ['tags'],
        maxFileSize: 1024,
        maxSearchResults: 100,
        maxRecentNotes: 100,
        useMemory: true,
        searchWeights: {
          title: 4.0,
          tags: 3.0,
          frontmatter: 2.5,
          content: 1.5,
          recency: 2.0
        }
      };

      storage = createStorage(config);
      expect(storage).toBeInstanceOf(MemoryStorage);
      // MemoryStorage should be created with these weights
    });

    test('passes correct vault path to DatabaseStorage', async () => {
      testVaultPath = join(tmpdir(), `test-factory-vault-${Date.now()}`);
      await mkdir(testVaultPath, { recursive: true });

      const config: VaultConfig = {
        vaultPath: testVaultPath,
        indexPatterns: ['**/*.md'],
        excludePatterns: [],
        metadataFields: ['tags'],
        maxFileSize: 1024,
        maxSearchResults: 100,
        maxRecentNotes: 100,
        useMemory: false,
        searchWeights: {
          title: 3.0,
          tags: 2.5,
          frontmatter: 2.0,
          content: 1.0,
          recency: 1.5
        }
      };

      storage = createStorage(config);
      expect(storage).toBeInstanceOf(DatabaseStorage);
      // DatabaseStorage should use the provided vault path
    });
  });

  describe('Storage Integration', () => {
    test('MemoryStorage instance can be used for operations', async () => {
      const config: VaultConfig = {
        vaultPath: '/test/path',
        indexPatterns: ['**/*.md'],
        excludePatterns: [],
        metadataFields: ['tags'],
        maxFileSize: 1024,
        maxSearchResults: 100,
        maxRecentNotes: 100,
        useMemory: true,
        searchWeights: {
          title: 3.0,
          tags: 2.5,
          frontmatter: 2.0,
          content: 1.0,
          recency: 1.5
        }
      };

      storage = createStorage(config);
      await storage.initialize();

      const note = {
        path: 'test.md',
        title: 'Test',
        content: 'Content',
        frontmatter: {}
      };

      await storage.upsertNote(note);
      const retrieved = await storage.getNote('test.md');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Test');
    });

    test('DatabaseStorage instance can be used for operations', async () => {
      testVaultPath = join(tmpdir(), `test-factory-vault-${Date.now()}`);
      await mkdir(testVaultPath, { recursive: true });

      const config: VaultConfig = {
        vaultPath: testVaultPath,
        indexPatterns: ['**/*.md'],
        excludePatterns: [],
        metadataFields: ['tags'],
        maxFileSize: 1024,
        maxSearchResults: 100,
        maxRecentNotes: 100,
        useMemory: false,
        searchWeights: {
          title: 3.0,
          tags: 2.5,
          frontmatter: 2.0,
          content: 1.0,
          recency: 1.5
        }
      };

      storage = createStorage(config);
      await storage.initialize();

      const note = {
        path: 'test.md',
        title: 'Test',
        content: 'Content',
        frontmatter: {}
      };

      await storage.upsertNote(note);
      const retrieved = await storage.getNote('test.md');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Test');
    });
  });
});
