# TMS Subject ID Filename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include a portable, sanitized Subject ID in every TMS CSV download filename.

**Architecture:** Keep export ownership inside the existing standalone `index.html`. Add one pure filename-part sanitizer, use the already validated and trimmed Subject ID when constructing `link.download`, and verify the observable download filename through the existing fake DOM harness.

**Tech Stack:** HTML5, browser JavaScript, Node.js `node:test`, `node:assert`, `node:vm`

---

## File map

- Modify `TMS-ramp-up-logger/index.html`: sanitize Subject ID for filenames and insert it before the existing timestamp.
- Modify `TMS-ramp-up-logger/tests/treatment-target.test.js`: assert the generated anchor's exact Subject ID filename shape.

### Task 1: Add Subject ID to the CSV filename

**Files:**
- Modify: `TMS-ramp-up-logger/tests/treatment-target.test.js:330-347`
- Modify: `TMS-ramp-up-logger/index.html:1075-1116`

- [ ] **Step 1: Write the failing filename regression test**

Append this test to `TMS-ramp-up-logger/tests/treatment-target.test.js`:

```js
test("includes a sanitized Subject ID in the CSV filename", () => {
  const { context, createdElements, elements } = loadApp();
  elements.subjectIdInput.value = " ABC / 123 ";
  run(context, "startSession()");

  run(context, "exportCsv()");
  const downloadLink = createdElements.find(element => element.download);

  assert.ok(downloadLink, "Expected export to create a download link");
  assert.match(
    downloadLink.download,
    /^TMS_Log_ABC_123_\d{8}_\d{6}\.csv$/
  );
});
```

- [ ] **Step 2: Run the focused test and verify the missing Subject ID failure**

Run:

```bash
node --test --test-name-pattern="sanitized Subject ID" TMS-ramp-up-logger/tests/treatment-target.test.js
```

Expected: FAIL because the actual filename is `TMS_Log_<timestamp>.csv` and does not match `TMS_Log_ABC_123_<timestamp>.csv`.

- [ ] **Step 3: Add the minimal filename sanitizer**

Insert this pure helper immediately after `escapeCsv()` in `TMS-ramp-up-logger/index.html`:

```js
function sanitizeFilenamePart(value) {
  return String(value ?? "").replace(/[^A-Za-z0-9._-]+/g, "_");
}
```

- [ ] **Step 4: Include sanitized Subject ID in `link.download`**

After computing `fileTimestamp`, add:

```js
const filenameSubjectId = sanitizeFilenamePart(subjectId);
```

Replace the download assignment with:

```js
link.download = `TMS_Log_${filenameSubjectId}_${fileTimestamp}.csv`;
```

- [ ] **Step 5: Run focused and complete verification**

Run:

```bash
node --test --test-name-pattern="sanitized Subject ID" TMS-ramp-up-logger/tests/treatment-target.test.js
node --test TMS-ramp-up-logger/tests/treatment-target.test.js
git diff --check
```

Expected: the focused test passes, all 19 tests pass, and `git diff --check` prints nothing.

- [ ] **Step 6: Commit the behavior change**

```bash
git add TMS-ramp-up-logger/index.html TMS-ramp-up-logger/tests/treatment-target.test.js
git commit -m "fix: include subject ID in TMS filename"
```

### Task 2: Review, merge, and publish

**Files:**
- Verify: `TMS-ramp-up-logger/index.html`
- Verify: `TMS-ramp-up-logger/tests/treatment-target.test.js`

- [ ] **Step 1: Run final branch verification**

```bash
node --test TMS-ramp-up-logger/tests/treatment-target.test.js
git diff --check origin/main...HEAD
git status -sb
```

Expected: all 19 tests pass, no whitespace errors appear, and the feature worktree is clean.

- [ ] **Step 2: Review the complete branch diff against the approved design**

```bash
git diff --stat origin/main...HEAD
git diff origin/main...HEAD -- TMS-ramp-up-logger/index.html TMS-ramp-up-logger/tests/treatment-target.test.js
```

Confirm that the filename is `TMS_Log_<sanitized SubjectID>_<timestamp>.csv`, CSV metadata is unchanged, and only the filename test plus helper/assignment changed application behavior.

- [ ] **Step 3: Fast-forward verified work to main and push**

From the original checkout:

```bash
git fetch origin main
git merge --ff-only agent/tms-subject-id-filename
node --test TMS-ramp-up-logger/tests/treatment-target.test.js
git push origin main
```

Expected: `main` fast-forwards, all 19 tests pass on merged `main`, and `origin/main` advances to the feature head without staging or altering unrelated local files.
