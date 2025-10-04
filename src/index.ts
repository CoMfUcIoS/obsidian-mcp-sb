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

// Parse command line arguments for vault path
const args = process.argv.slice(2);
const vaultPathIndex = args.indexOf('--vault-path');
const vaultPath = vaultPathIndex !== -1 && args[vaultPathIndex + 1]
  ? args[vaultPathIndex + 1]
  : config.vaultPath;

// Create custom config with provided vault path
const vaultConfig: VaultConfig = {
  ...config,
  vaultPath
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
        const options: SearchOptions = {
          tags: args.tags as string[],
          type: args.type as any,
          status: args.status as any,
          category: args.category as any,
          dateFrom: args.dateFrom as string,
          dateTo: args.dateTo as string,
          limit: args.limit as number
        };

        const results = vault.searchNotes(args.query as string || '', options);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                results.map(note => ({
                  path: note.path,
                  title: note.title,
                  excerpt: note.excerpt,
                  tags: note.frontmatter.tags,
                  type: note.frontmatter.type,
                  status: note.frontmatter.status,
                  category: note.frontmatter.category,
                  modified: note.frontmatter.modified
                })),
                null,
                2
              )
            }
          ]
        };
      }

      case 'get_note': {
        const note = vault.getNote(args.path as string);
        if (!note) {
          return {
            content: [
              {
                type: 'text',
                text: `Note not found: ${args.path}`
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
        const notes = vault.getNotesByTag(args.tag as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                notes.map(note => ({
                  path: note.path,
                  title: note.title,
                  excerpt: note.excerpt,
                  tags: note.frontmatter.tags,
                  modified: note.frontmatter.modified
                })),
                null,
                2
              )
            }
          ]
        };
      }

      case 'get_recent_notes': {
        const limit = (args.limit as number) || 10;
        const notes = vault.getRecentNotes(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                notes.map(note => ({
                  path: note.path,
                  title: note.title,
                  excerpt: note.excerpt,
                  tags: note.frontmatter.tags,
                  modified: note.frontmatter.modified
                })),
                null,
                2
              )
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
          tags: args.tags as string[],
          type: args.type as any,
          status: args.status as any,
          category: args.category as any
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
          summary.byType[note.frontmatter.type] = (summary.byType[note.frontmatter.type] || 0) + 1;
          summary.byStatus[note.frontmatter.status] = (summary.byStatus[note.frontmatter.status] || 0) + 1;
          summary.byCategory[note.frontmatter.category] = (summary.byCategory[note.frontmatter.category] || 0) + 1;
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
  console.error(`Initializing Obsidian MCP Server...`);
  console.error(`Vault path: ${vaultPath}`);

  await vault.initialize();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Obsidian MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
