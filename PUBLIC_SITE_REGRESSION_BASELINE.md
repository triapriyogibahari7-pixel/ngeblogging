# Public-site repair baseline

Work branch: fix/public-comments-footer-links-20261029
Base commit: b7955f80f346e541858e65dc02512b0450758b51
Scope is separate from Nara, editor payment and Add Site work.

## Comment containment stage
The shared PublicSiteNext renderer serves Post/Page through PublicSite.jsx, which imports public-layout-containment.css. The older comment patch at 3aaa22d968c84feb3e639f33ba0f6cd591fde162 is not present in current public/comments-v93.css. Restore scoped heading/footer flow and mobile comment margins in the imported renderer CSS instead of clipping the whole document. Preserve comment submission, moderation, reactions, honeypot and content.

Run: node --test tests/public-comment-boundary-contract.test.mjs
These are source-contract tests, not proof of browser geometry or live deployment.

## Remaining requested stages
- Add Powered by Ngeblogging plus Tri Apriyogi Bahari credit to the shared article footer and built-in theme-home path.
- Audit actual theme CTA links such as Jelajahi situs and their destination rendering; do not replace working custom/external links blindly.
- Verify the active theme catalog count instead of assuming every theme was tested.

## Release checklist
Measure the supplied post at mobile and desktop widths after content/comments render. Check heading/icon/form bounds, document scroll width, long text, replies and Post/Page variants. Test all enumerated built-in themes for footer/link contracts and distinguish fixtures from live pages. Confirm Nara, editor payment and Add Site files are unchanged. Record final PR, merge commit, active production version and evidence before marking complete.

Example: https://tri-apriyogi-bahari-60c48b97.ngeblogging.com/post-tanpa-judul-2fdb2fd2
Status: proposed source patch only; browser geometry, test execution, footer/link stages and deployment are not yet verified. Regression tests are safeguards, not a guarantee that future changes cannot break the layout.
