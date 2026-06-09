--[[
  ESOTK Companion — fills the gaps ESO Logs can't see.

  ESO Logs (the encounter log) records what happened in combat but is structurally
  blind to a chunk of the build that produced it. The single biggest gap is the
  **champion point allocation** — the log carries CP *rank* and the slotted stars as
  buffs, but never the points spent across every star. This add-on reads that (and the
  other un-logged build data) live from the official API and writes it to
  SavedVariables, which ESO Toolkit (esotk.com) ingests and renders on player cards,
  matched to the log by character + server + timestamp.

  Design notes
  - Read-only. We only read state and write our own SavedVariables. No input
    automation, no combat decisions — same ToS-safe posture as CombatMetrics/Hodor.
  - Robust to API drift. ESO bumps the API every season and renames/retires functions
    and STAT_/constants. Every capture subsystem runs inside pcall and every global
    constant is nil-guarded, so a single missing symbol degrades one field instead of
    crashing the add-on.
  - Canonical snapshot moment. GetPlayerStat returns the *live* buff-inclusive value, so
    a snapshot taken mid-fight includes group buffs and is not comparable across players.
    We snapshot on leaving combat (and on demand), which is the closest practical
    "self-buffed" baseline. The snapshot is tagged so ESOTK knows how it was taken.
]]--

local ADDON = {
  name = "ESOTKCompanion",
  schemaVersion = 1,
  season = "U50",          -- bump per ESO season; ESOTK uses this to pick the right caps/data
  maxSnapshots = 200,      -- ring buffer; oldest dropped beyond this
  snapshotMode = "combatEnd",
}

local SV  -- SavedVariables handle (ESOTKCompanionSV, account-wide)

-- ----------------------------------------------------------------------------
-- helpers
-- ----------------------------------------------------------------------------

-- Call fn(...) only if it exists; returns nil otherwise (API may rename functions).
local function call(fnName, ...)
  local fn = _G[fnName]
  if type(fn) == "function" then
    return fn(...)
  end
  return nil
end

-- Read a GetPlayerStat value only if the STAT_ constant is defined this API version.
local function stat(constName)
  local c = _G[constName]
  if c == nil then return nil end
  local opt = _G["BONUS_OPTION_DEFAULT"] or 0
  local v = call("GetPlayerStat", c, opt)
  return v
end

-- ----------------------------------------------------------------------------
-- capture subsystems (each wrapped in pcall by Snapshot())
-- ----------------------------------------------------------------------------

