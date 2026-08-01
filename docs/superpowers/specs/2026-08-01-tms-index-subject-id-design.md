# TMS Logger One-Based Index and Subject ID Design

## Scope

Update the standalone TMS ramp-up logger so train indices are one-based and each exported session identifies its subject once.

## User interface

- Add a text input labeled `Subject ID` next to the treatment-target controls.
- Mark the input as required.
- A session cannot start while Subject ID is blank. Use the browser's native required-field validation so the missing value is explained at the input.
- Subject ID is a session-level value, not a value stored on every train row.

## Train index

- Calculate every train index with `floor(elapsed / cycle) + 1`.
- For the SNT cycle of 9.8 seconds, elapsed time `0` produces index `1`, and elapsed time `9.8` produces index `2`.
- Update the visible formula chip to show `index = floor(elapsed ÷ 9.8 s) + 1`.
- The one-based value flows through the table, MSO accessibility label, and CSV without separate conversions.

## CSV export

- Write Subject ID once as the first metadata row: `Subject ID,<value>`.
- Follow the metadata row with the existing column header and train rows.
- Trim Subject ID and apply the existing CSV escaping so commas, quotes, and line breaks remain valid CSV.
- Keep the existing export filename format.

## Validation and errors

- Trim surrounding whitespace when checking and exporting Subject ID.
- Block session start when the field is empty or whitespace-only.
- Because rows cannot exist without a valid Subject ID, export continues to require at least one logged row and uses the current Subject ID value.

## Testing

- Add regression tests proving elapsed times `0` and `9.8` produce train indices `1` and `2`.
- Add tests proving a blank Subject ID blocks session start.
- Add tests proving CSV output contains one escaped Subject ID metadata row and does not repeat Subject ID in the train table.
- Run the complete Node test file after implementation.
