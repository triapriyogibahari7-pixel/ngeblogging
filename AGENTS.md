# Repository instructions

## Frozen Post/Page editor

The owner approved the current Post/Page editor on 2026-10-23 (Asia/Jakarta). Its fixed baseline is commit `5da6573ae7d0b11c769afca65c756dd3bdafa8cb`. Read `EDITOR_BASELINE_LOCK.md` before any editor-related work.

- Do not redesign, refactor, upgrade, replace, or alter this editor unless the owner explicitly approves the specific editor change. A request to upgrade another feature is not permission to change the editor.
- Preserve both mobile and desktop editor layouts, writing surfaces, formatting/media controls, dialogs, autosave, and publication behavior.
- Shared CSS, runtime bridges, device-mode logic, dependencies, and build changes can affect the editor indirectly; review those effects before proposing changes.
- Do not move the approved baseline or mark a replacement stable without explicit owner approval.
- If a regression occurs, propose a scoped code restoration from the baseline. Do not reset or force-push main, discard unrelated upgrades, delete drafts, or restore the database as part of an editor UI rollback. Obtain approval before writing the restoration.
- Report checks actually run and their results. User-approved appearance is not proof of automated tests, a successful build, deployment, or live verification.

This instruction file is a project-policy freeze, not an enforced GitHub repository ruleset or protected branch.
