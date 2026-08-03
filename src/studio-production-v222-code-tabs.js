// v222 explicit Theme code actions open the matching editor tab after the modal mounts.
function normalizedLabel(node) {
  return String(node?.textContent || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function openRequestedTab(kind) {
  const expected = String(kind || "").toLowerCase();
  if (!["html", "css", "javascript"].includes(expected)) return;
  let attempts = 0;
  const find = () => {
    attempts += 1;
    const workspace = document.querySelector(".tn-code-workspace");
    const buttons = [...(workspace?.querySelectorAll(".tn-code-pane>nav button") || [])];
    const target = buttons.find((button) => {
      const label = normalizedLabel(button);
      if (expected === "javascript") return label.includes("javascript");
      return label === expected || label.includes(expected);
    });
    if (target) {
      target.click();
      target.focus({ preventScroll: true });
      workspace.dataset.v222RequestedTab = expected;
      return;
    }
    if (attempts < 12) requestAnimationFrame(find);
  };
  requestAnimationFrame(find);
}

document.addEventListener("click", (event) => {
  const action = event.target?.closest?.("[data-v222-code-tab]");
  if (!action) return;
  openRequestedTab(action.dataset.v222CodeTab);
}, true);

export { openRequestedTab };
