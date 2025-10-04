import { defaultConfig } from '../config.js';

describe('Config', () => {
  test('exports valid default configuration', () => {
    expect(defaultConfig).toBeDefined();
    expect(defaultConfig.indexPatterns).toEqual([
      'Work/**/*.md',
      'Projects/**/*.md',
      'Knowledge/**/*.md',
      'Life/**/*.md',
      'Dailies/**/*.md'
    ]);
    expect(defaultConfig.excludePatterns).toEqual([
      'Archive/**/*.md',
      '_Meta/Attachments/**',
      '.trash/**',
      'node_modules/**',
      '.git/**'
    ]);
    expect(defaultConfig.metadataFields).toEqual([
      'tags',
      'type',
      'status',
      'category',
      'created',
      'modified'
    ]);
    expect(defaultConfig.maxFileSize).toBe(10 * 1024 * 1024);
    expect(defaultConfig.maxSearchResults).toBe(100);
    expect(defaultConfig.maxRecentNotes).toBe(100);
    expect(defaultConfig.searchWeights).toEqual({
      title: 3.0,
      tags: 2.5,
      frontmatter: 2.0,
      content: 1.0,
      recency: 1.5
    });
  });
});
