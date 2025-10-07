
# Example Queries

This document contains example queries for common use cases. For the full API reference, see [api.md](api.md).

## Table of Contents

- [Find Active Puppet Work (Path Filtering)](#find-active-puppet-work-path-filtering)
- [Get Recent Meeting Notes](#get-recent-meeting-notes)
- [Find Project Ideas (Excluding Archive)](#find-project-ideas-excluding-archive)
- [Search Coffee Recipes](#search-coffee-recipes)
- [Historical Search (Include Archive)](#historical-search-include-archive)
- [Get Work Summary](#get-work-summary)

## Find Active Puppet Work (Path Filtering)
```json
{
  "tool": "search_notes",
  "path": "Work/Puppet/**",
  "status": "active"
}
```

## Get Recent Meeting Notes
```json
{
  "tool": "search_notes",
  "type": "meeting",
  "limit": 5
}
```

## Find Project Ideas (Excluding Archive)
```json
{
  "tool": "search_notes",
  "category": "projects",
  "status": "idea"
}
```

## Search Coffee Recipes
```json
{
  "tool": "search_notes",
  "query": "aeropress",
  "tags": ["coffee"]
}
```

## Historical Search (Include Archive)
```json
{
  "tool": "search_notes",
  "query": "project retrospective",
  "includeArchive": true,
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31"
}
```

## Get Work Summary
```json
{
  "tool": "summarize_notes",
  "category": "work"
}
```
