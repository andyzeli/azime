# Data Model

## Case

Top-level IME matter. Owns documents, questionnaires, physician decisions,
case-level AI outputs, and generated reports.

## Document

One human-separated medical-record document.

Stores:

- case ID
- document type
- provider
- service date
- GCP object reference
- upload metadata

## Case Provider

A case-scoped individual provider or facility referenced by medical documents.

Stores:

- UUID
- case ID
- name
- kind (`individual` or `facility`)
- discipline

Encounter, therapy, surgery, and intervention documents reference a case
provider through a relational foreign key.

## Document Extraction

Structured facts extracted from one document as an Event.

Stores:

- document ID
- JSONB extraction result
- event type
- date

AI-generated and non-authoritative.

## Case Synthesis

Case-level output generated from document extractions.

- Data model still in progress

AI-generated and non-authoritative.

## Physician Decision

Structured clinical conclusions entered or confirmed by the physician.

Includes:

- final MMI decision
- causation
- apportionment
- treatment recommendations
- work status
- impairment inputs when applicable

Authoritative for report generation.

## Questionnaire

Patient-entered disability questionnaire responses and calculated scores.

## Report

Generated IME report draft and its status.

Should retain references to the input/version set used to generate it.
