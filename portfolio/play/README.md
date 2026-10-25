# SPACE browser build · v0.10.0

Play: https://discelysium.github.io/space/portfolio/play/

The latest standalone Godot game is exported to WebAssembly / WebGL 2 with the official Godot 4.7.2 single-threaded runtime. Keyboard and mouse are required. The game interface is Chinese.

The full world, 26 landmarks, 688 original mineral points, empty-ship tutorial, building, supply, triggers, combat and repair rules are preserved. Graphics use the Compatibility renderer; cached model textures are capped at 1024 pixels and saved with their compressed buffers. A bundled, subsetted open-licensed font replaces OS-only Chinese font dependencies.

The original Windows project remains in output/stellar-playable-20261025/game. Its source was copied to output/stellar-web-20261025/game before browser-only adapters were added. It is not included in this website folder.

The HTML loader restores the exact exported PCK and WASM byte streams from small content-addressed gzip objects. This works on ordinary static hosting without thread-isolation headers or a custom server. All restored bytes are SHA-256 checked during packaging.

First download: 157.0 MB. A progress indicator is shown. Game progress uses browser-local persistent storage.

Build helpers are retained in the local output/stellar-web-20261025/tools directory. Licenses are in play/licenses.
