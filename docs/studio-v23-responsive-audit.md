# Studio v23 responsive authority

Studio v23 replaces the layered v21/v22/final responsive stack with one active stylesheet and one runtime controller.

## Active files

- `src/studio-responsive-v23.css`
- `src/studio-runtime-v23.js`

The historical v14/v21/v22 styles remain referenced with `media="not all"` only for compatibility audits. They do not style the live page. Historical sidebar/runtime scripts are not executed.

## Layout contract

- Mobile and installed PWA retain a 64px left icon rail.
- The single sidebar toggle sits on the rail edge and opens one overlay panel.
- Tablet retains a 72px icon rail.
- Desktop and Android Desktop-site use desktop geometry rather than mobile cards.
- Bottom navigation and duplicate mobile sheets are removed.
- `Tata Letak` remains directly after `Tema` and opens the real theme customizer.

## Nara contract

- Only the lower-right React launcher is visible.
- Header and editor Nara duplicates are hidden.
- On every physical phone, including Android Desktop-site, the Nara layer and shell fill the complete `100vw × 100dvh` viewport.
- The backdrop is removed on physical phones, so no left or right columns remain.
- Models, intelligence levels, camera, images, text files, voice, QR, long-term memory, projects, image generation, and plugins remain in the existing Nara components.

## Editor contract

- Mobile titlebar, tabs, ribbon, paper, and settings sidebar do not overlap.
- Desktop and Desktop-site use a writing column plus a 320–360px settings column.
- The writing surface stretches to the height of the settings column, removing the empty gray region below short content.

## Cache contract

- PWA runtime release: `ngeblogging-pwa-v23-20260725`
- Service worker cache: `ngeblogging-app-v23-20260725`
