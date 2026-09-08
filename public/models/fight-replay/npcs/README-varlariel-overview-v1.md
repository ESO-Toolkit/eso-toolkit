# Varlariel overview replay prototype (v1)

This GLB is a project-authorized, fan-project prototype reconstructed from screenshots rather than
extracted from the ESO client. It renders in the fight replay by default (barebones
quality keeps every actor on the capsule). The repository owner's authorization covers its use for
this prototype; this note is
not a claim that Elder Scrolls Online intellectual property is freely licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/74-wispmother-light>
- Encounter: Varlariel, Aetherian Archive trial. The reference is the generic Wispmother (Light)
  model, which is the creature this encounter uses.
- Reference inputs: `view-01` (front, subject 990 px tall) and `view-03` (back, 998 px), both
  1920x1080. **The plates are an action pose, not a relaxed A-pose** — arms outstretched
  horizontally, mouth open — so the silhouette is very wide at arm height. `view-02` is a 3/4 action
  pose and was not used.
- Geometry: Tencent Hunyuan3D-2mv, front + back, 460,728-face draft in 68.4 s on an RTX 4070 Ti Super.
- **First automatic head registration this project has accepted.** `view-04` fitted at **1.91%**
  width error and verified on the overlay. It only succeeded because of the seed-window fix: the
  build reported that the old seeded window `[1.197, 2.670]` would have returned 55.71%, because the
  true scale of 0.265 fell outside it. Every earlier model needed either a hand-registered head plate
  or none at all.
- Accepted plates: `view-04` (head front, 1.91%), `view-08` (torso back, 6.74%), `view-09` (skirt
  front, 1.29%).
- Rejected on the overlay: `view-07` torso front (17.65%, chest and arms doubled and shifted
  up-left), `view-10` skirt back (8.07%, hem ghosting), `view-06` head back (10.44%, grossly
  oversized), `view-02` and `view-05` (wrong axis). Note the asymmetry — torso _back_ passed while
  torso _front_ failed, and skirt _front_ passed while skirt _back_ failed. `view-09` is a leg-class
  plate carrying the standing misregistration caveat; it was inspected and genuinely passes, which is
  what that caveat is for: inspect, not reject.
- Colour: projected directly into the UV atlas at texel resolution, with chart-local grazing fill
  (34.8% of covered texels), area-weighted tone match and masked unsharp.
- Prepared asset: `varlariel-overview-v1.glb`; one mesh, one material, one draw call, 45,000
  triangles, 30,450 vertices, 1024x1024 JPEG q92 (4:4:4), 1,702,168 bytes, 804 charts, 67.4%
  coverage, region texels 65,783 (~256²), head 22.4% of atlas.
- Prepared bounds: 1.3301 x 1.9815 x 0.9957 model units, minimum Y exactly 0.0, centred on X and Z.
  POSITION, NORMAL and TEXCOORD_0 only — no skin, animation, morph target or glTF extension.
- The head is the second strongest in the project after The Mage: screaming face, white glowing eyes,
  gaunt brow, teeth, hood and hair all legible.
- Known limitation: some horizontal streaking from the grazing fill, the normal two-view signature on
  surfaces neither camera observes squarely.
- Intended presentation: 32-64 px-tall replay actor; a colour/silhouette identity LOD.
- Prepared: 2026-09-06

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
