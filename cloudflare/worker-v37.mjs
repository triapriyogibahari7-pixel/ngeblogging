import baseWorker from "./worker-v35.mjs";
import { analyticsReady, handleAnalyticsRequest } from "../server/analytics-handler.mjs";
import { handleMemberInviteRequest, memberInvitesReady } from "../server/member-invite-handler.mjs";
import { resolveSeoSite } from "../server/seo-handler.mjs";

const RELEASE = "2026.07.25-production-audit-v37";
const TRACKER_MARKER = "data-ngeblogging-analytics-v37";

function trackerScript() {
  return `<script ${TRACKER_MARKER}="true">(()=>{if(window.__ngebloggingAnalyticsV37)return;window.__ngebloggingAnalyticsV37=true;const privacy=Boolean(navigator.globalPrivacyControl)||navigator.doNotTrack==='1';const id=(store,key)=>{if(privacy)return'';try{let value=store.getItem(key);if(!value){value=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));store.setItem(key,value)}return value}catch{return''}};const visitorId=id(localStorage,'ng_anonymous_visitor_v1');const sessionId=id(sessionStorage,'ng_anonymous_session_v1');let last='';const send=()=>{const path=location.pathname+location.search;if(path===last)return;last=path;const payload=JSON.stringify({path,referrer:document.referrer,visitorId,sessionId,language:navigator.language,screenWidth:screen.width,doNotTrack:privacy});try{if(navigator.sendBeacon){navigator.sendBeacon('/api/analytics/collect',new Blob([payload],{type:'application/json'}));return}}catch{}fetch('/api/analytics/collect',{method:'POST',headers:{'content-type':'application/json'},body:payload,keepalive:true,credentials:'omit'}).catch(()=>{})};const wrap=name=>{const original=history[name];history[name]=function(){const result=original.apply(this,arguments);queueMicrotask(send);return result}};wrap('pushState');wrap('replaceState');addEventListener('popstate',send);if(document.readyState==='loading')addEventListener('DOMContentLoaded',send,{once:true});else send()})();</script>`;
}

async function injectAnalytics(request, response, env) {
  if (request.method !== "GET") return response;
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) return response;
  const url = new URL(request.url);
  const site = await resolveSeoSite(url.hostname, env);
  if (!site) return response;
  const html = await response.text();
  if (html.includes(TRACKER_MARKER)) return new Response(html, response);
  const script = trackerScript();
  const enhanced = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${script}</body>`) : `${html}${script}`;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "public, max-age=60, s-maxage=300");
  headers.set("x-ngeblogging-analytics", "v37");
  return new Response(enhanced, { status: response.status, statusText: response.statusText, headers });
}

function enrichHealth(response, env) {
  if (!response.ok) return response;
  return response.clone().json().then((payload) => {
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");
    return new Response(JSON.stringify({
      ...payload,
      release: RELEASE,
      analytics: analyticsReady(env),
      analyticsCollector: analyticsReady(env),
      memberInvites: memberInvitesReady(env),
      memberLimitPerSite: 100,
      siteLimits: { free: 12, maximum: 12 },
      independentSiteWorkspaces: true,
    }), { status: response.status, statusText: response.statusText, headers });
  }).catch(() => response);
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();

    if (url.pathname === "/api/analytics/collect") return handleAnalyticsRequest(request, env, requestId);
    if (url.pathname.startsWith("/api/member-invitations/")) return handleMemberInviteRequest(request, env, requestId);

    const response = await baseWorker.fetch(request, env, context);
    if (url.pathname === "/api/health" && request.method !== "HEAD") return enrichHealth(response, env);
    return injectAnalytics(request, response, env);
  },
};
