
# Search Weights

The MCP Second Brain Server uses weighted search scoring for semantic search. This affects how results are ranked and matched:

- **Title:** 3.0x
- **Tags:** 2.5x
- **Frontmatter** (type, status, category): 2.0x
- **Content:** 1.0x
- **Recency Boost:** 1.5x (applied to all results)

This means searching for "meeting" will match notes with `type: meeting` higher than notes containing "meeting" in their content.
