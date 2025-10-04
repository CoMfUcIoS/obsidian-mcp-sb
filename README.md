# Obsidian MCP Second Brain Server

An MCP (Model Context Protocol) server that provides intelligent access to your Obsidian vault, enabling it to function as a "second brain" for LLMs.

## Features

- **Semantic Search**: Full-text search across all notes with fuzzy matching
- **Tag-Based Filtering**: Search by hierarchical tags (e.g., `work/puppet`, `tech/golang`)
- **Temporal Queries**: Filter notes by creation/modification dates
- **Metadata Filtering**: Filter by type, status, and category
- **Note Retrieval**: Get full content of specific notes
- **Smart Summarization**: Generate summaries of note collections
- **Recent Notes**: Quick access to recently modified notes

## Installation

### Using npx (Recommended)

No installation needed! Use directly with npx:

```bash
npx -y @comfucios/obsidian-mcp-sb --vault-path "/path/to/your/vault"
```

### Local Development

```bash
cd obsidian-mcp-sb
npm install
npm run build
npm link
```

This makes the server available globally as `obsidian-mcp-sb`.

## Configuration

The server automatically detects your vault structure based on the standardized organization:

```
📁 Work/          - Professional context
📁 Projects/      - Personal projects
📁 Knowledge/     - Learning & references
📁 Life/          - Personal management
📁 Dailies/       - Journal entries
📁 Archive/       - Historical notes (excluded)
📁 _Meta/         - Vault management (excluded)
```

Configuration can be customized in `src/config.ts`.

## MCP Tools

### 1. `search_notes`
Search notes with optional filters.

**Parameters:**
- `query` (string, optional): Search query text
- `tags` (array, optional): Filter by tags (e.g., `["work/puppet", "golang"]`)
- `type` (enum, optional): `note`, `project`, `task`, `daily`, `meeting`
- `status` (enum, optional): `active`, `archived`, `idea`, `completed`
- `category` (enum, optional): `work`, `personal`, `knowledge`, `life`, `dailies`
- `dateFrom` (string, optional): Start date (YYYY-MM-DD)
- `dateTo` (string, optional): End date (YYYY-MM-DD)
- `limit` (number, optional): Max results (default: 20)

**Example:**
```json
{
  "query": "docker deployment",
  "tags": ["tech/devops"],
  "status": "active",
  "limit": 10
}
```

### 2. `get_note`
Retrieve full content of a specific note.

**Parameters:**
- `path` (string, required): Note path (e.g., `"Work/Puppet/Meeting Notes.md"`)

### 3. `get_notes_by_tag`
Get all notes with a specific tag.

**Parameters:**
- `tag` (string, required): Tag to search (e.g., `"work/puppet"`)

### 4. `get_recent_notes`
Get recently modified notes.

**Parameters:**
- `limit` (number, optional): Number of notes (default: 10)

### 5. `list_tags`
List all unique tags across the vault.

### 6. `summarize_notes`
Generate summary statistics for notes matching criteria.

**Parameters:**
- `tags` (array, optional): Filter by tags
- `type` (enum, optional): Filter by type
- `status` (enum, optional): Filter by status
- `category` (enum, optional): Filter by category

**Returns:**
```json
{
  "total": 58,
  "byType": { "note": 40, "meeting": 18 },
  "byStatus": { "active": 45, "archived": 13 },
  "byCategory": { "work": 58 },
  "recentlyModified": [...]
}
```

## Usage with Claude Code

Add to your MCP configuration file.

### Single Vault Configuration

**macOS/Linux:** Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** Edit `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "obsidian-sb": {
      "command": "npx",
      "args": [
        "-y",
        "@comfucios/obsidian-mcp-sb",
        "--vault-path",
        "/Users/ioanniskarasavvaidis/Documents/Obsidian Vault"
      ]
    }
  }
}
```

### Multiple Vault Configuration

You can configure multiple vault instances:

```json
{
  "mcpServers": {
    "obsidian-personal": {
      "command": "npx",
      "args": [
        "-y",
        "@comfucios/obsidian-mcp-sb",
        "--vault-path",
        "/Users/username/Documents/Personal Vault"
      ]
    },
    "obsidian-work": {
      "command": "npx",
      "args": [
        "-y",
        "@comfucios/obsidian-mcp-sb",
        "--vault-path",
        "/Users/username/Documents/Work Vault"
      ]
    }
  }
}
```

### Local Development Setup

If you're developing locally with `npm link`:

```json
{
  "mcpServers": {
    "obsidian-sb": {
      "command": "obsidian-mcp-sb",
      "args": [
        "--vault-path",
        "/path/to/your/vault"
      ]
    }
  }
}
```

## Example Queries

### Find Active Puppet Work
```json
{
  "tool": "search_notes",
  "tags": ["work/puppet"],
  "status": "active"
}
```

### Get Recent Meeting Notes
```json
{
  "tool": "search_notes",
  "type": "meeting",
  "limit": 5
}
```

### Find Project Ideas
```json
{
  "tool": "search_notes",
  "category": "projects",
  "status": "idea"
}
```

### Search Coffee Recipes
```json
{
  "tool": "search_notes",
  "query": "aeropress",
  "tags": ["coffee"]
}
```

### Get Work Summary
```json
{
  "tool": "summarize_notes",
  "category": "work"
}
```

## Frontmatter Requirements

All notes should include YAML frontmatter for optimal functionality:

```yaml
---
created: 2025-10-04
modified: 2025-10-04
tags: [tech/ai, project/active]
type: note
status: active
category: knowledge
---
```

## Search Weights

The server uses weighted search scoring:

- **Title**: 3.0x
- **Tags**: 2.5x
- **Frontmatter**: 2.0x
- **Content**: 1.0x
- **Recency Boost**: 1.5x

## Development

```bash
# Watch mode
npm run watch

# Build
npm run build

# Start server
npm start
```

## Architecture

- **`src/index.ts`**: MCP server implementation
- **`src/vault.ts`**: Vault indexing and search logic
- **`src/config.ts`**: Configuration management
- **`src/types.ts`**: TypeScript type definitions

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `gray-matter`: YAML frontmatter parsing
- `glob`: File pattern matching
- `fuse.js`: Fuzzy search functionality

## License

MIT
