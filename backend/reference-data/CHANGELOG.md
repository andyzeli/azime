# Changelog

All notable changes to the spine standards-of-care taxonomy. Versioning follows SemVer:
MAJOR = breaking id/schema changes, MINOR = new rows, PATCH = text/source corrections.

## [0.1.0] - 2026-09-28

### Added
- Initial spine-only taxonomy for the three regions `cervical_spine`, `thoracic_spine`, `lumbar_spine`.
- `canonical_diagnoses.json`: 18 canonical diagnoses (cervical 6, thoracic 5, lumbar 7), modeled on the AMA Guides Sixth Ch. 17 diagnosis groupings, each with ICD-10-CM prefixes.
- `treatments.json`: 79 region-specific treatment rows (ids look like `pt_lumbar`, `acdf_cervical`) in the categories conservative, medication, injection, surgical, and multimodal.
- `aliases.json`: 749 synonyms, abbreviations, brand/generic drug names, and common phrasings from records.
- `ladder_entries.json`: 177 dx-to-treatment ladder rows (array order within each dx = ladder order, conservative first). Each row has applicability and adequacy guidance.
- `sources.json`: 24 guideline references, with titles and editions checked online in September 2026.
- `ladder_entry_sources.json`: 267 links. Every ladder entry has at least one source.
- `build.py`: the generator and single source of truth. Edit this file, not the JSON.
- `validate.py`: checks schema, uniqueness, enums, and foreign keys, and gives source-coverage, orphan, and alias-ambiguity warnings.
