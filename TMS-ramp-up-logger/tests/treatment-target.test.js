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

  elements.protocolSelect.value = "SNT";
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
      createObjectURL() {
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
  return { context, createdElements, elements };
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
