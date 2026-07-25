# Locked backup — approved large-screen Studio layout

This manifest preserves the user-approved desktop, laptop, computer, Windows/macOS/Linux, tablet-landscape, and Desktop-site geometry before the mobile content/Nara v31 repair.

## Immutable recovery source

- Approved production commit: `7decc55d2bcc80f055c036c4106a3d6a0518aec4`
- Active shell CSS blob: `8066773230249c2f97a6dfcbf1f792113d830616`
- Active shell runtime blob: `54aa0c66c297b477cb716ba254fc616b1e438d01`
- Base Studio CSS blob: `15988dfbc961d99a33239cccfe7a997fc0ca8220`
- Studio component blob: `a07d728ff5d8730317f26b8a0d05573133f38749`
- Active index blob: `4b96b34a902560c38c07212f27d3924ddc42286b`

## Lock contract

The v31 repair may change only:

1. Nara widget dimensions and its internal responsive layout.
2. Compact-screen content inside Studio menu views.

It must not change:

- public landing page;
- tenant/public-site renderer;
- desktop/laptop sidebar widths;
- approved large-screen workspace header, metrics, grids, theme layout, or editor geometry.

## Recovery

Restore the listed paths from commit `7decc55d2bcc80f055c036c4106a3d6a0518aec4`, rebuild, and redeploy.
