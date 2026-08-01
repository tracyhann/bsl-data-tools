"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const indexPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const scriptMatch = html.match(/<script>\s*("use strict";[\s\S]*?)<\/script>/);

assert.ok(scriptMatch, "Expected one inline application script");

class FakeHTMLElement {
  constructor(id = "") {
    this.id = id;
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.disabled = false;
    this.children = [];
    this.listeners = new Map();
    this.classList = { toggle() {} };
    this.validationMessage = "";
    this.reportValidityCalls = 0;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ target: this });
    }
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelectorAll() {
    return [];
  }

  setAttribute() {}
  setCustomValidity(message) {
    this.validationMessage = message;
  }
  reportValidity() {
    this.reportValidityCalls += 1;
    return this.value.trim() !== "" && this.validationMessage === "";
  }
  remove() {}
  focus() {}
  blur() {}
  click() {}
}

function loadApp() {
  const ids = [
    "protocolSelect",
    "protocolDetails",
    "protocolStatus",
    "subjectIdInput",
    "msoStepSizeInput",
    "motorThresholdInput",
    "treatmentTargetPercentageInput",
    "treatmentTargetDisplay",
    "startButton",
    "logButton",
    "deleteLastButton",
    "exportButton",
    "resetButton",
    "startTimeDisplay",
    "rowCountDisplay",
    "logTableBody",
    "sessionIndicator",
    "sessionIndicatorText",
    "emptyRow"
  ];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeHTMLElement(id)]));
  const createdElements = [];
  let exportedBlob = null;

  elements.protocolSelect.value = "SNT";
  elements.subjectIdInput.value = "SUBJECT-001";
  elements.msoStepSizeInput.value = "2";
  elements.treatmentTargetPercentageInput.value = "120";

  const document = {
    activeElement: null,
    body: new FakeHTMLElement("body"),
    getElementById(id) {
      return elements[id] || null;
    },
    createElement() {
      const element = new FakeHTMLElement();
      createdElements.push(element);
      return element;
    }
  };

  const context = vm.createContext({
    Blob,
    console,
    document,
    HTMLElement: FakeHTMLElement,
    URL: {
      createObjectURL(blob) {
        exportedBlob = blob;
        return "blob:test";
      },
      revokeObjectURL() {}
    },
    window: {
      confirm() {
        return true;
      }
    }
  });

  vm.runInContext(scriptMatch[1], context);
  return {
    context,
    createdElements,
    elements,
    getExportedBlob() {
      return exportedBlob;
    }
  };
}

function run(context, source) {
  return vm.runInContext(source, context);
}

test("calculates and rounds the treatment target to a whole MSO", () => {
  const { context } = loadApp();
  assert.equal(run(context, `calculateTreatmentTarget("43", "120")`), 52);
});

test("returns blank target when either calculator input is blank", () => {
  const { context } = loadApp();
  assert.equal(run(context, `calculateTreatmentTarget("", "120")`), "");
  assert.equal(run(context, `calculateTreatmentTarget("43", "")`), "");
});

test("returns blank target when finite inputs overflow during multiplication", () => {
  const { context } = loadApp();
  assert.equal(
    run(context, `calculateTreatmentTarget("1e308", "1e308")`),
    ""
  );
});

test("calculates the first-row MSO as target minus 30", () => {
  const { context } = loadApp();
  assert.equal(run(context, "calculateInitialMso(52)"), "22");
  assert.equal(run(context, "calculateInitialMso(20)"), "-10");
  assert.equal(run(context, `calculateInitialMso("")`), "");
});

test("renders the treatment-target controls with a 120 percent default", () => {
  assert.match(html, /id="motorThresholdInput"/);
  assert.match(
    html,
    /id="treatmentTargetPercentageInput"[\s\S]*?value="120"/
  );
  assert.match(html, /id="treatmentTargetDisplay"/);
});

