/**
 * Scribing ability ids whose game icon is a verified `ability_grimoire_*` skill
 * icon. Generated from data/scribing-complete.json + data/abilities.json: a
 * grimoire+focus name transformation can list several matched ability ids
 * (matchCount > 1), some of which are unrelated abilities (e.g. a generic
 * death-recap icon). The engine only surfaces an ability id that appears here,
 * so a scribed skill never reports an arbitrary, unverified id.
 *
 * Regenerate when scribing-complete.json changes: collect every grimoire base
 * id + transformation ability id whose abilities.json icon starts with
 * "ability_grimoire_".
 */
export const VERIFIED_SCRIBING_ABILITY_IDS: ReadonlySet<number> = new Set([
  214960, 214974, 214978, 215731, 216674, 216802, 216805, 216813, 216973, 217068, 217071, 217072,
  217178, 217179, 217181, 217182, 217184, 217228, 217231, 217232, 217233, 217236, 217257, 217276,
  217280, 217283, 217285, 217288, 217294, 217340, 217346, 217347, 217359, 217459, 217460, 217462,
  217465, 217473, 217528, 217605, 217607, 217608, 217609, 217610, 217611, 217613, 217630, 217631,
  217632, 217633, 217634, 217637, 217639, 217640, 217641, 217642, 217663, 217679, 217682, 217683,
  217684, 217685, 217699, 217704, 217705, 217706, 217777, 217784, 217808, 217820, 217872, 217978,
  217979, 219705, 219780, 219972, 220531, 220541, 220542, 220543, 220544, 220545, 220549, 220747,
  221354, 221930, 221999, 222285, 222313, 222678, 222966, 223065, 223292, 227003, 227004, 227007,
  227008, 227009, 227609, 229600, 229656, 232112, 240148, 240149, 240150, 243686,
]);
