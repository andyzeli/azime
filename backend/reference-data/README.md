# Reference data import

This directory is the default destination for the versioned reference-data
snapshot produced by the offline data project. The importer expects a manifest
and six table files:

- `manifest.json`
- `canonical_diagnoses.json`
- `treatments.json`
- `treatment_aliases.json`
- `sources.json`
- `ladder_entries.json`
- `ladder_entry_sources.json`

Each file contains a JSON array. Property names match the PostgreSQL column
names from `src/db/schema.ts`, except `manifest.json`, which is an object with
`schema_version` (currently `1`) and a non-empty `dataset_version`. Nullable
properties may be omitted or set to `null`. Every `ladder_entries.id` must be a
stable UUID supplied by the offline project so that
`ladder_entry_sources.json` can refer to it consistently.

Validate a snapshot without connecting to PostgreSQL:

```sh
pnpm --filter backend reference-data:validate
```

Pass a different directory as the final argument when validating files before
copying them into this directory:

```sh
pnpm --filter backend reference-data:validate -- /path/to/export
```

Import a validated snapshot using `DATABASE_URL` from the environment,
`.env.local`, or `.env`:

```sh
pnpm --filter backend reference-data:import
```

The import is an atomic full replacement. All files are parsed and validated
before a database connection is opened. The importer rejects unknown fields,
duplicate primary keys, invalid treatment categories, invalid UUIDs, and
references to missing records. It also rejects unsupported schema versions and
snapshots with no diagnoses or treatments. If any database write fails, the
prior snapshot remains unchanged.

Example `manifest.json`:

```json
{
  "schema_version": 1,
  "dataset_version": "2026-09-13.1"
}
```

Example `treatments.json`:

```json
[
  {
    "id": "physical-therapy",
    "region": null,
    "category": "conservative",
    "label": "Physical therapy"
  }
]
```
