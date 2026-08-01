# TMS One-Based Index and Subject ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TMS train indices one-based and require one session-level Subject ID that is written once at the top of each CSV export.

**Architecture:** Keep the logger's existing single-file HTML/CSS/JavaScript structure and Node `vm` test harness. Compute the one-based index once when each row is created, validate Subject ID at session boundaries, and serialize Subject ID as a two-cell CSV metadata row before the existing log header.

**Tech Stack:** HTML5, CSS, browser JavaScript, Node.js `node:test`, `node:assert`, `node:vm`

---

## File map

- Modify `TMS-ramp-up-logger/index.html`: add the required Subject ID control, validation, one-based index calculation, formula copy, and CSV metadata row.
- Modify `TMS-ramp-up-logger/tests/treatment-target.test.js`: extend the fake DOM/export capture and add regression tests for index, validation, and CSV output.

### Task 1: Make train indices one-based

**Files:**
- Modify: `TMS-ramp-up-logger/tests/treatment-target.test.js:245`
- Modify: `TMS-ramp-up-logger/index.html:725,929-934`

- [ ] **Step 1: Write the failing train-index regression test**

Append this test to `TMS-ramp-up-logger/tests/treatment-target.test.js`:

```js
test("uses one-based train indices at cycle boundaries", () => {
  const { context } = loadApp();

  run(context, `addRow(new Date(0), 0, "")`);
  run(context, `addRow(new Date(9800), 9.8, "")`);

  assert.equal(
    run(context, "JSON.stringify(rows.map(row => row.trainIndex))"),
    "[1,2]"
  );
  assert.match(html, /index = floor\(elapsed ÷ 9\.8 s\) \+ 1/);
});
```

- [ ] **Step 2: Run the test and verify the current zero-based behavior fails**

Run:

```bash
node --test --test-name-pattern="one-based train indices" TMS-ramp-up-logger/tests/treatment-target.test.js
```

Expected: FAIL because the actual train indices are `[0,1]` rather than `[1,2]`.

- [ ] **Step 3: Implement the exact approved formula and update its visible copy**

In `addRow`, replace the index calculation with:

```js
const trainIndex = Math.floor(elapsedSeconds / cycleSeconds) + 1;
```

Replace the formula chip with:

```html
<div class="formula-chip">index = floor(elapsed ÷ 9.8 s) + 1</div>
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node --test --test-name-pattern="one-based train indices" TMS-ramp-up-logger/tests/treatment-target.test.js
```

Expected: PASS with one matching test and no failures.

- [ ] **Step 5: Commit the one-based index change**

```bash
git add TMS-ramp-up-logger/index.html TMS-ramp-up-logger/tests/treatment-target.test.js
git commit -m "fix: use one-based TMS train indices"
```

### Task 2: Require Subject ID before session start

**Files:**
- Modify: `TMS-ramp-up-logger/tests/treatment-target.test.js:15-122`
- Modify: `TMS-ramp-up-logger/index.html:244-267,561-575,606-614,668-708,764-771,985-1002,1088-1112`

- [ ] **Step 1: Extend the fake DOM with required-field validation support**

Add these properties in the `FakeHTMLElement` constructor:

```js
this.validationMessage = "";
this.reportValidityCalls = 0;
```

Add these methods to `FakeHTMLElement`:

```js
setCustomValidity(message) {
  this.validationMessage = message;
}

reportValidity() {
  this.reportValidityCalls += 1;
  return this.value.trim() !== "" && this.validationMessage === "";
}
```

Add `"subjectIdInput"` to the `ids` array in `loadApp()`.

Set a valid default after the existing element defaults so legacy session tests continue to exercise their original behavior:

```js
elements.subjectIdInput.value = "SUBJECT-001";
```

- [ ] **Step 2: Write failing rendering and validation tests**

Append:

```js
test("renders Subject ID as a required field beside the treatment target", () => {
  assert.match(
    html,
    /class="treatment-field subject-id-field"[\s\S]*?for="subjectIdInput">Subject ID<[\s\S]*?id="subjectIdInput"[\s\S]*?required/
  );
});

test("blocks session start when Subject ID is blank or whitespace", () => {
  const { context, elements } = loadApp();
  elements.subjectIdInput.value = "   ";

  run(context, "startSession()");

  assert.equal(run(context, "startTime"), null);
  assert.equal(run(context, "rows.length"), 0);
  assert.equal(elements.subjectIdInput.reportValidityCalls, 1);
  assert.equal(elements.subjectIdInput.validationMessage, "Subject ID is required.");
});
```

- [ ] **Step 3: Run the focused Subject ID tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="Subject ID|session start" TMS-ramp-up-logger/tests/treatment-target.test.js
```

Expected: FAIL because the field is absent and `startSession()` currently creates a row without a Subject ID.

- [ ] **Step 4: Add the Subject ID field beside the treatment target**

Insert this as the first field inside `.treatment-target-row`:

```html
<div class="treatment-field subject-id-field">
  <label for="subjectIdInput">Subject ID</label>
  <input
    class="control-input"
    id="subjectIdInput"
    type="text"
    autocomplete="off"
    required
  />
</div>
```

At the `430px` breakpoint, include `.subject-id-field` with the full-width elements:

```css
.subject-id-field,
.treatment-target-title,
.treatment-result {
  grid-column: 1 / -1;
  width: 100%;
}
```

- [ ] **Step 5: Add trimmed native validation and guard session start**

Bind the new element with the other controls:

```js
const subjectIdInput = document.getElementById("subjectIdInput");
```

Add these helpers before `updateControls()`:

```js
function getSubjectId() {
  return subjectIdInput.value.trim();
}

