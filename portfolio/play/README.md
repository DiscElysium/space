# SPACE v0.14 browser hotfix, 2026-10-27

Restores the pre-optimization v0.14 game. Preserves the full map, gameplay rules,
browser storage, portfolio layout, Windows entry and independent Creative Edition.

The preceding PCK binary resources omitted PackedStringArray capabilities. This
disabled mining, machine ports, control targets and other capability-based systems.
The package now uses the original 46 text resource definitions, byte-for-byte.
Existing v10 belts saved without transport state recover as empty belts. Explicit
malformed transport state is still rejected; existing cargo is preserved.

The actual exported pack is tested through a browser-hosted Godot scene with real
pointer placement and actual simulation/rendering, including beam emission, ore
delivery, rotation and reconnection. Source-only testing is insufficient here.

Reproducible repair and verification: output/stellar-web-rollback-20261027.
Do not restore the withdrawn optimization manifest without exported-pack testing.
