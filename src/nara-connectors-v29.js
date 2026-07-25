const RELEASE = "nara-connectors-disabled-v33-20260725";
const SELECTOR = [
  ".nara-plugin-trigger-v24",
  ".nara-plugin-trigger-v29",
  ".nara-plugin-panel-v24",
  ".nara-plugin-panel-v29",
].join(",");

function removeConnectorUi(root = document) {
  root.querySelectorAll?.(SELECTOR).forEach((node) => node.remove());
  if (root instanceof Element && root.matches(SELECTOR)) root.remove();
}

removeConnectorUi();

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      removeConnectorUi(node);
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });

document.documentElement.dataset.naraConnectorsV29 = RELEASE;
