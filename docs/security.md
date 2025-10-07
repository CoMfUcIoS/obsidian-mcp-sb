
# Security Features

The MCP Second Brain Server implements multiple security measures to protect your vault and data integrity:

- **Path Traversal Protection:** All file paths are validated using `path.relative()` to ensure they remain within the vault directory.
- **File Size Limits:** Files exceeding `maxFileSize` (default 10MB) are skipped during indexing to prevent memory issues.
- **Input Validation:** All enum parameters (type, status, category) are strictly validated.
- **Date Validation:** Date strings are validated for format and actual date validity (e.g., rejects Feb 30).
- **Error Tracking:** Failed file reads are logged without exposing sensitive system paths.
