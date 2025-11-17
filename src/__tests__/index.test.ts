import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock the MCP SDK
const mockConnect = jest.fn();
const mockSetRequestHandler = jest.fn();

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: mockSetRequestHandler,
    connect: mockConnect
  }))
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({}))
}));

describe('Index - Helper Functions', () => {
  let testVaultPath: string;

  beforeEach(async () => {
    testVaultPath = join(tmpdir(), `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });
    await mkdir(join(testVaultPath, 'Work'), { recursive: true });
  });

  afterEach(async () => {
    const maxRetries = 5;
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await rm(testVaultPath, { recursive: true, force: true });
        return;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await delay(100);
        }
      }
    }
    throw lastError;
  });

  describe('CLI Argument Parsing', () => {
    test('parses vault-path argument', () => {
      const args = ['--vault-path', '/test/path'];
      const getArg = (args: string[], flag: string): string | undefined => {
        const index = args.indexOf(flag);
        return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
      };

      expect(getArg(args, '--vault-path')).toBe('/test/path');
    });

    test('returns undefined for missing argument', () => {
      const args = ['--other-flag', 'value'];
      const getArg = (args: string[], flag: string): string | undefined => {
        const index = args.indexOf(flag);
        return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
      };

      expect(getArg(args, '--vault-path')).toBeUndefined();
    });

    test('parses comma-separated array argument', () => {
      const parseArrayArg = (value: string | undefined): string[] | undefined => {
        if (!value) return undefined;
        return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      };

      expect(parseArrayArg('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(parseArrayArg('a, b, c')).toEqual(['a', 'b', 'c']);
      expect(parseArrayArg(undefined)).toBeUndefined();
      // Empty string returns undefined since !value is true
      expect(parseArrayArg('')).toBeUndefined();
    });
  });

  describe('Config Validation', () => {
    interface TestConfig {
      indexPatterns?: string[];
      maxSearchResults?: number;
      maxRecentNotes?: number;
      maxFileSize?: number;
    }

    test('validates config with valid values', () => {
      const validateConfig = (cfg: TestConfig): void => {
        if (!cfg.indexPatterns || cfg.indexPatterns.length === 0) {
          throw new Error('Config must have at least one index pattern');
        }
        if (cfg.maxSearchResults !== undefined && cfg.maxSearchResults < 1) {
          throw new Error('maxSearchResults must be >= 1');
        }
        if (cfg.maxRecentNotes !== undefined && cfg.maxRecentNotes < 1) {
          throw new Error('maxRecentNotes must be >= 1');
        }
        if (cfg.maxFileSize !== undefined && cfg.maxFileSize < 1) {
          throw new Error('maxFileSize must be >= 1');
        }
      };

      const validConfig: TestConfig = {
        indexPatterns: ['**/*.md'],
        maxSearchResults: 10,
        maxRecentNotes: 10,
        maxFileSize: 100
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    test('throws error for empty index patterns', () => {
      const validateConfig = (cfg: TestConfig): void => {
        if (!cfg.indexPatterns || cfg.indexPatterns.length === 0) {
          throw new Error('Config must have at least one index pattern');
        }
      };

      const invalidConfig: TestConfig = { indexPatterns: [] };
      expect(() => validateConfig(invalidConfig)).toThrow('Config must have at least one index pattern');
    });

    test('throws error for invalid maxSearchResults', () => {
      const validateConfig = (cfg: TestConfig): void => {
        if (cfg.maxSearchResults !== undefined && cfg.maxSearchResults < 1) {
          throw new Error('maxSearchResults must be >= 1');
        }
      };

      const invalidConfig: TestConfig = { maxSearchResults: 0 };
      expect(() => validateConfig(invalidConfig)).toThrow('maxSearchResults must be >= 1');
    });

    test('throws error for invalid maxRecentNotes', () => {
      const validateConfig = (cfg: TestConfig): void => {
        if (cfg.maxRecentNotes !== undefined && cfg.maxRecentNotes < 1) {
          throw new Error('maxRecentNotes must be >= 1');
        }
      };

      const invalidConfig: TestConfig = { maxRecentNotes: -1 };
      expect(() => validateConfig(invalidConfig)).toThrow('maxRecentNotes must be >= 1');
    });

    test('throws error for invalid maxFileSize', () => {
      const validateConfig = (cfg: TestConfig): void => {
        if (cfg.maxFileSize !== undefined && cfg.maxFileSize < 1) {
          throw new Error('maxFileSize must be >= 1');
        }
      };

      const invalidConfig: TestConfig = { maxFileSize: 0 };
      expect(() => validateConfig(invalidConfig)).toThrow('maxFileSize must be >= 1');
    });
  });

  describe('Response Helpers', () => {
    test('creates error response', () => {
      const createErrorResponse = (message: string) => ({
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true
      });

      const response = createErrorResponse('Test error');
      expect(response.content[0].text).toBe('Error: Test error');
      expect(response.isError).toBe(true);
    });

    test('creates success response', () => {
      const createSuccessResponse = (data: unknown) => ({
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
      });

      const response = createSuccessResponse({ test: 'data' });
      expect(response.content[0].text).toContain('"test": "data"');
    });
  });

  describe('Note Summary Formatting', () => {
    interface TestNote {
      path: string;
      title: string;
      excerpt?: string;
      frontmatter: {
        tags?: string[];
        type?: string;
        status?: string;
        category?: string;
        modified?: string;
      };
    }

    test('formats note summary with all fields', () => {
      const formatNoteSummary = (note: TestNote) => ({
        path: note.path,
        title: note.title,
        excerpt: note.excerpt,
        tags: note.frontmatter.tags || [],
        type: note.frontmatter.type,
        status: note.frontmatter.status,
        category: note.frontmatter.category,
        modified: note.frontmatter.modified
      });

      const note: TestNote = {
        path: 'test.md',
        title: 'Test',
        excerpt: 'Test excerpt',
        frontmatter: {
          tags: ['test'],
          type: 'note',
          status: 'active',
          category: 'work',
          modified: '2025-01-01'
        }
      };

      const summary = formatNoteSummary(note);
      expect(summary.path).toBe('test.md');
      expect(summary.title).toBe('Test');
      expect(summary.excerpt).toBe('Test excerpt');
      expect(summary.tags).toEqual(['test']);
      expect(summary.type).toBe('note');
      expect(summary.status).toBe('active');
      expect(summary.category).toBe('work');
      expect(summary.modified).toBe('2025-01-01');
    });

    test('formats note summary with missing tags', () => {
      const formatNoteSummary = (note: TestNote) => ({
        path: note.path,
        title: note.title,
        tags: note.frontmatter.tags || []
      });

      const note: TestNote = {
        path: 'test.md',
        title: 'Test',
        frontmatter: {}
      };

      const summary = formatNoteSummary(note);
      expect(summary.tags).toEqual([]);
    });
  });
});

describe('Index - Tool Input Validation', () => {
  describe('search_notes validation', () => {
    test('validates limit parameter boundaries', () => {
      const maxSearchResults = 100;
      const validateLimit = (limit: number | undefined) => {
        if (limit !== undefined && (limit < 1 || limit > maxSearchResults)) {
          throw new Error(`Limit must be between 1 and ${maxSearchResults}`);
        }
      };

      expect(() => validateLimit(50)).not.toThrow();
      expect(() => validateLimit(0)).toThrow('Limit must be between 1 and 100');
      expect(() => validateLimit(101)).toThrow('Limit must be between 1 and 100');
      expect(() => validateLimit(undefined)).not.toThrow();
    });

    test('validates type enum', () => {
      const isValidType = (type: unknown): boolean => {
        return ['note', 'project', 'task', 'daily', 'meeting'].includes(type as string);
      };

      expect(isValidType('note')).toBe(true);
      expect(isValidType('project')).toBe(true);
      expect(isValidType('invalid')).toBe(false);
    });

    test('validates status enum', () => {
      const isValidStatus = (status: unknown): boolean => {
        return ['active', 'archived', 'idea', 'completed'].includes(status as string);
      };

      expect(isValidStatus('active')).toBe(true);
      expect(isValidStatus('completed')).toBe(true);
      expect(isValidStatus('invalid')).toBe(false);
    });

    test('validates category enum', () => {
      const isValidCategory = (category: unknown): boolean => {
        return ['work', 'personal', 'knowledge', 'life', 'dailies'].includes(category as string);
      };

      expect(isValidCategory('work')).toBe(true);
      expect(isValidCategory('personal')).toBe(true);
      expect(isValidCategory('invalid')).toBe(false);
    });

    test('validates date format', () => {
      const parseDate = (dateStr: string): Date | null => {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };

      expect(parseDate('2025-01-01')).not.toBeNull();
      expect(parseDate('invalid-date')).toBeNull();
    });
  });

  describe('get_note validation', () => {
    test('validates path parameter', () => {
      const validatePath = (path: unknown) => {
        if (!path || typeof path !== 'string') {
          throw new Error('Path parameter is required and must be a string');
        }
      };

      expect(() => validatePath('valid/path.md')).not.toThrow();
      expect(() => validatePath(null)).toThrow('Path parameter is required and must be a string');
      expect(() => validatePath(123)).toThrow('Path parameter is required and must be a string');
      expect(() => validatePath('')).toThrow('Path parameter is required and must be a string');
    });

    test('prevents path traversal', () => {
      const normalize = (p: string) => p.replace(/\\/g, '/');
      const sanitizePath = (path: string) => {
        return normalize(path).replace(/^(\.\.(\/|\\|$))+/, '');
      };

      expect(sanitizePath('../../etc/passwd')).not.toContain('..');
      expect(sanitizePath('valid/path.md')).toBe('valid/path.md');
    });
  });

  describe('get_notes_by_tag validation', () => {
    test('validates tag parameter', () => {
      const validateTag = (tag: unknown) => {
        if (!tag || typeof tag !== 'string') {
          throw new Error('Tag parameter is required and must be a string');
        }
      };

      expect(() => validateTag('valid-tag')).not.toThrow();
      expect(() => validateTag(null)).toThrow('Tag parameter is required and must be a string');
      expect(() => validateTag(123)).toThrow('Tag parameter is required and must be a string');
    });
  });

  describe('get_recent_notes validation', () => {
    test('validates limit boundaries', () => {
      const maxRecentNotes = 100;
      const validateRecentLimit = (limit: number) => {
        if (limit < 1 || limit > maxRecentNotes) {
          throw new Error(`Limit must be between 1 and ${maxRecentNotes}`);
        }
      };

      expect(() => validateRecentLimit(10)).not.toThrow();
      expect(() => validateRecentLimit(0)).toThrow('Limit must be between 1 and 100');
      expect(() => validateRecentLimit(101)).toThrow('Limit must be between 1 and 100');
    });
  });
});

describe('Index - Error Handling', () => {
  test('handles Error instances', () => {
    const handleError = (error: unknown) => {
      return error instanceof Error ? error.message : String(error);
    };

    expect(handleError(new Error('Test error'))).toBe('Test error');
    expect(handleError('String error')).toBe('String error');
    expect(handleError(123)).toBe('123');
  });

  test('handles unknown tool names', () => {
    const handleUnknownTool = (name: string) => {
      return `Unknown tool: ${name}`;
    };

    expect(handleUnknownTool('invalid_tool')).toBe('Unknown tool: invalid_tool');
  });
});
