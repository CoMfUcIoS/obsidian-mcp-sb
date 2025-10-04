#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { ObsidianVault } from './vault.js';
import { config } from './config.js';
import { SearchOptions, VaultConfig } from './types.js';
import { existsSync, statSync } from 'fs';
import { resolve, normalize, join } from 'path';

/**
 * Validates if a string is in YYYY-MM-DD format
 */
function isValidDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Formats a note summary for consistent response format
 */
interface NoteSummary {
  path: string;
  title: string;
  excerpt?: string;
  tags?: string[];
  type?: string;
  status?: string;
  category?: string;
  modified?: string;
}

function formatNoteSummary(note: any): NoteSummary {
  return {
    path: note.path,
    title: note.title,
    excerpt: note.excerpt,
    tags: note.frontmatter.tags || [],
    type: note.frontmatter.type,
    status: note.frontmatter.status,
    category: note.frontmatter.category,
    modified: note.frontmatter.modified
  };
}

// Parse command line arguments for vault path
const args = process.argv.slice(2);
const vaultPathIndex = args.indexOf('--vault-path');
const vaultPath = vaultPathIndex !== -1 && args[vaultPathIndex + 1]
  ? args[vaultPathIndex + 1]
  : config.vaultPath;

// Validate vault path
if (!vaultPath) {
  console.error('Error: Vault path is required. Please provide --vault-path argument.');
  console.error('Example: obsidian-mcp-sb --vault-path "/path/to/vault"');
  process.exit(1);
}

const resolvedVaultPath = resolve(vaultPath);

if (!existsSync(resolvedVaultPath)) {
  console.error(`Error: Vault path does not exist: ${resolvedVaultPath}`);
  process.exit(1);
}

const vaultStats = statSync(resolvedVaultPath);
if (!vaultStats.isDirectory()) {
  console.error(`Error: Vault path is not a directory: ${resolvedVaultPath}`);
  process.exit(1);
}

// Create custom config with validated vault path
const vaultConfig: VaultConfig = {
  ...config,
  vaultPath: resolvedVaultPath
};

const vault = new ObsidianVault(vaultConfig);

