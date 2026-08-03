// v222 hotfix: explicit Theme code actions open the requested editor tab after React mounts the modal.
function labelOf(node) {
  return String(node?.textContent || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function openRequestedThemeCodeTab(kind) {
  const requested = String(kind || "").toLowerCase();
  if (!["html", "css", "javascript"].includes(requested)) return;
  let attempts = 0;
  const select = () => {
    attempts += 1;
    const pane = document.querySelector(".tn-code-workspace .tn-code-pane");
    const buttons = [...(pane?.querySelectorAll(":scope>nav button") || [])];
    const target = buttons.find((button) => {
      const label = labelOf(button);
      return requested === "javascript" ? label.includes("javascript") : label.includes(requested);
    });
    if (target) {
      target.click();
      target.focus({ preventScroll: true });
      pane.closest(".tn-code-workspace")?.setAttribute("data-v222-requested-tab", requested);
      return;
    }
    if (attempts < 12) requestAnimationFrame(select);
  };
  requestAnimationFrame(select);
}

document.addEventListener("click", (event) => {
  const action = event.target?.closest?.("[data-v222-code-tab]");
  if (!action) return;
  openRequestedThemeCodeTab(action.dataset.v222CodeTab);
}, true);

export { openRequestedThemeCodeTab };