function validateSubjectId() {
  const subjectId = getSubjectId();
  subjectIdInput.setCustomValidity(
    subjectId === "" ? "Subject ID is required." : ""
  );

  if (subjectId === "") {
    subjectIdInput.reportValidity();
  }

  return subjectId;
}
```

Make this the first guard in `startSession()`:

```js
if (validateSubjectId() === "") return;
```

Register input validation cleanup with the other listeners:

```js
subjectIdInput.addEventListener("input", () => {
  if (getSubjectId() !== "") {
    subjectIdInput.setCustomValidity("");
  }
});
```

- [ ] **Step 6: Run the Subject ID tests and the complete test file**

Run:

```bash
node --test --test-name-pattern="Subject ID|session start" TMS-ramp-up-logger/tests/treatment-target.test.js
node --test TMS-ramp-up-logger/tests/treatment-target.test.js
```

Expected: both Subject ID tests pass; the complete file has zero failures.

- [ ] **Step 7: Commit required Subject ID validation**

```bash
git add TMS-ramp-up-logger/index.html TMS-ramp-up-logger/tests/treatment-target.test.js
git commit -m "feat: require TMS subject ID"
```

### Task 3: Export Subject ID once as CSV metadata

**Files:**
- Modify: `TMS-ramp-up-logger/tests/treatment-target.test.js:59-120`
- Modify: `TMS-ramp-up-logger/index.html:1052-1086`

- [ ] **Step 1: Capture the exported Blob in the test harness**

Inside `loadApp()`, declare:

```js
let exportedBlob = null;
```

Change the fake URL method to capture its argument:

```js
createObjectURL(blob) {
  exportedBlob = blob;
  return "blob:test";
}
```

Extend the returned harness object:

```js
return {
  context,
  createdElements,
  elements,
  getExportedBlob() {
    return exportedBlob;
  }
};
```

- [ ] **Step 2: Write the failing CSV metadata regression test**

Append:

```js
test("exports Subject ID once as escaped CSV metadata", async () => {
  const { context, elements, getExportedBlob } = loadApp();
  elements.subjectIdInput.value = ` ABC, "123" `;
  run(context, "startSession()");

  run(context, "exportCsv()");
  const csv = await getExportedBlob().text();
  const lines = csv.split("\n");

  assert.equal(lines[0], `Subject ID,"ABC, ""123"""`);
  assert.equal(
    lines[1],
    "Current Time,Time Since Start (+ s),Train Index,MSO (%)"
  );
  assert.equal(lines[2].split(",")[2], "1");
  assert.equal((csv.match(/Subject ID/g) || []).length, 1);
});
```

- [ ] **Step 3: Run the focused export test and verify it fails**

Run:

```bash
node --test --test-name-pattern="exports Subject ID" TMS-ramp-up-logger/tests/treatment-target.test.js
```

Expected: FAIL because the first CSV row is currently the train-log header.

- [ ] **Step 4: Validate and prepend the single Subject ID metadata row**

At the start of `exportCsv()`, after the rows guard, add:

```js
const subjectId = validateSubjectId();
if (subjectId === "") return;
```

Add the metadata row and include it once in serialization:

```js
const metadata = ["Subject ID", subjectId];

const csv = [metadata, header, ...csvRows]
  .map(row => row.map(escapeCsv).join(","))
  .join("\n");
```

- [ ] **Step 5: Run the export test and complete suite**

Run:

```bash
node --test --test-name-pattern="exports Subject ID" TMS-ramp-up-logger/tests/treatment-target.test.js
node --test TMS-ramp-up-logger/tests/treatment-target.test.js
```

Expected: the focused test passes; the complete file has zero failures.

- [ ] **Step 6: Commit Subject ID CSV metadata**

```bash
git add TMS-ramp-up-logger/index.html TMS-ramp-up-logger/tests/treatment-target.test.js
git commit -m "feat: include subject ID in TMS export"
```

### Task 4: Verify behavior and publishing scope

**Files:**
- Verify: `TMS-ramp-up-logger/index.html`
- Verify: `TMS-ramp-up-logger/tests/treatment-target.test.js`

- [ ] **Step 1: Run all automated checks from a clean command invocation**

```bash
node --test TMS-ramp-up-logger/tests/treatment-target.test.js
git diff --check origin/main...HEAD
```

Expected: all tests pass, and `git diff --check` prints nothing.

- [ ] **Step 2: Verify the browser workflow**

Serve the worktree locally:

```bash
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/TMS-ramp-up-logger/` in the available browser and verify:

1. Subject ID appears beside Treatment Target at desktop width and uses a full-width row at narrow mobile width.
2. Clicking `TMS Start` with a blank Subject ID triggers required-field validation and creates no row.
3. Entering `ABC123` and clicking `TMS Start` creates Train Index `1`.
4. Exporting produces a CSV whose first row is `Subject ID,ABC123` and whose next row is the existing train-log header.

- [ ] **Step 3: Confirm only intended branch changes will be published**

```bash
git status -sb
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
```

Expected: the branch contains the design/plan documentation plus changes only to `TMS-ramp-up-logger/index.html` and `TMS-ramp-up-logger/tests/treatment-target.test.js`; the unrelated original-checkout edits are absent.
