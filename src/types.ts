export interface NoteFrontmatter {
  created: string;
  modified: string;
  tags: string[];
  type: 'note' | 'project' | 'task' | 'daily' | 'meeting';
  status: 'active' | 'archived' | 'idea' | 'completed';
  category: 'work' | 'personal' | 'knowledge' | 'life' | 'dailies';
}

export interface Note {
  path: string;
  title: string;
  content: string;
  frontmatter: NoteFrontmatter;
  excerpt?: string;
}

export interface SearchOptions {
  tags?: string[];
  type?: NoteFrontmatter['type'];
  status?: NoteFrontmatter['status'];
  category?: NoteFrontmatter['category'];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface VaultConfig {
  vaultPath: string;
  indexPatterns: string[];
  excludePatterns: string[];
  metadataFields: string[];
  searchWeights: {
    title: number;
    tags: number;
    frontmatter: number;
    content: number;
    recency: number;
  };
}
