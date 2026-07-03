# database/

Supabase Postgres schema, RLS policies, and migrations.

**Not yet implemented — this is built in the SUPABASE module.**

Planned contents:

```
database/
  schema.sql          # tables: settings, schedules, command_history
  policies.sql         # Row Level Security policies (per-user isolation)
  seed.sql             # optional local dev seed data
```

Once applied, regenerate frontend types with:

```
npx supabase gen types typescript --project-id <ref> > frontend/src/types/database.ts
```
