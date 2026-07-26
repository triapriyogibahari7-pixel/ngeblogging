const RELEASE = "studio-theme-domain-v50-20260726";
let frame = 0;

function text(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function buttonByText(container, expected) {
  const wanted = expected.toLocaleLowerCase("id-ID");
  return [...(container?.querySelectorAll(":scope > button") || [])]
    .find((button) => text(button).toLocaleLowerCase("id-ID") === wanted) || null;
}

function syncPressedState(studio) {
  studio.querySelectorAll(".tn-category-tabs > button, .tn-blueprint-list > button").forEach((button) => {
    button.type = "button";
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
    button.disabled = false;
    button.style.pointerEvents = "auto";
  });
}

function markStudio(studio) {
  studio.dataset.themeAuthorityV50 = RELEASE;
  syncPressedState(studio);
  const library = studio.querySelector(".tn-library");
  if (library) library.dataset.themeLibraryV50 = "true";
}

/* Category and site-type are both useful, but the old initial site blueprint made
   categories such as Bisnis and Landing look broken because it filtered them to
   zero results. Selecting a category now returns the site-type filter to Semua;
   users can still deliberately choose a site type afterwards. */
document.addEventListener("click", (event) => {
  const category = event.target.closest(".tn-category-tabs > button");
  if (category) {
    const studio = category.closest(".tn-studio");
    const blueprints = studio?.querySelector(".tn-blueprint-list");
    const allBlueprints = buttonByText(blueprints, "Semua");
    if (allBlueprints && !allBlueprints.classList.contains("active")) allBlueprints.click();
    requestAnimationFrame(() => syncPressedState(studio));
    return;
  }

  const blueprint = event.target.closest(".tn-blueprint-list > button");
  if (blueprint) requestAnimationFrame(() => syncPressedState(blueprint.closest(".tn-studio")));
}, true);

function scan() {
  document.documentElement.dataset.studioThemeDomainV50 = RELEASE;
  document.querySelectorAll(".tn-studio").forEach(markStudio);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.attributeName === "class")) schedule();
}).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["class"] });

window.addEventListener("resize", schedule, { passive:true });
window.addEventListener("orientationchange", schedule, { passive:true });
scan();
