# RallyPoint Database Data Dictionary

This document provides a detailed reference for every table, column, data type, constraint, and foreign key relationship across all architectural layers of the RallyPoint PostgreSQL 16 schema.

---

## Architecture Summary
- **Layer 1: Master Data (3NF)**: Users, Players, Profile History, Clubs, Teams, Members, Venues, Courts, Tournaments, Seasons.
- **Layer 2: Append-Only Event Sourcing**: Matches, Sides, Participants, Games, Match Events (Partitioned).
- **Layer 3: Derived Rollups & Snapshots**: Career Stats, Head-to-Head, Form Trends, Match Rollups, Player/Team Snapshots.
- **Audit & Governance**: Audit Logs, RLS Security Policies, GDPR Anonymization.

---

## Master Data Layer (Layer 1)

### 1. `users`
System user accounts, credentials, and RBAC authentication.
| Column | Type | Nullable | Default | Constraints / Description |
|---|---|---|---|---|
| `id` | CUID | No | `cuid()` | Primary Key |
| `email` | VARCHAR(255) | No | - | Unique user email (PII) |
| `password_hash` | VARCHAR(255) | No | - | Bcrypt password hash |
| `role` | ENUM | No | `VIEWER` | `ADMIN`, `SCORER`, `PLAYER`, `VIEWER`, `UMPIRE` |
| `is_active` | BOOLEAN | No | `true` | Account active state |
| `last_login_at` | TIMESTAMPTZ | Yes | NULL | Timestamp of last successful login |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | Auto-updated timestamp |

### 2. `players`
Badminton athlete profiles and biographical data.
| Column | Type | Nullable | Default | Constraints / Description |
|---|---|---|---|---|
| `id` | CUID | No | `cuid()` | Primary Key |
| `user_id` | CUID | Yes | NULL | FK -> `users(id)` ON DELETE SET NULL, Unique (PII) |
| `first_name` | VARCHAR(100) | No | - | Athlete first name (PII) |
| `last_name` | VARCHAR(100) | No | - | Athlete last name (PII) |
| `display_name` | VARCHAR(200) | No | - | Public display name (Indexed with pg_trgm) |
| `date_of_birth` | DATE | Yes | NULL | Date of birth (PII) |
| `gender` | VARCHAR(10) | Yes | NULL | 'M', 'F', 'OTHER' |
| `nationality` | VARCHAR(3) | Yes | NULL | ISO 3-letter country code (e.g. DEN, JPN, MAS) |
| `dominant_hand`| ENUM | Yes | NULL | `LEFT`, `RIGHT` |
| `height_cm` | INT | Yes | NULL | Height in centimeters |
| `weight_kg` | INT | Yes | NULL | Weight in kilograms |
| `photo_url` | TEXT | Yes | NULL | Profile image URL (PII) |
| `bio` | TEXT | Yes | NULL | Athlete biography (PII) |
| `phone` | VARCHAR(50) | Yes | NULL | Contact phone number (PII) |
| `email` | VARCHAR(255) | Yes | NULL | Player direct email (PII) |
| `city` | VARCHAR(100) | Yes | NULL | City of residence (PII) |
| `state` | VARCHAR(100) | Yes | NULL | State/Province (PII) |
| `country` | VARCHAR(100) | Yes | NULL | Country of residence |
| `club_id` | CUID | Yes | NULL | FK -> `clubs(id)` ON DELETE SET NULL |
| `status` | ENUM | No | `ACTIVE` | `ACTIVE`, `INACTIVE`, `RETIRED` |
| `external_ids` | JSONB | Yes | NULL | External identifiers (e.g. `{"bwf_id": 12345}`) |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | Soft-delete timestamp |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | Auto-updated timestamp |

### 3. `player_profile_history`
Audit snapshots capturing every historical change to a player's profile.
| Column | Type | Nullable | Default | Constraints / Description |
|---|---|---|---|---|
| `id` | CUID | No | `cuid()` | Primary Key |
| `player_id` | CUID | No | - | FK -> `players(id)` ON DELETE CASCADE |
| `snapshot` | JSONB | No | - | Complete JSON serialized snapshot of player state |
| `changed_by` | VARCHAR(100) | No | - | User ID or 'SYSTEM' who made the change |
| `changed_at` | TIMESTAMPTZ | No | `NOW()` | Timestamp of modification |

