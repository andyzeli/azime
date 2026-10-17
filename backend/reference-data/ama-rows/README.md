# AMA diagnostic-row uploads

Place JSON files here, each containing an array of AMA diagnostic rows. Filenames
are your choice; every `.json` file directly in this folder is imported together.

From the repository root:

```sh
pnpm --filter backend ama:import --validate-only
pnpm --filter backend ama:import
```

`spine.json` is a copy of the reviewed `docs/ama-spine.upload.json`. After editing
that working document, replace this copy with the reviewed version before import.
Do not keep multiple versions of the same row in this folder: duplicate IDs are
rejected across files. Files in subfolders and non-JSON files are ignored.

The importer validates all files before connecting to the database and upserts
rows in one transaction. It does not delete rows absent from the upload.
