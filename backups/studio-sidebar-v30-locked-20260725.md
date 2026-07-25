# Locked backup — Studio sidebar v30

User-approved scope: the current Studio sidebar for mobile drawer, tablet, desktop, laptop, computer, and Desktop-site mode.

This backup is intentionally documentation-only and is never loaded by `index.html`. Git already stores the exact recoverable blobs.

## Immutable recovery source

- Approved production commit: `7decc55d2bcc80f055c036c4106a3d6a0518aec4`
- Sidebar CSS: `src/studio-shell-v30.css`
  - blob SHA: `8066773230249c2f97a6dfcbf1f792113d830616`
- Sidebar/runtime JS: `src/studio-shell-v30.js`
  - blob SHA: `54aa0c66c297b477cb716ba254fc616b1e438d01`
- Studio navigation source: `src/StudioNext.jsx`
  - blob SHA: `a07d728ff5d8730317f26b8a0d05573133f38749`

## Lock contract

- Mobile drawer remains flush to the left edge.
- Closed mobile launcher remains at the upper-left.
- Drawer header remains `n.` + `Ngeblogging` + internal `X`.
- Desktop open width remains 220px.
- Desktop collapsed width remains 70px.
- The v31 patch must not target `.sn-side`, `.sn-mobile-v30-*`, or desktop sidebar geometry.

## Recovery

Restore the three files above from commit `7decc55d2bcc80f055c036c4106a3d6a0518aec4`, then rebuild and deploy. No generated screenshot is part of this backup.
