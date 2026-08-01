# TMS Subject ID Filename Design

## Scope

Include the required Subject ID in the TMS CSV download filename while leaving the CSV contents and session behavior unchanged.

## Filename format

- Use `TMS_Log_<SubjectID>_<timestamp>.csv`.
- Continue using the existing local timestamp format: `YYYYMMDD_HHMMSS`.
- Read Subject ID through the existing trimmed `getSubjectId()` path.
- Convert each run of characters outside ASCII letters, digits, `.`, `_`, and `-` to one underscore so the filename is portable across common operating systems.
- Example: Subject ID `ABC / 123` produces a filename shaped like `TMS_Log_ABC_123_20260801_143000.csv`.

## Data flow and errors

- `exportCsv()` continues to validate Subject ID before producing a download.
- A small filename-part sanitizer transforms only the filename copy of Subject ID.
- The original trimmed Subject ID remains unchanged in the CSV metadata row.
- No new validation messages or filename fallback are needed because Subject ID is already required and every nonempty value produces at least one safe character or underscore.

## Testing

- Extend the existing export test to inspect the generated anchor's `download` value.
- Use a Subject ID containing spaces and a slash to prove unsafe runs become one underscore.
- Assert the complete filename structure, including sanitized Subject ID and the existing timestamp format.
- Run the complete Node test file to guard the existing CSV content, train-index, and session behavior.
