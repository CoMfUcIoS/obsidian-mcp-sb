import { ObsidianVault } from '../vault.js';
import { VaultConfig } from '../types.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ObsidianVault', () => {
  let testVaultPath: string;
  let vault: ObsidianVault;
  let config: VaultConfig;

  beforeEach(async () => {
    // Create temporary test vault
    testVaultPath = join(tmpdir(), `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });
    await mkdir(join(testVaultPath, 'Work'), { recursive: true });
    await mkdir(join(testVaultPath, 'Archive'), { recursive: true });

    config = {
      vaultPath: testVaultPath,
      indexPatterns: ['**/*.md'],
      excludePatterns: ['Archive/**'],
      metadataFields: ['tags', 'type', 'status', 'category'],
      maxFileSize: 10 * 1024 * 1024,
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

    vault = new ObsidianVault(config);
  });

  afterEach(async () => {
    // Clean up test vault
    await rm(testVaultPath, { recursive: true, force: true });
  });

  describe('Path Security', () => {
    test('handles path traversal attempts safely', async () => {
      // Create a normal note
      await writeFile(
        join(testVaultPath, 'Work', 'test.md'),
        '---\ntags: [test]\n---\nTest content'
      );

      await vault.initialize();

      // Attempt to access file with path traversal
      const maliciousPath = '../../etc/passwd';
      const result = vault.getNote(maliciousPath);

      // Should not find the file (returns undefined)
      expect(result).toBeUndefined();
    });

    test('uses relative paths correctly', async () => {
      await writeFile(
        join(testVaultPath, 'Work', 'test.md'),
        '---\ntags: [test]\n---\nTest content'
      );

      await vault.initialize();
      const notes = vault.getAllNotes();

      // Path should be relative to vault root
      expect(notes[0].path).toBe('Work/test.md');
      expect(notes[0].path).not.toContain(testVaultPath);
    });
  });

  describe('Tag Matching', () => {
    beforeEach(async () => {
      await writeFile(
        join(testVaultPath, 'Work', 'note1.md'),
        '---\ntags: [work/puppet, tech/golang]\n---\nContent'
      );
      await writeFile(
        join(testVaultPath, 'Work', 'note2.md'),
        '---\ntags: [work, personal]\n---\nContent'
      );
    });

    test('matches exact tags', async () => {
      await vault.initialize();
      const notes = vault.getNotesByTag('work');
      expect(notes.length).toBe(2);
    });

    test('matches hierarchical tags (parent matches children)', async () => {
      await vault.initialize();
      const notes = vault.getNotesByTag('work');
      const puppetNotes = notes.filter(n => n.frontmatter.tags?.includes('work/puppet'));
      expect(puppetNotes.length).toBe(1);
    });

    test('prevents false positive matches', async () => {
      await writeFile(
        join(testVaultPath, 'Work', 'homework.md'),
        '---\ntags: [homework]\n---\nContent'
      );
      await vault.initialize();

      const workNotes = vault.getNotesByTag('work');
      const homeworkNote = workNotes.find(n => n.frontmatter.tags?.includes('homework'));

      // "homework" should NOT match "work" tag search
      expect(homeworkNote).toBeUndefined();
    });
  });

  describe('File Size Limits', () => {
    test('skips files exceeding max size', async () => {
      // Create a large file (> 10MB mock)
      const largeConfig = { ...config, maxFileSize: 100 }; // 100 bytes for testing
      vault = new ObsidianVault(largeConfig);

      const largeContent = 'x'.repeat(200); // 200 bytes
      await writeFile(
        join(testVaultPath, 'Work', 'large.md'),
        `---\ntags: [test]\n---\n${largeContent}`
      );

      await vault.initialize();
      const notes = vault.getAllNotes();

      // Large file should be skipped
      expect(notes.length).toBe(0);
    });

    test('indexes files within size limit', async () => {
      const normalContent = '---\ntags: [test]\n---\nNormal content';
      await writeFile(
        join(testVaultPath, 'Work', 'normal.md'),
        normalContent
      );

      await vault.initialize();
      const notes = vault.getAllNotes();

      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe('normal');
    });
  });

  describe('Frontmatter Validation', () => {
    test('applies default values for missing frontmatter', async () => {
      await writeFile(
        join(testVaultPath, 'Work', 'minimal.md'),
        'No frontmatter content'
      );

      await vault.initialize();
      const notes = vault.getAllNotes();

      expect(notes[0].frontmatter.type).toBe('note');
      expect(notes[0].frontmatter.status).toBe('active');
      expect(notes[0].frontmatter.category).toBe('personal');
      expect(notes[0].frontmatter.tags).toEqual([]);
    });

    test('validates and corrects invalid type values', async () => {
      await writeFile(
        join(testVaultPath, 'Work', 'invalid-type.md'),
        '---\ntype: invalid_type\n---\nContent'
      );

      await vault.initialize();
      const notes = vault.getAllNotes();

      // Should default to 'note' for invalid type
      expect(notes[0].frontmatter.type).toBe('note');
    });

    test('validates and corrects invalid status values', async () => {
      await writeFile(
        join(testVaultPath, 'Work', 'invalid-status.md'),
        '---\nstatus: invalid_status\n---\nContent'
      );

      await vault.initialize();
      const notes = vault.getAllNotes();

      // Should default to 'active' for invalid status
      expect(notes[0].frontmatter.status).toBe('active');
    });
  });

  describe('Archive Filtering', () => {
    test('excludes archived notes by default', async () => {
      await writeFile(
        join(testVaultPath, 'Work', 'active.md'),
        '---\ntags: [test]\n---\nContent'
      );
      await writeFile(
        join(testVaultPath, 'Archive', 'old.md'),
        '---\ntags: [test]\n---\nContent'
      );

      await vault.initialize();
      const notes = vault.searchNotes('', {});

      // Should only find the active note (Archive is in excludePatterns)
      expect(notes.length).toBe(1);
      expect(notes[0].path).toContain('Work');
    });
  });

  describe('Date Filtering', () => {
    test('filters notes by date range', async () => {
      await writeFile(
        join(testVaultPath, 'Work', 'old.md'),
        '---\nmodified: "2020-01-01"\n---\nContent'
      );
      await writeFile(
        join(testVaultPath, 'Work', 'recent.md'),
        '---\nmodified: "2025-01-01"\n---\nContent'
      );

      await vault.initialize();
      const allNotes = vault.getAllNotes();

      // Verify both notes were indexed
      expect(allNotes.length).toBe(2);

      const notes = vault.searchNotes('', {
        dateFrom: '2024-01-01'
      });

      expect(notes.length).toBe(1);
      expect(notes[0].frontmatter.modified).toBe('2025-01-01');
    });
  });
});
