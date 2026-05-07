# Demo Asset v1 — 3D Pipeline (Phase 6)

This directory holds the canonical demo asset that `DEMO_MODE=true` replays
when exercising the CAD path of the 8-agent pipeline (see `docs/tasks.md`
T-094, T-095). The pipeline expects:

```
storage/demo-assets/v1-demo/
├── README.md          # this file
├── assembly.stp       # STEP AP242 export of the assembly  (REQUIRED)
└── explode.mp4        # explode-view animation, 1080p H.264 (REQUIRED for explode-video path)
```

When both files are present the demo replays the **explode-video** branch.
When only `assembly.stp` is present the demo replays the **geometry-inferred**
fallback (the advisory banner from T-093 will appear on the output page).

## Asset specification

| Property | Required value |
|---|---|
| Subject | A 10–15-part mechanical assembly. Recommended: small geared mechanism, clamping vice, benchtop pulley, or servo gripper. |
| File format | STEP AP242 (`.stp`). AP203 is acceptable but AP242 preserves PMI. |
| Units | Millimetres. |
| Component naming | Each component must have a stable, human-readable label (e.g. `M5_Cap_Screw`, `Idler_Pulley`). The Source Adapter uses these as Part IDs. |
| Mass / material | Optional but recommended. Populating these unlocks the two-person-grip heuristic and metric-units validators. |
| Bounding box | Auto-derived by the parser; nothing to author. |

## Explode video specification

| Property | Required value |
|---|---|
| Container | MP4 (H.264, AAC). |
| Resolution | 1920×1080 minimum. |
| Frame rate | 24–30 fps. |
| Duration | 8–25 seconds. |
| Behaviour | Linear explode along the assembly axis. Each part's motion should reach a steady pose with a brief stall (≥ 6 frames) before the next part begins moving. The keyframe extractor (T-079) detects these motion-stall transitions. |

## Provenance & licensing

Author the assembly in **Fusion 360** or **FreeCAD** from scratch — do **not**
import third-party CAD without verifying the licence. When you commit the
asset, fill in the table below.

| Field | Value |
|---|---|
| Source application | _e.g. FreeCAD 1.1, Fusion 360 (Personal)_ |
| Author | _name / GitHub handle_ |
| Date authored | _YYYY-MM-DD_ |
| Licence | _CC0-1.0 / CC-BY-4.0 / MIT — must permit redistribution_ |
| Notes | _any quirks the pipeline should know about_ |

If the licence does not permit redistribution, **do not commit the file** —
add it to `.gitignore` and document the procurement steps here instead.

## Why this is committed

The repo's `.gitignore` excludes `storage/`, but `storage/demo-assets/` is
explicitly un-ignored (see the gitignore comment) so the demo asset travels
with the codebase. The pipeline outputs that this asset produces are cached
in `src/lib/demo/` (T-095) so the demo runs without any Gemini calls.

## Status

- [ ] `assembly.stp` authored and committed
- [ ] `explode.mp4` authored and committed
- [ ] Provenance table filled in above
- [ ] T-095 cached pipeline outputs regenerated against the final asset
