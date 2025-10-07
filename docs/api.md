
# MCP API Tools Reference

This document describes all available MCP tools, their parameters, and example usage.

## Table of Contents

- [search_notes](#1-search_notes)
- [get_note](#2-get_note)
- [get_notes_by_tag](#3-get_notes_by_tag)
- [get_recent_notes](#4-get_recent_notes)
- [list_tags](#5-list_tags)
- [summarize_notes](#6-summarize_notes)

## 1. `search_notes`
Search notes with optional filters.

**Parameters:**
- `query` (string, optional): Search query text
- `tags` (array, optional): Filter by tags (e.g., `["work/puppet", "golang"]`)
- `type` (enum, optional): `note`, `project`, `task`, `daily`, `meeting`
- `status` (enum, optional): `active`, `archived`, `idea`, `completed`
- `category` (enum, optional): `work`, `personal`, `knowledge`, `life`, `dailies`
- `dateFrom` (string, optional): Start date (YYYY-MM-DD format, validated)
- `dateTo` (string, optional): End date (YYYY-MM-DD format, validated)
- `path` (string, optional): Filter by directory pattern (e.g., `"Work/Puppet/**"`)
- `includeArchive` (boolean, optional): Include archived notes (default: false)
- `limit` (number, optional): Max results (default: 20, max: configurable via `maxSearchResults`)

## 2. `get_note`
Retrieve the full content of a specific note.

**Parameters:**
- `path` (string, required): Note path (e.g., `"Work/Puppet/Meeting Notes.md"`)

## 3. `get_notes_by_tag`
Get all notes with a specific tag.

**Parameters:**
- `tag` (string, required): Tag to search (e.g., `"work/puppet"`)

## 4. `get_recent_notes`
Get recently modified notes.

**Parameters:**
- `limit` (number, optional): Number of notes (default: 10, max: configurable via `maxRecentNotes`)

## 5. `list_tags`
List all unique tags across the vault.

## 6. `summarize_notes`
Generate summary statistics for notes matching criteria.

**Parameters:**
- `tags` (array, optional): Filter by tags
- `type` (enum, optional): Filter by type
- `status` (enum, optional): Filter by status
- `category` (enum, optional): Filter by category

**Returns:**
- `total`: Number of notes
- `byType`: Breakdown by type
- `byStatus`: Breakdown by status
- `byCategory`: Breakdown by category
- `recentlyModified`: 5 most recently modified notes
