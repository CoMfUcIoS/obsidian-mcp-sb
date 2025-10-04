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
3. Look at console output when server starts (it shows indexed count)
4. Verify paths in `src/config.ts` are correct

### Search returns no results

1. Ensure frontmatter tags are formatted as arrays: `tags: [tag1, tag2]`
2. Check the `modified` and `created` dates are in YYYY-MM-DD format
3. Try a broader search without filters first
4. Use `list_tags` to see what tags are available

## Advanced Configuration

### Custom Vault Path

Edit `src/config.ts` and change the `vaultPath`:

```typescript
export const config: VaultConfig = {
  vaultPath: "/path/to/your/vault",
  // ...
};
```

### Adjust Search Weights

Modify search scoring in `src/config.ts`:

```typescript
searchWeights: {
  title: 3.0,      // Title importance
  tags: 2.5,       // Tag matching importance
  frontmatter: 2.0,
  content: 1.0,    // Body content importance
  recency: 1.5     // Recent notes boost
}
```

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

## Next Steps

- Read the full [README.md](README.md) for all available tools
- Start using natural language queries with Claude Code!
