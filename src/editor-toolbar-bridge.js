import "./editor-toolbar-bridge.css";

let storedRange = null;
let queued = false;

function editorElement() {
  return document.querySelector(".editor-app .real-page[contenteditable='true']");
}

function rememberSelection() {
  const editor = editorElement();
  const selection = window.getSelection();
  if (!editor || !selection?.rangeCount) {
    storedRange = null;
    return;
  }
  const range = selection.getRangeAt(0);
  storedRange = editor.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
}

function restoreSelection() {
  const editor = editorElement();
  if (!editor) return null;
  editor.focus();
  const selection = window.getSelection();
  if (storedRange && editor.contains(storedRange.commonAncestorContainer)) {
    selection.removeAllRanges();
    selection.addRange(storedRange);
  }
  return editor;
}

function notifyEditor(editor) {
  const event = typeof InputEvent === "function"
    ? new InputEvent("input", { bubbles: true, inputType: "formatSetBlockTextDirection" })
    : new Event("input", { bubbles: true });
  editor.dispatchEvent(event);
  rememberSelection();
}

function command(name, value = null) {
  const editor = restoreSelection();
  if (!editor) return;
  document.execCommand(name, false, value);
  notifyEditor(editor);
}

function applyFontSize(px) {
  const editor = restoreSelection();
  if (!editor) return;
  document.execCommand("fontSize", false, "7");
  for (const font of editor.querySelectorAll('font[size="7"]')) {
    font.removeAttribute("size");
    font.style.fontSize = `${px}px`;
  }
  notifyEditor(editor);
}

function selectedBlock(editor) {
  const selection = window.getSelection();
  let node = selection?.anchorNode || null;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!(node instanceof Element) || !editor.contains(node)) return editor;
  return node.closest("p,h1,h2,h3,h4,blockquote,li,div,td,th") || editor;
}

function applyLineHeight(value) {
  const editor = restoreSelection();
  if (!editor) return;
  selectedBlock(editor).style.lineHeight = value;
  notifyEditor(editor);
}

function applyLetterSpacing(value) {
  const editor = restoreSelection();
  if (!editor) return;
  selectedBlock(editor).style.letterSpacing = value;
  notifyEditor(editor);
}

function labeledControl(labelText, control) {
  const label = document.createElement("label");
  label.className = "advanced-editor-control";
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(text, control);
  return label;
}

function selectControl(label, values, onChange, defaultValue) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", label);
  for (const [value, text] of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  select.value = defaultValue;
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function colorControl(label, value, onChange) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  input.title = label;
  input.setAttribute("aria-label", label);
  input.addEventListener("input", () => onChange(input.value));
  return input;
}

function actionButton(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function enhanceToolbar(toolbar) {
  if (toolbar.dataset.advancedTypography === "true") return;
  toolbar.dataset.advancedTypography = "true";

  const group = document.createElement("div");
  group.className = "ribbon-group advanced-typography-group";
  const heading = document.createElement("span");
  heading.textContent = "Tipografi lanjut";
  const controls = document.createElement("nav");

  const sizes = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72]
    .map((size) => [String(size), `${size} px`]);
  controls.append(
    labeledControl("Ukuran", selectControl("Ukuran huruf", sizes, (value) => applyFontSize(Number(value)), "16")),
    labeledControl("Teks", colorControl("Warna teks", "#17233c", (value) => command("foreColor", value))),
    labeledControl("Sorot", colorControl("Warna sorotan", "#fff0a8", (value) => command("hiliteColor", value))),
    labeledControl("Jarak baris", selectControl("Jarak baris", [
      ["1", "1.0"],
      ["1.25", "1.25"],
      ["1.5", "1.5"],
      ["1.75", "1.75"],
      ["2", "2.0"],
    ], applyLineHeight, "1.5")),
    labeledControl("Spasi huruf", selectControl("Spasi huruf", [
      ["-0.03em", "Rapat"],
      ["0", "Normal"],
      ["0.03em", "Lebar"],
      ["0.08em", "Sangat lebar"],
    ], applyLetterSpacing, "0")),
    actionButton("Hapus format", () => command("removeFormat")),
    actionButton("Garis pemisah", () => command("insertHorizontalRule")),
  );

  group.addEventListener("pointerdown", rememberSelection, true);
  group.addEventListener("focusin", () => {
    if (!storedRange) rememberSelection();
  });
  group.append(heading, controls);
  toolbar.insertBefore(group, toolbar.querySelector(".nara-ribbon"));
}

function enhance() {
  for (const toolbar of document.querySelectorAll(".editor-app .editor-ribbon")) enhanceToolbar(toolbar);
}

function queueEnhance() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    enhance();
  });
}

document.addEventListener("selectionchange", () => {
  const editor = editorElement();
  const selection = window.getSelection();
  if (editor && selection?.rangeCount && editor.contains(selection.anchorNode)) rememberSelection();
});

new MutationObserver(queueEnhance).observe(document.documentElement, { childList: true, subtree: true });
queueEnhance();
