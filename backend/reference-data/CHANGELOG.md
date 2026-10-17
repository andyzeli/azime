# Changelog

All notable changes to the spine standards-of-care taxonomy. Versioning follows SemVer:
MAJOR = breaking id/schema changes, MINOR = new rows, PATCH = text/source corrections.

## [0.2.0] - 2026-10-13

### Changed (breaking: diagnosis ids)

- `canonical_diagnoses.json` is now Andrew's owner-maintained v2 file (41 dx: lumbar 15, cervical 13, thoracic 13), copied byte-for-byte from `input/canonical_diagnosis_v2.json`. Its fields are `id, region_id, label, definition, icdPrefixes, ama_row_ids` (`definition` replaces `description`; `ama_row_ids` is new). build.py no longer defines diagnoses.
- All ladder entries rebuilt against v2 ids. 98 v0.1.0 ladder ids are unchanged (dx kept its id); 209 new; 79 retired (they pointed at removed/split dx).

### Diagnosis mapping v0.1.0 -> v2

| v0.1.0 dx                                | change | v2 dx                                                                                                                                                                                              | ICD prefixes dropped             | ICD prefixes added     |
| ---------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------- |
| `lumbar_nonspecific_strain_sprain`       | same   | `lumbar_nonspecific_strain_sprain`                                                                                                                                                                 | M54.50, M54.59                   | -                      |
| `lumbar_disc_herniation_radiculopathy`   | split  | `lumbar_radiculopathy`, `lumbar_disc_herniation`                                                                                                                                                   | -                                | M47.26, M47.27         |
| `lumbar_spinal_stenosis`                 | same   | `lumbar_spinal_stenosis`                                                                                                                                                                           | M47.26, M47.27, M48.061, M48.062 | -                      |
| `lumbar_spondylolisthesis`               | split  | `lumbar_spondylolisthesis`, `lumbar_spondylolysis`, `lumbar_instability`                                                                                                                           | -                                | -                      |
| `lumbar_facet_degenerative_disc`         | split  | `lumbar_facet_pain`, `lumbar_degenerative_disc_disease`, `lumbar_vertebrogenic_pain`                                                                                                               | -                                | -                      |
| `lumbar_fracture`                        | same   | `lumbar_fracture`                                                                                                                                                                                  | -                                | -                      |
| `lumbar_post_surgical`                   | split  | `lumbar_persistent_postoperative_pain`, `lumbar_pseudarthrosis`, `lumbar_fusion_arthroplasty_status`, `lumbar_deep_spinal_wound_infection`                                                         | -                                | T81.42, T81.43, T84.63 |
| `cervical_nonspecific_strain_sprain`     | same   | `cervical_nonspecific_strain_sprain`                                                                                                                                                               | -                                | -                      |
| `cervical_radiculopathy`                 | split  | `cervical_radiculopathy`, `cervical_disc_herniation`                                                                                                                                               | -                                | M54.11                 |
| `cervical_myelopathy_stenosis`           | split  | `cervical_spinal_stenosis`, `cervical_myelopathy`                                                                                                                                                  | -                                | -                      |
| `cervical_facet_degenerative`            | split  | `cervical_facet_pain`, `cervical_degenerative_disc_disease`                                                                                                                                        | -                                | -                      |
| `cervical_fracture`                      | same   | `cervical_fracture`                                                                                                                                                                                | -                                | -                      |
| `cervical_post_surgical`                 | split  | `cervical_persistent_postoperative_pain`, `cervical_pseudarthrosis`, `cervical_fusion_arthroplasty_status`, `cervical_deep_spinal_wound_infection`                                                 | -                                | T81.42, T81.43, T84.63 |
| `thoracic_nonspecific_strain_sprain`     | same   | `thoracic_nonspecific_strain_sprain`                                                                                                                                                               | -                                | -                      |
| `thoracic_disc_herniation_radiculopathy` | split  | `thoracic_radiculopathy`, `thoracic_disc_herniation`                                                                                                                                               | -                                | -                      |
| `thoracic_myelopathy_stenosis`           | split  | `thoracic_spinal_stenosis`, `thoracic_myelopathy`                                                                                                                                                  | -                                | -                      |
| `thoracic_facet_degenerative`            | split  | `thoracic_facet_pain`, `thoracic_degenerative_disc_disease`                                                                                                                                        | -                                | -                      |
| `thoracic_fracture`                      | same   | `thoracic_fracture`                                                                                                                                                                                | -                                | -                      |
| (none)                                   | new    | `cervical_instability`, `thoracic_instability`, `thoracic_persistent_postoperative_pain`, `thoracic_pseudarthrosis`, `thoracic_fusion_arthroplasty_status`, `thoracic_deep_spinal_wound_infection` | -                                | -                      |

Removed v0.1.0 dx ids (no longer referenced; `lumbar_spondylolisthesis` and `cervical_radiculopathy` keep their ids but are narrowed): `lumbar_disc_herniation_radiculopathy`, `lumbar_facet_degenerative_disc`, `lumbar_post_surgical`, `cervical_myelopathy_stenosis`, `cervical_facet_degenerative`, `cervical_post_surgical`, `thoracic_disc_herniation_radiculopathy`, `thoracic_myelopathy_stenosis`, `thoracic_facet_degenerative`.

### Added

- Treatments (13): `antibiotics_cervical`, `antibiotics_lumbar`, `antibiotics_thoracic`, `bone_growth_stimulator_cervical`, `bone_growth_stimulator_lumbar`, `bone_growth_stimulator_thoracic`, `bvna_lumbar`, `debridement_cervical`, `debridement_lumbar`, `debridement_thoracic`, `pars_repair_lumbar`, `revision_surgery_thoracic`, `spinal_cord_stimulator_thoracic`. No treatments removed; no orphans.
- Sources (5, verified online Oct 2026): `nass_bvna_2023`, `aspn_bvna_2022`, `tai_spinal_implant_infection_2024`, `debnath_spondylolysis_2021`, `mohammed_pars_repair_2018`.
- validate.py: v2 dx schema, within-region ICD prefix-subsumption warning, ama_row_ids format check, ODG-only entry count.

### Counts

dx 41, treatments 92, aliases 883, ladder_entries 307, sources 29, ladder_entry_sources 462. ODG-only ladder entries: 99.

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

-- AZ: manual manipulation of cannonical_diagnoses. adding AMA rows
