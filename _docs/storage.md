# Persistent storage

`StateRepository` is the domain-facing boundary. The memory adapter and TypeORM adapter share the same snapshot contract. TypeORM EntitySchema models retain normalized IDs, owner/state/email keys and a unique nullable active-offer key, with aggregate payloads serialized as text. Request payloads contain private photo bytes, immutable timestamped quote snapshots/history and lifecycle state. Sessions and credential hashes are private rows. This compact design preserves aggregates rather than introducing separate tables for every nested object.

The versioned `InitialRepairLens1760950000000` migration creates tables through TypeORM QueryRunner/Table APIs. Schema synchronization is disabled. `npm run migrate` explicitly creates/updates the configured SQLite file; migrations also run at SQLite adapter startup. Re-running applies no duplicate migrations or seed users.

Each save replaces one complete state in a TypeORM transaction. Unique email and active request/workshop keys reject duplicate writes; rollback preserves prior committed data. A single server serializes all mutations and checks expected lifecycle state before selection/transition. The selected offer ID is one scalar in the request aggregate; concurrent selection cannot create two winners. Accepted terms never mutate; revision acceptance appends a version to history.

SQL.js `location` and `autoSave: true` write a genuine SQLite file after changes. The application awaits repository saves before HTTP success. Tests assert the SQLite file header, close/reopen persistence, separate Node process persistence, migration idempotence, constraint rollback, session restoration and identical HTTP behavior on both adapters.

This is a single-process embedded application. Do not run multiple instances against one SQL.js file: each instance would have its own cache. Whole-state saves are appropriate for the bounded coursework MVP, not a large marketplace. A future multi-instance deployment needs a server DB and granular optimistic concurrency; ORM portability is not a claim that PostgreSQL was tested. DBMS-specific configuration is confined to the storage adapter; domain rules contain no SQL.
