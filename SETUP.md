# Setup Guide

## Quick Start with npx (Recommended)

No installation needed! Just configure Claude Code:

1. **Edit your MCP configuration file:**

   **macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add this configuration:**

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

   **Important:** Replace the vault path with your actual Obsidian vault location.

3. **Restart Claude Code**

   The MCP server will automatically download and run via npx!

## Multiple Vaults

You can configure multiple vaults by adding multiple server entries:

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

## Local Development Setup

For development or customization:

1. **Install dependencies**

   ```bash
   cd obsidian-mcp-sb
   npm install
   ```

2. **Build the server**

   ```bash
   npm run build
   ```

3. **Link globally**

   ```bash
   npm link
   ```

4. **Configure Claude Code with local version:**

   ```json
   {
     "mcpServers": {
       "obsidian-sb": {
         "command": "obsidian-mcp-sb",
         "args": ["--vault-path", "/path/to/your/vault"]
       }
     }
   }
   ```

5. **Restart Claude Code**

## Testing the Server

You can test the server directly using stdio:

```bash
cd obsidian-mcp-sb
npm start
```

Then send MCP protocol messages via stdin.

## Verification

After setup, you can verify the server is working by asking Claude:

- "Search my notes for docker"
- "Show me active Puppet work"
- "List all my project ideas"
- "What are my recent meeting notes?"

## Troubleshooting

### Server not appearing in Claude Code

1. Check the configuration file path is correct
2. Verify the `dist/index.js` file exists (run `npm run build`)
3. Check Claude Code logs for errors
4. Restart Claude Code completely

### Notes not being indexed

1. Verify your vault structure matches the expected layout
2. Check that notes have proper frontmatter
3. Look at console output when server starts (it shows indexed count and errors)
4. Verify paths in `src/config.ts` are correct
5. Check if files exceed `maxFileSize` limit (default 10MB)
6. Large files will be skipped with a warning in the console

### Search returns no results

1. Ensure frontmatter tags are formatted as arrays: `tags: [tag1, tag2]`
2. Check the `modified` and `created` dates are in YYYY-MM-DD format
3. Try a broader search without filters first
4. Use `list_tags` to see what tags are available

## Advanced Configuration

### Configuration Options

Edit `src/config.ts` to customize the server behavior:

```typescript
export const config: VaultConfig = {
  vaultPath: '',  // Set via --vault-path CLI argument

  // File size limit (default: 10MB)
  maxFileSize: 10 * 1024 * 1024,

  // Maximum results returned by search (default: 100)
  maxSearchResults: 100,

  // Maximum recent notes returned (default: 100)
  maxRecentNotes: 100,

  // Search scoring weights
  searchWeights: {
    title: 3.0,      // Title match importance
    tags: 2.5,       // Tag match importance
    frontmatter: 2.0, // Metadata match importance
    content: 1.0,    // Body content match importance
    recency: 1.5     // Recent notes boost
  }
};
```

### Performance Tuning

**For large vaults (1000+ notes):**
- Increase `maxFileSize` only if needed (uses more memory)
- Decrease `maxSearchResults` for faster searches
- Adjust `searchWeights` to prioritize metadata over content

**For small vaults (<100 notes):**
- Can increase all limits safely
- Consider higher content weight for better full-text search

### Index Different Folders

Update `indexPatterns` in `src/config.ts`:

```typescript
indexPatterns: [
  "Work/**/*.md",
  "Projects/**/*.md",
  "CustomFolder/**/*.md", // Add your folder
];
```

### Exclude More Patterns

Add to `excludePatterns` in `src/config.ts`:

```typescript
excludePatterns: [
  "Archive/**/*.md",
  "_Meta/Attachments/**",
  ".trash/**",
  "Private/**/*.md", // Add patterns to exclude
];
```

## Development Mode

For active development with auto-rebuild:

```bash
npm run watch
```

This will watch for file changes and rebuild automatically.

## Testing

The project includes comprehensive unit tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Tests cover:
- Date parsing and validation
- Enum validation (type, status, category)
- Path security (traversal protection)
- File size limits
- Tag matching (hierarchical)
- Frontmatter validation

## Code Quality

Maintain code quality with linting:

```bash
# Check for lint errors
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

The project enforces:
- No explicit `any` types
- TypeScript strict mode
- Consistent code style
- Test coverage for new features

## Next Steps

- Read the full [README.md](README.md) for all available tools
- Check out the [Security Features](#security-features) section
- Start using natural language queries with Claude Code!
