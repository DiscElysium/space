# SPACE — Orbital Workshop

Live: https://discelysium.github.io/space/portfolio/

A five-chapter game design portfolio. The original 21:9 compositions, navy/ivory/coral palette and SPACE Axis Refined typography are preserved.

## Run

Serve dist/ with any static HTTP server. No installation, build system or external runtime is needed.

    python -m http.server 8330 --directory dist

## Contents and editing

- index.template.html, style.css, app.js: editable webpage source.
- dist/index.html, dist/style.css, dist/app.js: deploy-ready copies.
- dist/content.json: English copy and Chinese companion. The English transcript is also directly in HTML for access without JavaScript.
- dist/assets/pages/: approved portfolio compositions; full versions are lossless WebP, responsive previews are separately encoded.
- dist/assets/fonts/: locally hosted SPACE Axis Refined v19 web fonts, with license.
- dist/downloads/: portfolio PDF and Chinese companion.
- prepare.py: builds the site from the local portfolio source archive. Update its SOURCE path if rebuilding elsewhere. Ordinary website edits do not require running it.

Chapter navigation, accessible native disclosure sections, English/Chinese transcripts, modal enlargement, native-resolution panning, keyboard previous/next, full screen where supported, and a PDF download are included. Reduced-motion preferences are respected. No analytics, accounts or personal data collection.

## Image provenance

The first page identifies the AI re-render derived from a gameplay capture. Other visual references and game captures retain the attribution context of the original portfolio pages. Game references are design analysis, not claims of affiliation.

The page compositions and project content belong to their respective creators. Font usage follows the bundled SIL Open Font License.
