# AMA rating-table uploads

Place JSON files here, each containing an array of rating tables. Filenames are
your choice; every `.json` file directly in this folder is imported together.

From the repository root:

```sh
pnpm --filter backend ama:tables:import --validate-only
pnpm --filter backend ama:tables:import
```

See [the implementation handoff](../../../docs/ama-class-scale-handoff.md) and
[the upload schema](../../../packages/contracts/src/amaRatingTables.ts).
`cnstables.json` contains ten supplied chapter 13 definitions for nine areas,
with dominant/nondominant upper-extremity variants split into separate tables.
`tbleupload.md` is the accompanying source transcription and is not imported.
An empty folder reports an error without connecting to the database.

All files are validated together before any database connection; duplicate table
IDs across files are rejected. Import upserts the supplied tables in one
transaction, preserving unrelated tables. Subfolders and non-JSON files are ignored.

Each class-scale result uses `{ "class_value": 2, "mod_option_id": "b", "wpi": 10 }`.
`wpi` is a numeric whole-person impairment percentage from 0–100. Nested
`impairment` objects are not accepted for these table uploads.
