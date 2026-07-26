const RELEASE = "studio-production-repair-v38-20260726";
let frame = 0;

function memberView() {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")]
    .find((view) => view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === "Anggota & tim") || null;
}

function repairMemberHydration() {
  document.documentElement.dataset.studioProductionRepairV38 = RELEASE;
  const view = memberView();
  if (!view) return;
  const host = view.querySelector(".sn-members");
  if (!host || host.classList.contains("sp37-members-host")) return;
  if (view.dataset.sp37Members !== "true") return;

  delete view.dataset.sp37Members;
  view.dataset.sp38MembersRetry = "true";

  const pulse = document.createElement("span");
  pulse.hidden = true;
  pulse.dataset.sp38MembersPulse = "true";
  view.appendChild(pulse);
  pulse.remove();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(repairMemberHydration);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

repairMemberHydration();
