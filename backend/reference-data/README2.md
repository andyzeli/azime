# Spine Standards-of-Care Treatment Taxonomy (v0.1.0)

These are upload-ready JSON tables that the IME EMR uses to compare the treatments pulled from medical records against guideline-based treatment ladders. The goal is to judge whether a patient with a given spine diagnosis has tried the reasonable treatments adequately, which feeds the maximum medical improvement (MMI) decision.

## Files
| File | Table columns |
|---|---|
| canonical_diagnoses.json | id, region_id, label, description, icdPrefixes[] |
| treatments.json | id, region, category, name |
| aliases.json | treatmentId, alias |
| ladder_entries.json | id, region_id, canonical_dx_id, treatment_id, applicability, adequacy |
| sources.json | id, ref, edition |
| ladder_entry_sources.json | ladder_entry_id, source_id |

Workflow: edit `build.py`, run `python3 build.py && python3 validate.py`. The validator exits with code 1 if there are errors.

## Assumptions
1. **Treatment rows are per region.** Every treatment is repeated for each region where it applies (`pt_cervical`, `pt_thoracic`, `pt_lumbar`), so `treatments.region` and `ladder_entries.region_id` always line up. As a result, generic aliases such as "PT" or "ESI" map to one treatment per region, and the extraction step has to use the record's body-region context to choose the right one. The validator only warns when an alias is ambiguous inside a single region, and there are none.
2. **Ladder order is the array order** of `ladder_entries.json` within each dx, from conservative, to medication, to injection, to surgical and multimodal. The schema has no `step` column (see open questions).
3. **ICD matching should use the longest matching prefix.** For example, `M54.5` (older non-specific LBP code) maps to non-specific LBP, while `M54.51` (vertebrogenic LBP) maps to facet/DDD. Codes that are not region-specific (`M96.0`, `M96.1`, `Z98.1`, `M80.08`, `M62.830`) appear in more than one region and need region context from the record. Thoracolumbar codes (.x4/.x5 positions, e.g. `M51.15`, `M48.05`) are assigned to thoracic.
4. **Optional entries.** Some ladder rows are marked "optional - absence does not preclude MMI" in their adequacy text. These include heat, massage, yoga, acetaminophen, neuropathic agents, oral steroids, opioids, facet intra-articular injections, and all surgery. Surgery is never required for MMI if it is not indicated, contraindicated, or declined by an informed patient. The exception is myelopathy: when surgery is indicated, the adequacy text says continued conservative care is not the right path.
5. **Where guidelines conflict,** the row is kept and the conflict is written into `applicability`. Examples: NICE NG59 advises against acupuncture, SNRIs, gabapentinoids, and oral steroids for sciatica, and against fusion for LBP. ACP and ODG support some of these.
6. **Adequacy numbers** (visit counts, relief thresholds, injection frequency) are the commonly cited ODG and legacy CA MTUS-style benchmarks. ODG is subscription content and I could not read its current text. The CA MTUS acupuncture and chronic-pain numeric schedules were replaced by incorporated ACOEM guidelines (acupuncture in 2017; chronic pain update effective 6/1/2026). Treat these numbers as defaults to check against the licensed ODG/ACOEM before relying on them.
7. **Jurisdiction.** Arizona workers' comp uses **ODG** (A.A.C. R20-5-1301; checked on azica.gov). California uses the MTUS, which incorporates ACOEM (Low Back 2/13/2020; Cervical & Thoracic 10/17/2018). `az_ica_odg`, `ca_mtus`, `ama_guides_6th`, and `nass_lbp_2020` are reference-only sources and are not linked to any ladder entry.
8. **Thoracic evidence is thin.** Many thoracic rows extrapolate from cervical and lumbar guidelines, and their applicability text says so. Thoracic facet MBB/RFA, SI-joint diagnoses and procedures, basivertebral nerve ablation, lumbar disc arthroplasty, traction, TENS, and intrathecal pumps are deliberately left out of v0.1.0.
9. **Generic "ESI" / "epidural steroid injection"** aliases are attached to the interlaminar row in each region, because the approach is often unstated.