### 4. `clubs`
Badminton clubs, centers, or training academies.
| Column | Type | Nullable | Default | Constraints / Description |
|---|---|---|---|---|
| `id` | CUID | No | `cuid()` | Primary Key |
| `name` | VARCHAR(200) | No | - | Club name |
| `city` | VARCHAR(100) | Yes | NULL | City |
| `logo_url` | TEXT | Yes | NULL | Club badge or logo URL |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | Soft-delete timestamp |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | Auto-updated timestamp |

### 5. `teams` & `team_members`
Teams, fixed doubles pairings, and club team rosters.
- `teams.type`: `SINGLES_ENTRY`, `DOUBLES_PAIR`, `FIXED_PAIR`, `CLUB_TEAM`.
- `team_members`: Unique constraint `UNIQUE(team_id, player_id, left_at)` prevents duplicate active roster assignments.

### 6. `venues` & `courts`
Physical playing facilities and individual courts.
- `courts`: Unique constraint `UNIQUE(venue_id, court_number)`.

### 7. `tournaments` & `seasons`
Competition structures and ranking league periods.
- `tournaments.format`: `KNOCKOUT`, `ROUND_ROBIN`, `GROUP_KNOCKOUT`.
- `tournaments.category`: `MS` (Men's Singles), `WS` (Women's Singles), `MD` (Men's Doubles), `WD` (Women's Doubles), `XD` (Mixed Doubles).
- `seasons.is_active`: Identifies the current active ranking league.

---

## Append-Only Event Layer (Layer 2)

### 8. `matches`
Badminton matches and format configuration.
| Column | Type | Nullable | Default | Constraints / Description |
|---|---|---|---|---|
| `id` | CUID | No | `cuid()` | Primary Key |
| `tournament_id`| CUID | Yes | NULL | FK -> `tournaments(id)` ON DELETE SET NULL |
| `season_id` | CUID | Yes | NULL | FK -> `seasons(id)` ON DELETE SET NULL |
| `court_id` | CUID | Yes | NULL | FK -> `courts(id)` ON DELETE SET NULL |
| `match_type` | ENUM | No | `SINGLES` | `SINGLES`, `DOUBLES`, `MIXED` |
| `scoring_format`| ENUM | No | `RALLY_21` | `RALLY_21`, `RALLY_15`, `RALLY_11`, `SERVICE_POINT_15`, `SERVICE_POINT_11`, `CUSTOM` |
| `target_points`| INT | No | 21 | Winning threshold (e.g. 21, 15, 11) |
| `win_by` | INT | No | 2 | Margin required to win game |
| `cap` | INT | No | 30 | Sudden death hard cap score |
| `setting_rule` | VARCHAR(50)| Yes | NULL | e.g. `BWF_SETTING_13_14` |
| `first_server` | VARCHAR(10)| Yes | NULL | Initial designated serving side |
| `best_of` | INT | No | 3 | Games in match (e.g. 1, 3, 5) |
| `status` | ENUM | No | `SCHEDULED` | `SCHEDULED`, `LIVE`, `COMPLETED`, `RETIRED`, `WALKOVER` |
| `scheduled_at` | TIMESTAMPTZ | Yes | NULL | Scheduled start time |
| `started_at` | TIMESTAMPTZ | Yes | NULL | Actual start time |
| `ended_at` | TIMESTAMPTZ | Yes | NULL | Match conclusion timestamp |
| `winner_side` | ENUM | Yes | NULL | `A`, `B` |
| `scorer_user_id`| CUID | Yes | NULL | FK -> `users(id)` designated scorer |
| `client_uuid` | VARCHAR(64) | No | - | Unique client-generated UUID for offline idempotency |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | Auto-updated timestamp |

### 9. `games`
Individual sets within a match.
- `match_id`: FK -> `matches(id)` ON DELETE CASCADE.
- `game_number`: 1, 2, 3, etc. Unique constraint `UNIQUE(match_id, game_number)`.
- `score_a`, `score_b`: Final game score with `CHECK (score_a >= 0 AND score_b >= 0)`.

