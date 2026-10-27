# SPACE browser build · v0.14.0, optimized

Play: https://discelysium.github.io/space/portfolio/play/
Windows ZIP: https://discelysium.github.io/space/portfolio/downloads/windows/

The complete map, 26 landmarks, 688 original mineral points, tutorial, building, logistics, piloting, combat, research and repair are retained. Simulation stays at 120 Hz. Browser storage and save paths are unchanged.

Static bay parts are batched without changing triangle counts or materials. The old hidden demonstration ship no longer loads; the actual editable ship still renders normally. Midground architecture is built offline. Deck instances share batches across the hull. Repeated shader reflection and texture uploads are cached. Off-screen enemy graphics are created only as needed; their simulation and state remain intact. All three rendering layers retain the original resolution and sampling settings.

Background architecture redraws on camera changes instead of continuously while stationary. Hash-addressed downloads use bounded read-ahead and browser caching. Unused historical texture variants are excluded from export; source files are preserved. Initial download is approximately 138.4 MB.

The independent creative edition still uses its previous v0.14 pack. Its manifest and chunks are deliberately retained. Do not remove old play/data objects merely because the current normal game manifest does not reference them.

Windows v0.14 is a self-contained 64-bit executable with embedded game data. Unzip the downloaded archive and run SPACE.exe. No Godot installation is needed. The archive is delivered as one ZIP; the download button verifies the content-addressed transport parts before saving it.

Local editable source and verification: output/stellar-web-optimized-20261027. Original Windows and v0.14 web sources remain preserved. Licenses are in play/licenses and in the Windows archive.
