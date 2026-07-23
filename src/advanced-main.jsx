import { getTenantSlug } from "./lib/subdomain";

const tenantSlug = getTenantSlug(window.location.hostname);

if (tenantSlug) {
  Promise.all([
    import("react"),
    import("react-dom/client"),
    import("./PublicSite"),
  ]).then(([ReactModule, ReactDOMModule, PublicSiteModule]) => {
    const React = ReactModule.default;
    const root = ReactDOMModule.createRoot(document.getElementById("root"));
    root.render(React.createElement(PublicSiteModule.default, { slug: tenantSlug }));
  });
} else {
  import("./main.jsx");
}