test("allows the treatment-target row to wrap at mid-width viewports", () => {
  const mediaRule = html.match(
    /@media \(max-width: 720px\) \{([\s\S]*?)@media \(max-width: 430px\)/
  );
  assert.ok(mediaRule, "Expected the 720px responsive rule");
  assert.match(
    mediaRule[1],
    /\.treatment-target-row\s*\{[^}]*flex-wrap:\s*wrap;/
  );
  assert.match(
    mediaRule[1],
    /\.treatment-target-title\s*\{[^}]*flex:\s*0 0 100%;/
  );
});

test("updates the displayed treatment target as inputs change", () => {
  const { elements } = loadApp();
  elements.motorThresholdInput.value = "43";
  elements.motorThresholdInput.dispatch("input");
  assert.equal(elements.treatmentTargetDisplay.textContent, "52");

  elements.motorThresholdInput.value = "";
  elements.motorThresholdInput.dispatch("input");
  assert.equal(elements.treatmentTargetDisplay.textContent, "—");
});

test("normalizes calculator inputs to whole numbers on change", () => {
  const { elements } = loadApp();
  elements.motorThresholdInput.value = "42.6";
  elements.motorThresholdInput.dispatch("change");
  assert.equal(elements.motorThresholdInput.value, "43");
  assert.equal(elements.treatmentTargetDisplay.textContent, "52");
});

test("starts with treatment target minus 30 in the first MSO field", () => {
  const { context, createdElements, elements } = loadApp();
  elements.motorThresholdInput.value = "43";
  elements.motorThresholdInput.dispatch("input");

  run(context, "startSession()");

  assert.equal(run(context, "rows[0].mso"), "22");
  const msoInput = createdElements.find(element => element.className === "mso-input");
  assert.equal(msoInput.value, "22");
});

test("allows a blank target and starts with a blank first MSO field", () => {
  const { context, createdElements } = loadApp();

  run(context, "startSession()");

  assert.equal(run(context, "rows[0].mso"), "");
  const msoInput = createdElements.find(element => element.className === "mso-input");
  assert.equal(msoInput.value, "");
});

test("allows an unclamped negative first-row MSO without a conflicting minimum", () => {
  const { context, createdElements, elements } = loadApp();
  elements.motorThresholdInput.value = "20";
  elements.treatmentTargetPercentageInput.value = "100";

  run(context, "startSession()");

  const msoInput = createdElements.find(element => element.className === "mso-input");
  assert.equal(msoInput.value, "-10");
  assert.equal(msoInput.min || "", "");
});

test("does not overwrite a manually edited first MSO when target inputs change", () => {
  const { context, createdElements, elements } = loadApp();
  elements.motorThresholdInput.value = "43";
  elements.motorThresholdInput.dispatch("input");
  run(context, "startSession()");

  const msoInput = createdElements.find(element => element.className === "mso-input");
  msoInput.value = "35";
  msoInput.dispatch("input");
  elements.motorThresholdInput.value = "50";
  elements.motorThresholdInput.dispatch("input");

  assert.equal(run(context, "rows[0].mso"), "35");
  assert.equal(msoInput.value, "35");
});

test("continues to add the configured step size after the first row", () => {
  const { context, createdElements, elements } = loadApp();
  elements.motorThresholdInput.value = "43";
  elements.motorThresholdInput.dispatch("input");
  run(context, "startSession()");

  run(context, "addRow(new Date(startTime.getTime() + 9800), 9.8)");

  const msoInputs = createdElements.filter(
    element => element.className === "mso-input"
  );
  assert.equal(msoInputs[0].value, "22");
  assert.equal(msoInputs[1].value, "24");
});

test("restarts with a new first-row MSO from the current treatment target", () => {
  const { context, createdElements, elements } = loadApp();
  elements.motorThresholdInput.value = "43";
  run(context, "startSession()");
  assert.equal(run(context, "rows[0].mso"), "22");

  elements.motorThresholdInput.value = "50";
  elements.motorThresholdInput.dispatch("input");
  run(context, "startSession()");

  assert.equal(run(context, "rows.length"), 1);
  assert.equal(run(context, "rows[0].mso"), "30");
  const msoInputs = createdElements.filter(
    element => element.className === "mso-input"
  );
  assert.equal(msoInputs.at(-1).value, "30");
});

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