### 10. `match_events` (Partitioned by Month on `occurred_at`)
Granular domain events representing every rally, error, interval, and state transition.
| Column | Type | Nullable | Default | Constraints / Description |
|---|---|---|---|---|
| `id` | VARCHAR(64) | No | - | Primary Key (Client-generated UUID v7) |
| `match_id` | CUID | No | - | FK -> `matches(id)` ON DELETE CASCADE |
| `game_id` | CUID | Yes | NULL | FK -> `games(id)` ON DELETE SET NULL |
| `sequence_number`| INT | No | - | Monotonically increasing sequence (Unique per match) |
| `event_type` | ENUM | No | - | `POINT`, `UNDO`, `SERVE_FAULT`, `INTERVAL`, `RETIRE`, `WALKOVER`, `GAME_END`, `MATCH_END`, `SIDE_OUT`, `SETTING_CHOICE` |
| `side` | ENUM | Yes | NULL | `A`, `B` |
| `rally_end_type`| ENUM | Yes | NULL | `SMASH`, `DROP`, `NET`, `OUT`, `UNFORCED_ERROR`, `SERVICE_FAULT`, `WINNER` |
| `shot_type` | ENUM | Yes | NULL | `SMASH`, `DROP`, `NET`, `CLEAR`, `DRIVE`, `LOB`, `SERVE` |
| `rally_end_result`| ENUM | Yes | NULL | `WINNER`, `UNFORCED_ERROR`, `FORCED_ERROR`, `OUT`, `NET_FAULT`, `SERVICE_FAULT` |
| `point_winner_player_id` | CUID | Yes | NULL | Player awarded the point |
| `error_player_id` | CUID | Yes | NULL | Player committing fault/error |
| `server_player_id` | CUID | Yes | NULL | Player serving during the rally |
| `payload` | JSONB | Yes | NULL | Flexible domain event payload (GIN indexed) |
| `occurred_at` | TIMESTAMPTZ | No | - | Wall-clock time event occurred (Partition Key) |
| `recorded_at` | TIMESTAMPTZ | No | `NOW()` | Ingestion timestamp |
| `device_id` | VARCHAR(64) | Yes | NULL | Client hardware / session identifier |

---

## Derived Analytics Layer (Layer 3)

### 11. `player_career_stats`
O(1) player lifetime aggregates, recomputable from `match_events`.
- Columns: `matches_played`, `matches_won`, `matches_lost`, `games_won`, `games_lost`, `points_won`, `points_lost`, `win_rate`, `current_streak`, `best_streak`, `last_played_at`.

### 12. `head_to_head_stats`
Pairwise head-to-head records between player pairs.
- Unique constraint on `UNIQUE(player_a_id, player_b_id)`.
- Columns: `matches_played`, `a_wins`, `b_wins`, `games_played`, `a_game_wins`, `b_game_wins`, `last_match_id`.

### 13. `player_form_trends`
Rolling 10-match aggregate.
- `recent_results`: JSON-serialized array (e.g. `["W", "W", "L", "W", "W"]`).
- `avg_points_per_game`, `avg_match_duration_minutes`.

### 14. `match_analytics_rollups`
Post-match derived analytics summary.
- Columns: `longest_rally`, `streak_a`, `streak_b`, `lead_changes`, `comeback_deficits` (JSONB), `serve_win_pct_a`, `serve_win_pct_b`, `shot_breakdown` (JSONB).

### 15. `player_ranking_snapshots` & `team_ranking_snapshots`
Weekly and seasonal leaderboard snapshots.
- Columns: `category`, `period`, `scoring_format`, `rank`, `previous_rank`, `matches_played`, `ranking_points`, `headline_value`, `stats` (JSONB).

---

## Governance & Audit Layer

### 16. `audit_logs`
Automated change-data-capture log across master data tables.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | TEXT | No | `cuid_...` | Primary Key |
| `table_name` | VARCHAR(64) | No | - | Master data table name |
| `row_id` | VARCHAR(128) | No | - | Primary key value of the affected record |
| `action` | VARCHAR(10) | No | - | `INSERT`, `UPDATE`, `DELETE`, `ANONYMIZE` |
| `old_data` | JSONB | Yes | NULL | Row state before modification |
| `new_data` | JSONB | Yes | NULL | Row state after modification |
| `changed_by` | VARCHAR(128) | No | 'SYSTEM' | User ID extracted from session context |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | Timestamp change occurred |
