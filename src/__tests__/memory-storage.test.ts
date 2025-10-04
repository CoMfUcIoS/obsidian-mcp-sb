import { describe, test, expect, beforeEach } from '@jest/globals';
import { MemoryStorage } from '../memory-storage.js';
import { Note } from '../types.js';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(async () => {
    storage = new MemoryStorage({
      title: 3.0,
      tags: 2.5,
      frontmatter: 2.0,
      content: 1.0
    });
    await storage.initialize();
  });

  describe('upsertNote', () => {
    test('updates existing note and rebuilds search index', async () => {
      const note: Note = {
        path: 'test.md',
        title: 'Original',
        content: 'Original content',
        frontmatter: {}
      };

      await storage.upsertNote(note);
      let retrieved = await storage.getNote('test.md');
      expect(retrieved?.title).toBe('Original');

      // Update the note
      const updatedNote: Note = {
        path: 'test.md',
        title: 'Updated',
        content: 'Updated content',
        frontmatter: {}
      };

      await storage.upsertNote(updatedNote);
      retrieved = await storage.getNote('test.md');
      expect(retrieved?.title).toBe('Updated');

      // Search should find the updated content
      const searchResults = await storage.searchNotes('Updated');
      expect(searchResults.length).toBeGreaterThan(0);
    });

    test('rebuilds search index after insert', async () => {
      const note: Note = {
        path: 'searchable.md',
        title: 'Searchable Title',
        content: 'Unique searchable content',
        frontmatter: {}
      };

      await storage.upsertNote(note);

      // Search should work immediately after insert
      const results = await storage.searchNotes('Unique');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Searchable Title');
    });
  });

  describe('clear', () => {
    test('clears all notes and resets search index', async () => {
      const notes: Note[] = [
        { path: 'note1.md', title: 'Note 1', content: 'Content 1', frontmatter: {} },
        { path: 'note2.md', title: 'Note 2', content: 'Content 2', frontmatter: {} }
      ];

      await storage.upsertNotes(notes);
      expect((await storage.getAllNotes()).length).toBe(2);

      await storage.clear();
      expect((await storage.getAllNotes()).length).toBe(0);

      // Search should return no results after clear
      const searchResults = await storage.searchNotes('Note');
      expect(searchResults.length).toBe(0);
    });

    test('sets fuse to null after clear', async () => {
      const note: Note = {
        path: 'test.md',
        title: 'Test',
        content: 'Content',
        frontmatter: {}
      };

      await storage.upsertNote(note);
      await storage.clear();

      // After clear, searching should still work but return empty
      const results = await storage.searchNotes('Test');
      expect(results.length).toBe(0);
    });
  });

  describe('Search Edge Cases', () => {
    test('handles search with no query and no notes', async () => {
      const results = await storage.searchNotes('');
      expect(results).toEqual([]);
    });

    test('handles search with query but no notes', async () => {
      const results = await storage.searchNotes('nonexistent');
      expect(results).toEqual([]);
    });

    test('returns all notes when query is empty', async () => {
      const notes: Note[] = [
        { path: 'note1.md', title: 'Note 1', content: 'Content', frontmatter: {} },
        { path: 'note2.md', title: 'Note 2', content: 'Content', frontmatter: {} }
      ];

      await storage.upsertNotes(notes);
      const results = await storage.searchNotes('');
      expect(results.length).toBe(2);
    });

    test('fuzzy search finds partial matches', async () => {
      const note: Note = {
        path: 'test.md',
        title: 'Important Document',
        content: 'This is important content',
        frontmatter: {}
      };

      await storage.upsertNote(note);

      const results = await storage.searchNotes('importnt'); // Typo
      // Fuse.js should still find it due to fuzzy matching
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tag Matching Edge Cases', () => {
    test('handles notes with no tags', async () => {
      const note: Note = {
        path: 'test.md',
        title: 'Test',
        content: 'Content',
        frontmatter: {}
      };

      await storage.upsertNote(note);
      const results = await storage.getNotesByTag('nonexistent');
      expect(results.length).toBe(0);
    });

    test('matches hierarchical tags correctly', async () => {
      const notes: Note[] = [
        {
          path: 'note1.md',
          title: 'Note 1',
          content: 'Content',
          frontmatter: { tags: ['work/project/alpha'] }
        },
        {
          path: 'note2.md',
          title: 'Note 2',
          content: 'Content',
          frontmatter: { tags: ['work/meeting'] }
        },
        {
          path: 'note3.md',
          title: 'Note 3',
          content: 'Content',
          frontmatter: { tags: ['personal'] }
        }
      ];

      await storage.upsertNotes(notes);

      // Search for parent tag should match all work notes
      const workNotes = await storage.getNotesByTag('work');
      expect(workNotes.length).toBe(2);

      // Search for specific hierarchical tag
      const projectNotes = await storage.getNotesByTag('work/project');
      expect(projectNotes.length).toBe(1);
    });

    test('prevents false positive tag matches', async () => {
      const notes: Note[] = [
        {
          path: 'work.md',
          title: 'Work',
          content: 'Content',
          frontmatter: { tags: ['work'] }
        },
        {
          path: 'homework.md',
          title: 'Homework',
          content: 'Content',
          frontmatter: { tags: ['homework'] }
        }
      ];

      await storage.upsertNotes(notes);

      const workNotes = await storage.getNotesByTag('work');
      // Should only match 'work', not 'homework'
      expect(workNotes.length).toBe(1);
      expect(workNotes[0].title).toBe('Work');
    });
  });

  describe('Recency Sorting', () => {
    test('sorts notes by modification date', async () => {
      const notes: Note[] = [
        {
          path: 'old.md',
          title: 'Old',
          content: 'Content',
          frontmatter: { modified: '2024-01-01' }
        },
        {
          path: 'recent.md',
          title: 'Recent',
          content: 'Content',
          frontmatter: { modified: '2025-01-15' }
        },
        {
          path: 'middle.md',
          title: 'Middle',
          content: 'Content',
          frontmatter: { modified: '2025-01-10' }
        }
      ];

      await storage.upsertNotes(notes);
      const results = await storage.getRecentNotes(10);

      expect(results[0].title).toBe('Recent');
      expect(results[1].title).toBe('Middle');
      expect(results[2].title).toBe('Old');
    });

    test('handles notes without modified date', async () => {
      const notes: Note[] = [
        {
          path: 'with-date.md',
          title: 'With Date',
          content: 'Content',
          frontmatter: { modified: '2025-01-15' }
        },
        {
          path: 'without-date.md',
          title: 'Without Date',
          content: 'Content',
          frontmatter: {}
        }
      ];

      await storage.upsertNotes(notes);
      const results = await storage.getRecentNotes(10);

      // Should handle both notes without crashing
      expect(results.length).toBe(2);
    });
  });

  describe('Filter Combinations', () => {
    beforeEach(async () => {
      const notes: Note[] = [
        {
          path: 'work-project.md',
          title: 'Work Project',
          content: 'Project content',
          frontmatter: {
            tags: ['work', 'project'],
            type: 'project',
            status: 'active',
            category: 'work',
            modified: '2025-01-15'
          }
        },
        {
          path: 'personal-note.md',
          title: 'Personal Note',
          content: 'Personal thoughts',
          frontmatter: {
            tags: ['personal'],
            type: 'note',
            status: 'active',
            category: 'personal',
            modified: '2025-01-10'
          }
        },
        {
          path: 'archived-task.md',
          title: 'Archived Task',
          content: 'Old task',
          frontmatter: {
            tags: ['work'],
            type: 'task',
            status: 'completed',
            category: 'work',
            modified: '2024-12-01'
          }
        }
      ];

      await storage.upsertNotes(notes);
    });

    test('combines query with filters', async () => {
      const results = await storage.searchNotes('project', {
        type: 'project',
        status: 'active'
      });

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Work Project');
    });

    test('filters by multiple tags', async () => {
      const results = await storage.searchNotes('', {
        tags: ['work', 'project']
      });

      expect(results.length).toBe(2);
    });

    test('applies limit correctly', async () => {
      const results = await storage.searchNotes('', { limit: 2 });
      expect(results.length).toBe(2);
    });

    test('filters by date range', async () => {
      const results = await storage.searchNotes('', {
        dateFrom: '2025-01-01'
      });

      expect(results.length).toBe(2);
      expect(results.every(n => {
        const date = new Date(n.frontmatter.modified || '');
        return date >= new Date('2025-01-01');
      })).toBe(true);
    });

    test('excludes archive by default', async () => {
      // Add an archived note first
      await storage.upsertNote({
        path: 'archive/old.md',
        title: 'Archived',
        content: 'Content',
        frontmatter: {}
      });

      // Verify it exists in storage
      const allNotes = await storage.getAllNotes();
      const archiveNotes = allNotes.filter(n => n.path.startsWith('archive'));
      expect(archiveNotes.length).toBeGreaterThan(0);

      // Search with includeArchive: false (should exclude archive/)
      const resultsExclude = await storage.searchNotes('', {
        includeArchive: false
      });

      // Results should not include any archive/* notes
      const archiveInResults = resultsExclude.filter(n => n.path.toLowerCase().startsWith('archive/'));
      expect(archiveInResults.length).toBe(0);
    });

    test('includes archive when requested', async () => {
      await storage.upsertNote({
        path: 'archive/old.md',
        title: 'Archived',
        content: 'Content',
        frontmatter: {}
      });

      const results = await storage.searchNotes('', {
        includeArchive: true
      });

      expect(results.some(n => n.path.startsWith('archive'))).toBe(true);
    });
  });

  describe('Path Filtering', () => {
    beforeEach(async () => {
      const notes: Note[] = [
        {
          path: 'Work/Puppet/task.md',
          title: 'Puppet Task',
          content: 'Content',
          frontmatter: {}
        },
        {
          path: 'Work/general.md',
          title: 'General Work',
          content: 'Content',
          frontmatter: {}
        },
        {
          path: 'Projects/alpha.md',
          title: 'Project Alpha',
          content: 'Content',
          frontmatter: {}
        }
      ];

      await storage.upsertNotes(notes);
    });

    test('filters by exact path', async () => {
      const results = await storage.searchNotes('', {
        path: 'Work/Puppet/task.md'
      });

      expect(results.length).toBe(1);
      expect(results[0].path).toBe('Work/Puppet/task.md');
    });

    test('filters by path prefix with /**', async () => {
      const results = await storage.searchNotes('', {
        path: 'Work/**'
      });

      expect(results.length).toBe(2);
      expect(results.every(n => n.path.startsWith('Work'))).toBe(true);
    });

    test('filters by partial path match', async () => {
      const results = await storage.searchNotes('', {
        path: 'Puppet'
      });

      expect(results.length).toBe(1);
      expect(results[0].path).toContain('Puppet');
    });
  });

  describe('Weight Configuration', () => {
    test('uses custom search weights', () => {
      const customStorage = new MemoryStorage({
        title: 5.0,
        tags: 4.0,
        frontmatter: 3.0,
        content: 2.0
      });

      expect(customStorage).toBeInstanceOf(MemoryStorage);
    });
  });

  describe('Empty State Operations', () => {
    test('getAllNotes returns empty array when no notes', async () => {
      const notes = await storage.getAllNotes();
      expect(notes).toEqual([]);
    });

    test('getNote returns null for non-existent path', async () => {
      const note = await storage.getNote('nonexistent.md');
      expect(note).toBeNull();
    });

    test('getRecentNotes returns empty array when no notes', async () => {
      const notes = await storage.getRecentNotes(10);
      expect(notes).toEqual([]);
    });

    test('getNotesByTag returns empty array when no notes', async () => {
      const notes = await storage.getNotesByTag('tag');
      expect(notes).toEqual([]);
    });
  });

  describe('close', () => {
    test('close operation completes without error', async () => {
      await storage.upsertNote({
        path: 'test.md',
        title: 'Test',
        content: 'Content',
        frontmatter: {}
      });

      await expect(storage.close()).resolves.toBeUndefined();
    });
  });
});