-- THE headline gap: full champion point allocation + slotted stars + total.
-- VERIFIED against the DynamicCP add-on source (Kyzderp/DynamicCP, src/API.lua):
--   * GetNumPointsSpentOnChampionSkill(skillId) — ONE arg (championSkillId is globally unique)
--   * GetChampionSkillName(skillId)             — ONE arg
--   * slotted stars: GetSlotBoundId(slotIndex, HOTBAR_CATEGORY_CHAMPION), slots 1..12
--     (Craft/Green = 1-4, Warfare/Blue = 5-8, Fitness/Red = 9-12 per DynamicCP OFFSETS)
-- PENDING final in-game confirmation (standard CP2.0 enumeration; DynamicCP hardcodes the
-- three trees so it couldn't cross-check these names): GetNumChampionDisciplines /
-- GetChampionDisciplineId / GetNumChampionDisciplineSkills / GetChampionSkillId. They're
-- guarded, so a wrong name yields an empty allocation (slotted + total still captured)
-- rather than an error.
local function captureChampionPoints()
  local cp = { total = call("GetUnitChampionPoints", "player"), disciplines = {}, slotted = {} }

  local numDisciplines = call("GetNumChampionDisciplines") or 0
  for di = 1, numDisciplines do
    local disciplineId = call("GetChampionDisciplineId", di)
    if disciplineId then
      local skills, spent = {}, 0
      local numSkills = call("GetNumChampionDisciplineSkills", disciplineId) or 0
      for si = 1, numSkills do
        local skillId = call("GetChampionSkillId", disciplineId, si)
        if skillId then
          local points = call("GetNumPointsSpentOnChampionSkill", skillId) -- single arg (verified)
          if points and points > 0 then
            skills[skillId] = points -- key by skillId so ESOTK can name it
            spent = spent + points
          end
        end
      end
      cp.disciplines[disciplineId] = {
        id = disciplineId,
        type = call("GetChampionDisciplineType", disciplineId),
        spent = spent, -- summed from skills (avoids an unconfirmed per-discipline call)
        skills = skills,
      }
    end
  end

  -- Slotted stars (verified): slots 1..12 via the champion hotbar category.
  local champCat = _G["HOTBAR_CATEGORY_CHAMPION"]
  if champCat ~= nil then
    for slot = 1, 12 do
      cp.slotted[slot] = call("GetSlotBoundId", slot, champCat)
    end
  end

  return cp
end

-- Final derived stats the log never carries (crit, penetration, recovery, …).
local function captureStats()
  return {
    maxMagicka      = stat("STAT_MAGICKA_MAX"),
    maxHealth       = stat("STAT_HEALTH_MAX"),
    maxStamina      = stat("STAT_STAMINA_MAX"),
    spellDamage     = stat("STAT_SPELL_POWER"),
    weaponDamage    = stat("STAT_WEAPON_POWER"),
    spellCrit       = stat("STAT_SPELL_CRITICAL"),
    weaponCrit      = stat("STAT_CRITICAL_STRIKE"),
    spellPen        = stat("STAT_SPELL_PENETRATION"),
    physicalPen     = stat("STAT_PHYSICAL_PENETRATION"),
    magickaRegen    = stat("STAT_MAGICKA_REGEN_COMBAT"),
    staminaRegen    = stat("STAT_STAMINA_REGEN_COMBAT"),
    healthRegen     = stat("STAT_HEALTH_REGEN_COMBAT"),
    physicalResist  = stat("STAT_PHYSICAL_RESIST"),
    spellResist     = stat("STAT_SPELL_RESIST"),
    critResist      = stat("STAT_CRITICAL_RESISTANCE"),
  }
end

-- Attribute point split (Magicka / Health / Stamina).
local function captureAttributes()
  local AM, AH, AS = _G["ATTRIBUTE_MAGICKA"], _G["ATTRIBUTE_HEALTH"], _G["ATTRIBUTE_STAMINA"]
  return {
    magicka = AM and call("GetAttributeSpentPoints", AM) or nil,
    health  = AH and call("GetAttributeSpentPoints", AH) or nil,
    stamina = AS and call("GetAttributeSpentPoints", AS) or nil,
  }
end

-- Long-term effects (mundus is a permanent buff; food/drink is a long buff).
-- We record raw ability IDs and let ESOTK resolve mundus/food by ID — language-agnostic.
local function captureLongTermEffects()
  local effects = {}
  local n = call("GetNumBuffs", "player") or 0
  for i = 1, n do
    local name, started, ending, _, _, _, _, _, _, _, abilityId = call("GetUnitBuffInfo", "player", i)
    if abilityId then
      effects[#effects + 1] = {
        id = abilityId,
        name = name,
        duration = (started and ending) and (ending - started) or 0, -- 0 == permanent (e.g. mundus)
      }
    end
  end
  return effects
end

-- Both action bars (front/back). Redundant with the log, but lets ESOTK derive
-- subclass skill lines without a second source, and verifies the matched actor.
local function captureBars()
  local bars = {}
  local cats = { front = _G["HOTBAR_CATEGORY_PRIMARY"], back = _G["HOTBAR_CATEGORY_BACKUP"] }
  for label, cat in pairs(cats) do
    if cat ~= nil then
      local barSlots = {}
      for slot = 3, 8 do  -- 3..7 = abilities, 8 = ultimate
        barSlots[slot] = call("GetSlotBoundId", slot, cat)
      end
      bars[label] = barSlots
    end
  end
  return bars
end

-- ----------------------------------------------------------------------------
-- snapshot
-- ----------------------------------------------------------------------------

local function tryCapture(label, fn)
  local ok, result = pcall(fn)
  if ok then return result end
  d("[ESOTK] capture '" .. label .. "' failed: " .. tostring(result))
  return nil
end

local function Snapshot(reason)
  if not SV or SV.enabled == false then return end

  local snap = {
    -- match keys (see ESOTK matcher): character + server + UTC timestamp
    ts        = call("GetTimeStamp"),               -- UNIX seconds, server/UTC
    char      = call("GetUnitName", "player"),
    account   = call("GetDisplayName"),
    server    = call("GetWorldName"),
    -- context
    zoneId    = call("GetZoneId", call("GetUnitZoneIndex", "player")),
    classId   = call("GetUnitClassId", "player"),
    raceId    = call("GetUnitRaceId", "player"),
    level     = call("GetUnitLevel", "player"),
    cpRank    = call("GetUnitChampionPoints", "player"),
    role      = call("GetGroupMemberSelectedRole", "player"),
    reason    = reason,                              -- "combatEnd" | "manual"
    -- the gaps ESO Logs can't see:
    cp        = tryCapture("championPoints", captureChampionPoints),
    stats     = tryCapture("stats", captureStats),
    attrs     = tryCapture("attributes", captureAttributes),
    effects   = tryCapture("longTermEffects", captureLongTermEffects),
    bars      = tryCapture("bars", captureBars),
  }

  local snaps = SV.snapshots
  snaps[#snaps + 1] = snap
  while #snaps > ADDON.maxSnapshots do
    table.remove(snaps, 1)  -- drop oldest
  end

  if SV.verbose then
    local pts = snap.cp and snap.cp.total or "?"
    d("[ESOTK] snapshot saved (" .. tostring(reason) .. ") — CP " .. tostring(pts)
      .. ", " .. tostring(#snaps) .. " stored. Upload SavedVariables/ESOTKCompanion.lua to esotk.com.")
  end
end

-- ----------------------------------------------------------------------------
-- events & commands
-- ----------------------------------------------------------------------------

local combatDebounce = false
local function OnCombatState(_, inCombat)
  if inCombat then return end                 -- snapshot when leaving combat
  if ADDON.snapshotMode ~= "combatEnd" then return end
  if combatDebounce then return end
  combatDebounce = true
  -- small delay so end-of-fight buffs/stats settle before reading
  zo_callLater(function()
    combatDebounce = false
    Snapshot("combatEnd")
  end, 1500)
end

local function OnAddOnLoaded(_, addonName)
  if addonName ~= ADDON.name then return end
  EVENT_MANAGER:UnregisterForEvent(ADDON.name, EVENT_ADD_ON_LOADED)

  SV = ZO_SavedVars:NewAccountWide("ESOTKCompanionSV", ADDON.schemaVersion, nil, {
    schemaVersion = ADDON.schemaVersion,
    season        = ADDON.season,
    enabled       = true,
    verbose       = true,
    snapshots     = {},
  })
  -- keep season tag current even on existing saves
  SV.schemaVersion = ADDON.schemaVersion
  SV.season = ADDON.season

  EVENT_MANAGER:RegisterForEvent(ADDON.name, EVENT_PLAYER_COMBAT_STATE, OnCombatState)

  SLASH_COMMANDS["/esotk"] = function(arg)
    arg = zo_strlower(arg or "")
    if arg == "off" then
      SV.enabled = false; d("[ESOTK] capture disabled.")
    elseif arg == "on" then
      SV.enabled = true; d("[ESOTK] capture enabled.")
    elseif arg == "clear" then
      SV.snapshots = {}; d("[ESOTK] snapshots cleared.")
    elseif arg == "verbose" then
      SV.verbose = not SV.verbose; d("[ESOTK] verbose = " .. tostring(SV.verbose))
    else
      Snapshot("manual")
      d("[ESOTK] snapshot taken. /esotk on|off|clear|verbose")
    end
  end

  d("[ESOTK] Companion loaded. Capturing champion points + build on combat end. Type /esotk to snapshot now.")
end

EVENT_MANAGER:RegisterForEvent(ADDON.name, EVENT_ADD_ON_LOADED, OnAddOnLoaded)
