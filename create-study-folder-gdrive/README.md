# Create Study Folder in Google Drive

Google Colab notebook for publishing a cleaned local study folder into the Google Drive study-folder template.

<p align="center">
  <img src="assets/create-study-folder-gdrive-teaser.png" alt="Create Study Folder in Google Drive teaser showing local study exports organized into a Drive-ready folder structure" width="100%">
</p>

<p align="center">
  <a href="https://colab.research.google.com/drive/1DSLWxheAKikej-9QDa1p_WOOGpl1jtXA?usp=sharing">
    <img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab" width="15%">
  </a>
</p>

<p align="center" style="font-size: 1.55rem;">
  <strong>Move from local cleaned workbooks to a Drive-ready study folder without hand-copying every sheet.</strong><br>
  Upload a zipped study folder, choose the template and destination, then initialize Drive, fill overview/data-map sheets, and upload cleaned data.
</p>

<p align="center" style="font-size: 1.55rem;">
  <code>local study folder</code> + <code>Drive template</code> -&gt; <code>published Google Drive study folder</code>
</p>

> [!TIP]
> This notebook is designed for Google Colab because it uses `google.colab.auth` to authenticate with Drive and Sheets. Upload this notebook to Colab, or open it from GitHub once the repository is hosted.

[Open the local notebook file](create-study-folder-gdrive.ipynb)

Use this when you have already generated a local study folder with cleaned REDCap instruments, overview workbooks, and data maps, and want to:

- copy a Google Drive study-folder template into a destination Drive folder;
- replace `STUDY` and `IRB` placeholders in copied Drive folders and file names;
- fill the root `IRB-meta` sheet with the configured study name and IRB;
- push local overview workbook values into the matching Drive overview sheet;
- upload cleaned data into class folders such as `assessments`, `neuroimaging`, `treatments`, and `subjects`;
- fill Drive data-map tabs using local `*-data-map.xlsx` files and uploaded Drive links;
- keep a local `log.md` trail in the study folder history.

## Files

| Path | Purpose |
| --- | --- |
| `create-study-folder-gdrive.ipynb` | Main Colab notebook. |

## Inputs

| Input | Purpose |
| --- | --- |
| `STUDY_NAME` | Human-readable study name used when replacing `STUDY` placeholders. |
| `IRB` | IRB value or combined IRB label, such as `53879-62882`. |
| `TEMPLATE_FOLDER_URL` | Google Drive folder URL or folder ID for the study-folder template. |
| `DESTINATION_PARENT_FOLDER` | Drive folder URL, folder ID, or `root` for the destination parent. |
| `STAGE` | Workflow stage: `initialize`, `upload`, `data-map`, or `all`. |
| `REPO_URL` | Workflow scripts repo. Defaults to `https://github.com/tracyhann/bsl-data-workflows.git`. |
| `REFRESH_SCRIPTS_FROM_REPO` | When `True`, replaces any uploaded `scripts/` folder with the latest scripts from `REPO_URL`. |
| Local study folder zip | A zipped local study folder containing `data/cleaned`, `overview`, `data-map`, and `histories` where available. |

Optional overrides let you reuse an already initialized Drive folder, point to custom overview/data-map destinations, or override template locations.

## Output

The notebook writes to Google Drive and logs locally.

| Output item | What it contains |
| --- | --- |
| Initialized Drive folder | Copied template with `STUDY` and `IRB` placeholders renamed. |
| Drive overview sheet | Values copied from the local overview workbook by tab and column name. |
| Uploaded cleaned data | Instrument workbooks and other files mirrored into Drive class folders. |
| Drive data map | Data-map entries filled from local `*-data-map.xlsx` workbooks, with locations rewritten to Drive links when upload succeeded. |
| Local `log.md` | Initialization, upload, and data-map status in the most recent local history folder. |

## Quick Start

1. Zip the local study folder you want to publish.
2. Open `create-study-folder-gdrive.ipynb` in Google Colab.
3. Run the authentication cell and sign in with the Google account that can edit the destination folder and template.
4. Fill in `STUDY_NAME`, `IRB`, `TEMPLATE_FOLDER_URL`, and `DESTINATION_PARENT_FOLDER`.
5. Set `STAGE = "all"` for a complete run, or choose a single stage.
6. Keep `REFRESH_SCRIPTS_FROM_REPO = True` unless you intentionally want to run scripts bundled inside the uploaded zip.
7. Upload the zipped local study folder when prompted.
8. Run the workflow cell and review the printed output plus the local `log.md`.

## Local Equivalent

The Colab notebook wraps the same local workflow runner. The equivalent local command is:

```bash
python3 scripts/workflows/create_study_folder_gdrive/run.py \
  --stage all \
  --study-folder studies/53879-62882-OCD-TMS \
  --study-name "OCD-TMS" \
  --irb "53879-62882" \
  --template "https://drive.google.com/drive/folders/1OLGHgxPg9UsBDbOH6vgSjiS6dUW0lBCF?usp=sharing" \
  --destination root \
  --access-token "$GOOGLE_OAUTH_ACCESS_TOKEN"
```

## Human Checkpoints

- Before running `initialize`, confirm the destination parent folder is correct.
- After `initialize`, open the copied Drive folder and confirm names, permissions, `IRB-meta`, and template layout.
- Before `upload`, review the local cleaned study folder, especially excluded columns/instruments and final verification logs.
- After `upload`, spot-check several uploaded instrument workbooks, including one REDCap instrument and one non-REDCap file if present.
- After `data-map`, confirm locations point to the uploaded Drive files and fill any platform rows that need human context.

## Notes

- Google authentication is handled inside Colab with `google.colab.auth.authenticate_user()`.
- The notebook never prints the raw OAuth access token.
- The notebook refreshes scripts from GitHub by default so reruns use the newest workflow fixes.
- The Drive account must have edit access to the template and destination parent folder.
- REDCap instrument workbooks are pushed into REDCap-specific Google Sheet templates; other spreadsheets use the blank template.
- The workflow preserves template layouts by copying native Google Drive files before writing values.