const server = new Server(
  {
    name: 'obsidian-mcp-sb',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const tools: Tool[] = [
  {
    name: 'search_notes',
    description: 'Search notes in the Obsidian vault using semantic search with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (optional - leave empty to list all notes with filters)'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (e.g., ["work/puppet", "golang"])'
        },
        type: {
          type: 'string',
          enum: ['note', 'project', 'task', 'daily', 'meeting'],
          description: 'Filter by note type'
        },
        status: {
          type: 'string',
          enum: ['active', 'archived', 'idea', 'completed'],
          description: 'Filter by status'
        },
        category: {
          type: 'string',
          enum: ['work', 'personal', 'knowledge', 'life', 'dailies'],
          description: 'Filter by category'
        },
        dateFrom: {
          type: 'string',
          description: 'Filter notes modified from this date (YYYY-MM-DD)'
        },
        dateTo: {
          type: 'string',
          description: 'Filter notes modified until this date (YYYY-MM-DD)'
        },
        path: {
          type: 'string',
          description: 'Filter by path pattern (e.g., "Work/Puppet/**", "Projects/Active/**")'
        },
        includeArchive: {
          type: 'boolean',
          description: 'Include archived notes in results (default: false)',
          default: false
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)',
          default: 20
        }
      }
    }
  },
  {
    name: 'get_note',
    description: 'Retrieve the full content of a specific note by its path',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the note (e.g., "Work/Puppet/Meeting Notes.md")'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'get_notes_by_tag',
    description: 'Get all notes with a specific tag',
    inputSchema: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Tag to search for (e.g., "work/puppet", "coffee", "golang")'
        }
      },
      required: ['tag']
    }
  },
  {
    name: 'get_recent_notes',
    description: 'Get the most recently modified notes',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of recent notes to retrieve (default: 10)',
          default: 10
        }
      }
    }
  },
  {
    name: 'list_tags',
    description: 'List all unique tags used across all notes',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'summarize_notes',
    description: 'Get a summary of notes matching criteria',
    inputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags'
        },
        type: {
          type: 'string',
          enum: ['note', 'project', 'task', 'daily', 'meeting'],
          description: 'Filter by note type'
        },
        status: {
          type: 'string',
          enum: ['active', 'archived', 'idea', 'completed'],
          description: 'Filter by status'
        },
        category: {
          type: 'string',
          enum: ['work', 'personal', 'knowledge', 'life', 'dailies'],
          description: 'Filter by category'
        }
      }
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_notes': {
        // Validate limit parameter
        const limit = args?.limit as number | undefined;
        if (limit !== undefined && (limit < 1 || limit > 100)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Limit must be between 1 and 100'
              }
            ],
            isError: true
          };
        }

        // Validate date formats if provided
        if (args?.dateFrom && !isValidDateFormat(args.dateFrom as string)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: dateFrom must be in YYYY-MM-DD format'
              }
            ],
            isError: true
          };
        }

        if (args?.dateTo && !isValidDateFormat(args.dateTo as string)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: dateTo must be in YYYY-MM-DD format'
              }
            ],
            isError: true
          };
        }

        const options: SearchOptions = {
          tags: args?.tags as string[],
          type: args?.type as any,
          status: args?.status as any,
          category: args?.category as any,
          dateFrom: args?.dateFrom as string,
          dateTo: args?.dateTo as string,
          path: args?.path as string,
          includeArchive: args?.includeArchive as boolean,
          limit: limit
        };

        const results = vault.searchNotes(args?.query as string || '', options);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results.map(formatNoteSummary), null, 2)
            }
          ]
        };
      }

      case 'get_note': {
        const requestedPath = args?.path as string;

        if (!requestedPath) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Path parameter is required'
              }
            ],
            isError: true
          };
        }

        // Sanitize path to prevent directory traversal
        const normalizedPath = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
        const fullPath = resolve(vaultConfig.vaultPath, normalizedPath);

        // Ensure the resolved path is within the vault
        if (!fullPath.startsWith(vaultConfig.vaultPath)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Access denied. Path is outside vault directory.'
              }
            ],
            isError: true
          };
        }

        const note = vault.getNote(normalizedPath);
        if (!note) {
          return {
            content: [
              {
                type: 'text',
                text: `Note not found: ${normalizedPath}`
              }
            ],
            isError: true
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(note, null, 2)
            }
          ]
        };
      }

      case 'get_notes_by_tag': {
        const tag = args?.tag as string;

        if (!tag) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Tag parameter is required'
              }
            ],
            isError: true
          };
        }

        const notes = vault.getNotesByTag(tag);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(notes.map(formatNoteSummary), null, 2)
            }
          ]
        };
      }

      case 'get_recent_notes': {
        const limit = (args?.limit as number) || 10;

        if (limit < 1 || limit > 100) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Limit must be between 1 and 100'
              }
            ],
            isError: true
          };
        }

        const notes = vault.getRecentNotes(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(notes.map(formatNoteSummary), null, 2)
            }
          ]
        };
      }

      case 'list_tags': {
        const allNotes = vault.getAllNotes();
        const tagSet = new Set<string>();
        allNotes.forEach(note => {
          note.frontmatter.tags?.forEach(tag => tagSet.add(tag));
        });
        const sortedTags = Array.from(tagSet).sort();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sortedTags, null, 2)
            }
          ]
        };
      }

      case 'summarize_notes': {
        const options: SearchOptions = {
          tags: args?.tags as string[],
          type: args?.type as any,
          status: args?.status as any,
          category: args?.category as any
        };

        const notes = vault.searchNotes('', options);

        const summary = {
          total: notes.length,
          byType: {} as Record<string, number>,
          byStatus: {} as Record<string, number>,
          byCategory: {} as Record<string, number>,
          recentlyModified: notes.slice(0, 5).map(n => ({
            title: n.title,
            path: n.path,
            modified: n.frontmatter.modified
          }))
        };

        notes.forEach(note => {
          if (note.frontmatter.type) {
            summary.byType[note.frontmatter.type] = (summary.byType[note.frontmatter.type] || 0) + 1;
          }
          if (note.frontmatter.status) {
            summary.byStatus[note.frontmatter.status] = (summary.byStatus[note.frontmatter.status] || 0) + 1;
          }
          if (note.frontmatter.category) {
            summary.byCategory[note.frontmatter.category] = (summary.byCategory[note.frontmatter.category] || 0) + 1;
          }
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2)
            }
          ]
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`
            }
          ],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  try {
    console.error(`Initializing Obsidian MCP Server...`);
    console.error(`Vault path: ${resolvedVaultPath}`);

    await vault.initialize();

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Obsidian MCP Server running on stdio');
  } catch (error) {
    console.error('Fatal error during initialization:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error in main:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
