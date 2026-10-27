# SPACE browser build · v0.14.0

Play: https://discelysium.github.io/space/portfolio/play/

The latest standalone game is exported with the official Godot 4.7.2 single-threaded WebAssembly / WebGL 2 runtime. Desktop keyboard and mouse are required; the game interface is Chinese.

Completed tutorial goals advance automatically after a short confirmation. Manual review remains on the chosen goal. Equipment details appear above the tutorial, with methods expanded through the ? button. Compact layouts prioritize mineral filters, key binding and storage slots.

The full world, 26 landmarks, 688 original mineral points, building, supply, triggers, combat and repair are retained. Browser graphics use Compatibility rendering and cached model textures capped at 1024 pixels. Open-licensed bundled Chinese fonts provide consistent text without OS font dependencies. Licenses are in play/licenses/.

Existing browser storage uses the same directory as v0.10. When no newer save exists, a valid v0.10 save is copied to the current save path; the original remains intact. Existing newer saves and backups are never replaced by this migration. Tutorial upgrades follow the native game's policy, preserving equipment and resources. Progress is local to the browser.

Initial download: 157.1 MB. Content-addressed gzip chunks restore the exact official PCK/WASM bytes; packaging validates every chunk and both full files. Ordinary static hosting requires no thread-isolation headers.

Local source: output/stellar-web-v014-20261026/game. Build helpers and verification records are retained beside it. The original Windows project is unchanged.
