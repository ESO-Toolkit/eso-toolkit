# Fight replay NPC asset manifest

The durable record of every reconstructed fight-replay actor asset: what shipped, where it came
from, what it costs at runtime, and what is still outstanding. Update this file in the same commit
as any change to `src/features/fight_replay/utils/replayActorModelRegistry.ts`.

Read alongside the [actor model pipeline](./fight-replay-actor-model-pipeline.md) and the
[GPU queue log](./fight-replay-npc-gpu-queue-log.md).

## Licensing posture

Every asset below is a **project-authorized fan reconstruction built from published reference
screenshots**, not geometry extracted from the ESO client. The Elder Scrolls Online name, character
designs, and related rights remain with ZeniMax Media / Bethesda Softworks. These assets are not
CC0 and are not officially licensed; they ship behind the `?npcModels=prototype` opt-in while a
rights review is pending. The one exception is the player figure, which is genuinely CC0.

Do not reuse any reconstructed asset outside this project without a separate rights review.

## Shipped assets

| Asset                                | Actor              | Renderer                  |   Tris |  Verts | Materials | Texture     | GLB bytes | Reference                                                                   |
| ------------------------------------ | ------------------ | ------------------------- | -----: | -----: | --------: | ----------- | --------: | --------------------------------------------------------------------------- |
| `coolstickman-walk.glb`              | all players        | `instanced-pose-flipbook` |      — |      — |         1 | —           |         — | CC0, Polygonal Mind                                                         |
| `yandir-the-butcher-overview-v2.glb` | Yandir the Butcher | `static-boss`             | 45,000 | 29,609 |         1 | 1024px JPEG | 1,644,896 | [post 82](https://esomodelviewer.com/characters/post/82-yandir-the-butcher) |
| `captain-vrol-overview-v2.glb`       | Captain Vrol       | `static-boss`             | 44,999 | 28,796 |         1 | 1024px JPEG | 1,679,644 | [post 83](https://esomodelviewer.com/characters/post/83-captain-vrol)       |

### Runtime budgets

- Lesser enemies: 5,000–12,000 triangles.
- Standard bosses: 20,000–50,000 triangles.
- Hero-boss exception (one at a time, documented): up to 100,000 triangles.
- One mesh, one material, one draw call per asset. No skins, animations, or morph targets.
- Texture 512px by default; 1024px where the reference plates support it (a boss with registered
  closeup captures). Store as JPEG when the equivalent PNG would exceed the size gate — a 1024px
  JPEG carries more real detail than a 512px PNG at comparable bytes. Encode at q92 with chroma
  subsampling **disabled** — these atlases carry identity as flat colour blocks and 4:2:0 smears
  exactly those boundaries. Verify the written quality by reading the JPEG quantization table back
  out of the GLB; an export asking for a quality does not guarantee it honoured one. No Draco or
  meshopt — the browser runtime registers no `DRACOLoader`.
- Colour must be projected into the UV atlas at texel resolution. Baking from vertex colours caps
  detail at the vertex count and produces a visibly smeared surface.
- Weight UV allocation towards the face. A default unwrap spends texels in proportion to 3D surface
  area, which gave the face only ~103x103 texels (about 1% of the atlas) — the single biggest cause
  of a "pixelated, blurry" face, and unfixable by any amount of sharpening or higher JPEG quality.
  Unwrap from a density-warped copy of the mesh (head enlarged) and apply the resulting UVs to the
  untouched original, so geometry is unchanged. Scale about the vertical axis, not the model centre,
  or the neck ramp turns into slivers. Make any tone statistic **area-weighted**, otherwise
  re-allocating UV space silently shifts the exposure correction.
- Asset URLs must be joined to the app base (`resolveReplayModelUrl`). A bare catalog path resolves
  against the current route, and the replay is always nested, so it 404s and falls back to the
  capsule — a silent failure that looks exactly like "this boss has no model".
- Register closeup reference plates and project them onto the region they cover. The head especially:
  in a full-body plate the head is only ~60 px, so without a helm closeup the face reads as a smear,
  and the face is the identity anchor. Match closeups on the **region band** (head rows only for a
  helm plate), not the whole silhouette — whole-body matching is dominated by the torso and will
  mis-lock a helm plate onto the chest. Confirm every registration with a 50% overlay before use, and
  reject rather than force any that cannot be verified.
- glTF `+Y` up, facing `+Z`. The renderer re-grounds from the mesh bounding box every frame, so a
  non-grounded export is tolerated, but exporting feet at `y=0` is still preferred.

## Coverage status — Kyne's Aegis

Names below are verified against `src/types/trial-encounters.ts` (the curated encounter table).

| Encounter                  | Name               | Status                                                         |
| -------------------------- | ------------------ | -------------------------------------------------------------- |
| `boss_1`                   | Yandir the Butcher | **Shipped**                                                    |
| `boss_2`                   | Captain Vrol       | **Shipped**                                                    |
| `boss_3`                   | Lord Falgravn      | **Blocked** — no adequate reference imagery exists (see below) |
| `trash_half_giant_bulwark` | Half-Giant Bulwark | Deferred — ordinary humanoid, no bespoke model needed          |
| `trash_half_giant_raider`  | Half-Giant Raider  | Deferred — ordinary humanoid, no bespoke model needed          |
| `trash_vampire_infuser`    | Vampire Infuser    | Deferred — ordinary humanoid, no bespoke model needed          |
| `trash_crimson_knight`     | Crimson Knight     | Blocked on renderer — Bloodknight family recolor               |
| `trash_bitter_knight`      | Bitter Knight      | Blocked on renderer + unverified tint                          |
| `trash_blood_knight`       | Blood Knight       | Blocked on renderer — references secured                       |

### Lord Falgravn blocker

esomodelviewer.com has no Falgravn page; he is only named in prose on the Vrol page. The only
located imagery is a single 809x809 in-game action screenshot
(`https://images.uesp.net/a/a5/ON-npc-Lord_Falgravn.jpg`) — one angle, non-studio lighting, no back
or side. That is not adequate input for multiview reconstruction, and generating a model from it
would produce exactly the fragmented, single-angle-flattering result the acceptance gate rejects.

**Single next action:** the repository owner captures front / back / side studio-style screenshots
of Lord Falgravn in-game, or requests that esomodelviewer add him. `creatures/post/32-vampire-lord`
(`VampireLord_C_Basic`) is a possible proxy for his vampire-lord phase silhouette only, and would
need its own provenance note.

### Lesser enemies — findings and the blocker

Reference research corrected two premises worth recording.

**The three knights are one creature, not three.** UESP gives Blood Knight, Crimson Knight, and
Bitter Knight all the same Species: **Bloodknight**, all located in Kyne's Aegis, and esomodelviewer
publishes exactly one Bloodknight mesh (`VampireLord_B_Basic`,
[creature post 33](https://esomodelviewer.com/creatures/post/33-bloodknight), 34.7k triangles). Ten
plates were downloaded at 1024x576 to `B:/CodexScratch/eso-fight-replay-3d/bloodknight-references/`
(the page emits 800px `_c` Flickr URLs; substituting `_b` yields 1024px, while `_h`/`_k` return 410).
Despite the `VampireLord` mesh-family name this is **not** a winged vampire lord — it is a bipedal,
wingless, human-proportioned armored humanoid. Its listed `3.55 x 4.46 m` is simply a larger export
unit; the arm-span-to-height ratio of 0.80 is an ordinary A-posed biped. So the correct plan is one
shared reconstruction plus per-variant recolors, not three separate models.

**The Half-Giants and the Vampire Infuser are ordinary humanoids.** UESP lists the Half-Giants as
Sea Giant / **Nord** and the Vampire Infuser as **Nord**; in-game screenshots show human-sized
figures on the standard character rig (Bulwark: mace and round shield; Raider: spiked helm and
greatsword; Infuser: a robed caster). They do not warrant bespoke reconstructions.

**The blocker is the renderer, not the references.** `InstancedReplayFigures3D` drives exactly one
non-instanced `<primitive>` per fight (`bossMeshRef`), and the resolver deliberately takes only the
**first** matching actor. That is correct for a single boss, but Kyne's Aegis trash spawns in packs —
two Half-Giant Raiders, multiple knights. Shipping a Bloodknight asset today would give a mesh to one
knight and leave its identical siblings as capsules, which reads as a bug rather than a feature.

**Single next action for lesser enemies:** extend the static-model path to render N actors from one
shared geometry — an `InstancedMesh` keyed by asset id, with a per-instance tint so the Bloodknight
base can serve Blood, Crimson, and Bitter variants from one draw call. Only then is generating the
asset worthwhile. Bitter Knight additionally needs a colour reference: UESP has no image for it, so
its tint is currently unverified and must not be guessed.

## Unknown actors

Any actor the registry does not recognise by exact normalized name keeps the capsule marker. That
is deliberate: in a tactical replay a wrong body is more misleading than an abstract one, so the
registry never substitutes a lookalike mesh or partial-matches a name.
