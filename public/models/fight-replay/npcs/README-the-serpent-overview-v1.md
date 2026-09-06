# The Serpent overview replay prototype (v1)

This GLB is a project-authorized, fan-project prototype reconstructed from screenshots rather than
extracted from the ESO client. It is enabled only by the fight replay's `?npcModels=prototype`
preview flag. The repository owner's authorization covers its use for this prototype; this note is
not a claim that Elder Scrolls Online intellectual property is freely licensed.

- Reference page: <https://esomodelviewer.com/characters/post/169-the-serpent>
- Encounter: The Serpent, Sanctum Ophidia trial — hooded figure in red-brown armour with wide gold
  horn plates and a recessed bone/gold skull mask.
- Reference inputs: the page's clean full-body front plate (`view-01.jpg`) and back plate
  (`view-03.jpg`), both 1920x1080, subject ~990 px tall.
- Geometry: Tencent Hunyuan3D-2mv, front + back, **octree resolution 512** (552,520-face draft,
  104.6 s on an RTX 4070 Ti Super). 512 was used because the mesh is marginally cleaner than the
  380 build; it did **not** change the textured result, for the reason below.
- Accepted plates: `view-07` (torso front), `view-08` (torso back), and `view-04` (helm) —
  **hand-registered**, see below.
- **Why the helm plate had to be hand-registered.** The mask initially did not appear on the model,
  and was first misdiagnosed as a failed reconstruction. A clay render disproved that: the mask is
  fully modelled — brow, eye sockets, nose, moustache, chin — at both octree levels. The real cause is
  a correspondence failure in the projection. The horizontal coordinate is normalized by silhouette
  span per height slice, and at head height the plate row contains **disconnected opaque runs** (horn,
  gap, mask, gap, horn) while the mesh row at the same normalized height is a **single run**, because
  the reconstruction placed the horns closer in so they merge with the hood. Normalizing both to
  [0,1] maps the mesh's centre into the plate's _gap_, and nearest-opaque snapping resolves it to
  hood. Occlusion was ruled out: 97.2% of front-facing head vertices pass the depth test, better than
  the body's 83.3%.
- **How it was registered.** On the mask itself rather than the silhouette, since the silhouette is
  what broke. Bright bone/gold mask detected in both images and centroids aligned (plate 532.1,177.5
  ↔ closeup 962.4,437.0). The bbox-extent estimate disagreed between height and width (0.128 vs
  0.167, 77% agreement) because the closeup detection caught the chin and neck, so it was not
  trusted. A scale sweep from 0.115-0.165, refined to 0.126-0.146 at 8x zoom cropped to the mask, was
  judged purely on **eye-socket doubling**: 0.134-0.138 single-images the sockets, third eye and jaw,
  and outside that range they visibly double. Final: scale 0.136, row 118.07, col 401.21.
  `width_error` is recorded as `null` — there is no meaningful silhouette error for this fit, and a
  fabricated number would be worse than none.
- The gate is front-region only, so the back of the head correctly keeps the plain engraved hood.
- Prepared asset: `the-serpent-overview-v1.glb`; one mesh, one material, one draw call, 45,000
  triangles, 28,458 vertices, 1024x1024 JPEG q92 (4:4:4), 1,687,556 bytes, 315 charts — the lowest
  chart count in its batch.
- Prepared bounds: 0.8768 x 1.9938 x 0.3056 model units, minimum Y exactly 0.0, centred on X and Z.
  POSITION, NORMAL and TEXCOORD_0 only.
- Intended presentation: 32-64 px-tall replay actor; a colour/silhouette identity LOD.
- Prepared: 2026-09-06

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
