# SPACE v0.14 performance update — 2026-10-27

The world, original visual assets, 120 Hz physics and v0.14 tutorial/controls are retained.
The exported archetype PackedStringArray bug is fixed using explicit constructors
and text resource export. Older belts missing transport state recover empty;
existing real cargo is preserved and malformed explicit states are rejected.

CPU worksets, exact logistics dependency propagation, exact collision/navigation
caches, invisible legacy-model removal, shared shader/texture resources and static
geometry batching reduce unnecessary work. Native Forward+ uses D3D12, following
measured renderer comparison. Web retains Compatibility and its original texture
quality. Native exports retain full-resolution native scene textures.

Verified: complete native regression; 10,800 logistics, 6,000 geometry-query and
810 navigation comparisons; native release-template gameplay; actual browser export
35 checks including visible laser mining, real ore delivery, rotation/reconnection
and recovery of the earlier broken-package save; 2D/3D editor visual review.

On the test machine, uncapped foreground native voyage 78.1 -> 153.5 FPS, dense
belts 25.4 -> 79.0 FPS. The delivered native default cap remains 60 FPS.
Same-browser 2560x1440 voyage 13.0 -> 24.3 FPS; dense 392 belts 4.2 -> 9.9 FPS.
These are measured scenarios, not a guarantee of 60 FPS on every browser/device.

The static loader uses bounded read-ahead and immutable hashed parts. The full
Windows ZIP runs without a separate Godot install. It is hosted as a GitHub Release attachment to keep the Pages site small.

Independent Creative Edition dependencies and existing browser/native saves are
retained. Reproducible tools, backup, snapshots and reports are saved in
output/stellar-performance-20261027. A complete pre-change backup was verified
file by file before optimization.
