
# Database Schema (Mermaid)

This diagram shows the SQLite database schema used for note indexing and search.

> **Tip:** View this diagram using the [Mermaid Live Editor](https://mermaid.live/) or a compatible Markdown viewer.

````mermaid
erDiagram
    notes ||--o{ note_tags : has
    notes ||--o{ note_frontmatter : has
    notes ||--|| notes_fts : "indexed by"

    notes {
        TEXT path PK "Relative path from vault root"
        TEXT title "Note title (filename)"
        TEXT content "Full markdown content"
        TEXT excerpt "Plain text excerpt"
        TEXT created "YYYY-MM-DD"
        TEXT modified "YYYY-MM-DD"
        TEXT type "note, project, task, daily, meeting"
        TEXT status "active, archived, idea, completed"
        TEXT category "work, personal, knowledge, life, dailies"
    }

    note_tags {
        TEXT note_path FK "References notes(path)"
        TEXT tag "Tag value (e.g., work/puppet)"
    }

    note_frontmatter {
        TEXT note_path FK "References notes(path)"
        TEXT key "Custom frontmatter key"
        TEXT value "JSON-serialized value"
    }

    notes_fts {
        TEXT path "UNINDEXED - reference only"
        TEXT title "FTS5 indexed"
        TEXT content "FTS5 indexed with porter stemming"
    }
````
