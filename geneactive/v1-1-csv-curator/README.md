# GENEActiv 1.1 CSV Curator

Python utility for splitting a raw CSV export from a GENEActiv device model 1.1 into structured metadata and sensor data files. The source CSV is read without modification.

```text
raw GENEActiv 1.1 CSV -> meta.json + data.csv
```

Use this tool when GENEActiv PC Software has exported one CSV containing both device metadata and timestamped measurements. The curator separates those sections and standardizes the output column names without transforming numeric sensor values.

## Requirements

- Python 3.9 or newer
- No third-party Python packages
- A raw GENEActiv PC Software CSV export from device model 1.1

## Files

| Path | Purpose |
| --- | --- |
| `geneactive_curator.py` | Command-line tool and importable parser. |

## Expected Input

The CSV should contain:

- metadata rows before the measurements, such as device model, serial code, measurement frequency, start time, and subject code;
- optional `Sensor type` sections with range, resolution, units, and additional information;
- measurement rows with exactly seven fields and timestamps formatted as `YYYY-MM-DD HH:MM:SS:mmm`.

The seven measurement fields are interpreted in this order:

```text
timestamp, acceleration x, acceleration y, acceleration z, light, button, temperature
```

This tool is intended and tested for GENEActiv device model 1.1. It records the exported device model in `meta.json` but does not independently reject another model, so confirm the source export reports model `1.1` before use.

## Quick Start

From the `tools` repository root, run:

```bash
python3 geneactive/v1-1-csv-curator/geneactive_curator.py \
  "/path/to/raw-geneactive-export.csv"
```

When the output directory is omitted, the tool creates a sibling directory named `<input_stem>_curated`.

To choose the output directory explicitly:

```bash
python3 geneactive/v1-1-csv-curator/geneactive_curator.py \
  "/path/to/raw-geneactive-export.csv" \
  "/path/to/curated-output"
```

The command reports both generated paths and the number of extracted data rows.

## Output

```text
curated-output/
├── meta.json
└── data.csv
```

### `data.csv`

The measurement file always has these columns:

| Column | Meaning |
| --- | --- |
| `timestamp` | Source measurement timestamp in `YYYY-MM-DD HH:MM:SS:mmm` format. |
| `accel_x_g` | X-axis acceleration in g. |
| `accel_y_g` | Y-axis acceleration in g. |
| `accel_z_g` | Z-axis acceleration in g. |
| `light_lux` | Ambient light in lux. |
| `button_pressed` | Device button event value. |
| `temperature_c` | Temperature in degrees Celsius. |

### `meta.json`

The metadata file contains:

| Field | Meaning |
| --- | --- |
| `source_file_name` | Name of the raw CSV. |
| `source_path` | Input path supplied to the parser. |
| `data_file_name` | Generated measurement filename, `data.csv`. |
| `columns` | Ordered measurement column names. |
| `data_rows` | Number of extracted measurement rows. |
| `data_start_line` | First measurement line in the source CSV. |
| `sampling_frequency_hz` | Numeric frequency parsed from the export metadata, when available. |
| `metadata` | Export metadata with normalized `snake_case` keys. |
| `sensors` | Sensor type, range, resolution, units, and additional information. |

## Python Usage

The parser can also be called from Python:

```python
import sys
from pathlib import Path

sys.path.insert(0, "geneactive/v1-1-csv-curator")
from geneactive_curator import curate_geneactive_csv

result = curate_geneactive_csv(
    Path("/path/to/raw-geneactive-export.csv"),
    Path("/path/to/curated-output"),
)

print(result.meta_path)
print(result.data_path)
print(result.data_rows)
```

The function returns a `CuratedGeneActiveExport` containing `output_dir`, `meta_path`, `data_path`, and `data_rows`.

## Behavior and Safety

- The raw input CSV is never modified.
- The output directory is created when needed.
- Existing `meta.json` and `data.csv` files in the selected output directory are replaced.
- Measurement rows are streamed to `data.csv`, avoiding an in-memory copy of the full export.
- UTF-8 byte-order marks, null characters, and surrounding whitespace are cleaned while parsing.
- Metadata keys are normalized to lowercase `snake_case`; source metadata values are retained as text.
- The parser raises `GeneActiveFormatError` if it finds no valid measurement rows or encounters a non-data row after measurement extraction has begun.

## Troubleshooting

### No GENEActiv data rows found

Confirm that each measurement row has exactly seven comma-separated fields and that its timestamp uses `YYYY-MM-DD HH:MM:SS:mmm`, with a colon before milliseconds.

### Unexpected non-data row after data started

The parser requires measurement rows to remain contiguous after the first valid timestamped row. Inspect the reported source line for an embedded header, note, or malformed measurement.

### Confirm the device model

Open the generated `meta.json` and check:

```json
{
  "metadata": {
    "device_model": "1.1"
  }
}
```
