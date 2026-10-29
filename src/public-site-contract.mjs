export const PLATFORM_CREDIT_TEXT = "Powered by Ngeblogging · Tri Apriyogi Bahari";
export const PLATFORM_CREDIT_HTML = '<span data-ngeblogging-platform-credit="true">Powered by <a href="https://ngeblogging.com" target="_blank" rel="noopener noreferrer">Ngeblogging</a> · Tri Apriyogi Bahari</span>';
export function withPlatformCredit(input) {
  const html = String(input || "");
  if (html.includes('data-ngeblogging-platform-credit=')) return html;
  return html.replace(/(<footer\b[^>]*>)([\s\S]*?)(<\/footer\s*>)/i, (_, open, body, close) => {
    const cleaned = body.replace(/<span>\s*(?:Powered by Ngeblogging|Built with Ngeblogging|© Ngeblogging)\s*<\/span>/gi, "");
    return `${open}${cleaned}${PLATFORM_CREDIT_HTML}${close}`;
  });
}
export function publicHrefWithPreview(input, previewQuery = "") {
  const path = String(input || "/");
  if (!previewQuery) return path;
  const index = path.indexOf("#");
  const before = index < 0 ? path : path.slice(0, index);
  const hash = index < 0 ? "" : path.slice(index);
  const query = String(previewQuery).replace(/^\?/, "");
  if (!query) return path;
  return `${before}${before.includes("?") ? "&" : "?"}${query}${hash}`;
}
