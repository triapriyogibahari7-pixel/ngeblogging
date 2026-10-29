import { checkoutTarget } from './midtrans-checkout-utils.mjs';
export function hostedCheckoutUrl(value, environment) {
  try {
    const url = new URL(checkoutTarget(value, environment));
    if (url.hash || url.search || !/^\/snap\/(?:v2\/vtweb|v4\/redirection)\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}
