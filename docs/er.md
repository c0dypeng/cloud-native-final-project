# Entity-Relationship — `safetydb`

```mermaid
erDiagram
    departments ||--o{ departments : "parent_id"
    departments ||--o{ users : "department_id"
    users ||--o{ users : "manager_id"
    users ||--o{ safety_reports : "user_id"
    admin_accounts ||--o{ events : "created_by"
    events ||--o{ safety_reports : "event_id"

    departments {
        uuid id PK
        text name
        uuid parent_id FK "self-ref, nullable"
        timestamp created_at
    }
    admin_accounts {
        uuid id PK
        text username UK
        text password_hash
        timestamp created_at
        timestamp last_login
    }
    users {
        uuid id PK
        text email UK
        text name
        text password_hash
        uuid department_id FK
        uuid manager_id FK "self-ref"
        enum role "employee|manager"
        text phone
        text locale "default zh-TW"
        bool is_active
        timestamp created_at
    }
    events {
        uuid id PK
        text title
        text description
        enum type "earthquake|fire|security|accident|drill|other"
        enum status "active|closed"
        uuid created_by FK
        timestamp created_at
        timestamp closed_at
    }
    safety_reports {
        uuid id PK
        uuid event_id FK "ON DELETE CASCADE"
        uuid user_id FK "ON DELETE CASCADE"
        enum status "safe|need_help|not_reported"
        text message
        numeric latitude
        numeric longitude
        timestamp reported_at
        timestamp updated_at
    }
```

## Key indexes

| Index                                       | Purpose                                         |
|---------------------------------------------|-------------------------------------------------|
| `users.email` UNIQUE                        | login lookup                                    |
| `admin_accounts.username` UNIQUE            | admin login lookup                              |
| `safety_reports (event_id, user_id)` UNIQUE | enables `ON CONFLICT DO UPDATE` upsert          |
| `departments.parent_id`                     | recursive CTE for the org tree                  |
| `users.manager_id`                          | recursive CTE for subordinate lookups           |

## Cascade rules

- Deleting an `event` cascades to its `safety_reports`.
- Deleting a `user` cascades to their `safety_reports`. (Soft delete via
  `is_active = false` is preferred in production; CASCADE is a safety net.)
- Departments are not cascade-deleted — DELETE is rejected if children or
  users still reference them.

## Source of truth

Schema lives in `packages/database/src/schema/*.ts` (Drizzle).
Migrations are generated via `bun run --filter database db:generate` and
committed under `packages/database/drizzle/*.sql`.
