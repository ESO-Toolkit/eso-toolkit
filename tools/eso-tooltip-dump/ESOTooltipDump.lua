-- ESOTooltipDump
-- Iterates every skill line / ability / morph / rank and every gear set, recording the
-- game's own tooltip strings, stat values, and structural relationships to SavedVariables.
-- Output is consumed offline by scripts/parse-tooltip-dump.mjs.
--
-- Usage in-game:
--   /dumptooltips         run the full dump (skills + sets), then /reloadui to flush to disk
--   /dumptooltips skills  dump skills only
--   /dumptooltips sets    dump sets only
--   /dumptooltips state   print the current reference-state stat snapshot (no dump)
--
-- The dump records a snapshot of the player's derived stats so the numbers are traceable
-- to the exact character state they were produced at. Run at a consistent reference state
-- (documented in the project runbook) for stable cross-patch output.

local ADDON_NAME = "ESOTooltipDump"
local DUMP_FORMAT_VERSION = 1
local CASTER = "player"

-- Per-frame work budget for the chunked iterators (ms). Kept small so a full run never
-- trips the addon watchdog; the dump simply spreads across several frames.
local FRAME_BUDGET_MS = 12

-- ---------------------------------------------------------------------------
-- Stat snapshot (records what build the numbers were produced at)
-- ---------------------------------------------------------------------------

local STAT_FIELDS = {
  magickaMax     = STAT_MAGICKA_MAX,
  staminaMax     = STAT_STAMINA_MAX,
  healthMax      = STAT_HEALTH_MAX,
  spellPower     = STAT_SPELL_POWER,
  weaponPower    = STAT_POWER,
  spellCrit      = STAT_SPELL_CRITICAL,
  weaponCrit     = STAT_CRITICAL_STRIKE,
  spellPen       = STAT_SPELL_PENETRATION,
  physicalPen    = STAT_PHYSICAL_PENETRATION,
}

local function captureStatSnapshot()
  local snap = {}
  for key, statConst in pairs(STAT_FIELDS) do
    if statConst ~= nil then
      snap[key] = GetPlayerStat(statConst, STAT_BONUS_OPTION_APPLY_BONUS)
    end
  end
  snap.championPoints = GetUnitChampionPoints and GetUnitChampionPoints("player") or nil
  snap.level = GetUnitLevel and GetUnitLevel("player") or nil
  snap.race = GetUnitRace and GetUnitRace("player") or nil
  snap.class = GetUnitClass and GetUnitClass("player") or nil
  -- Active Mundus / equipped-piece count can shift numbers; record count of equipped items.
  local equipped = 0
  if GetBagSize and BAG_WORN then
    for slot = 0, GetBagSize(BAG_WORN) - 1 do
      if GetItemLink and GetItemLink(BAG_WORN, slot) ~= "" then
        equipped = equipped + 1
      end
    end
  end
  snap.equippedItemCount = equipped
  return snap
end

-- ---------------------------------------------------------------------------
-- Ability stat chips (cost / duration / target / range / radius / roles)
-- ---------------------------------------------------------------------------

local function captureAbilityStats(abilityId, overrideRank)
  local stats = {}

  -- Resource cost: iterate the ability's actual mechanic flags rather than guessing the
  -- resource list (GetNextAbilityMechanicFlag is the robust path at current API).
  if GetAbilityCost and GetNextAbilityMechanicFlag then
    local costs = {}
    local flag = GetNextAbilityMechanicFlag(abilityId, _G.MECHANIC_FLAGS_NONE or 0)
    local guard = 0
    while flag and flag ~= 0 and guard < 16 do
      local ok, cost = pcall(GetAbilityCost, abilityId, flag, overrideRank, CASTER)
      if ok and cost and cost > 0 then
        costs[tostring(flag)] = cost          -- flag id; mapped to resource name offline
      end
      flag = GetNextAbilityMechanicFlag(abilityId, flag)
      guard = guard + 1
    end
    if next(costs) ~= nil then stats.costs = costs end
  end

  if GetAbilityDuration then
    local ok, durationMs = pcall(GetAbilityDuration, abilityId, overrideRank, CASTER)
    if ok and durationMs and durationMs > 0 then stats.durationMs = durationMs end
  end

  if GetAbilityCastInfo then
    local ok, channeled, durationValue = pcall(GetAbilityCastInfo, abilityId, overrideRank, CASTER)
    if ok then
      stats.channeled = channeled
      if durationValue and durationValue > 0 then stats.castDurationMs = durationValue end
    end
  end

  if GetAbilityTargetDescription then
    local ok, target = pcall(GetAbilityTargetDescription, abilityId, overrideRank, CASTER)
    if ok and target and target ~= "" then stats.target = target end
  end

  if GetAbilityRange then
    local ok, minR, maxR = pcall(GetAbilityRange, abilityId, overrideRank, CASTER)
    if ok and maxR and maxR > 0 then stats.minRangeCM, stats.maxRangeCM = minR, maxR end
  end

  if GetAbilityRadius then
    local ok, radius = pcall(GetAbilityRadius, abilityId, overrideRank, CASTER)
    if ok and radius and radius > 0 then stats.radiusCM = radius end
  end

  if GetAbilityRoles then
    local ok, tank, healer, dmg = pcall(GetAbilityRoles, abilityId)
    if ok then stats.roles = { tank = tank, healer = healer, damage = dmg } end
  end

  return stats
end

local function captureAbility(abilityId, overrideRank)
  if not abilityId or abilityId == 0 then return nil end
  local entry = { id = abilityId }
  if overrideRank then entry.rank = overrideRank end

  if GetAbilityName then
    local ok, name = pcall(GetAbilityName, abilityId, CASTER)
    if ok then entry.name = name end
  end
  if GetAbilityDescription then
    local ok, desc = pcall(GetAbilityDescription, abilityId, overrideRank, CASTER)
    if ok then entry.description = desc end       -- raw, markup intact (stripped offline)
  end
  if GetAbilityDescriptionHeader then
    local ok, header = pcall(GetAbilityDescriptionHeader, abilityId, CASTER)
    if ok and header and header ~= "" then entry.descriptionHeader = header end
  end
  if GetAbilityIcon then
    local ok, icon = pcall(GetAbilityIcon, abilityId)
    if ok and icon and icon ~= "" then entry.icon = icon end
  end

  entry.stats = captureAbilityStats(abilityId, overrideRank)
  return entry
end

-- ---------------------------------------------------------------------------
-- Skill-tree walk: every skillType -> line -> ability, full morph x rank tree
-- ---------------------------------------------------------------------------

-- Builds a flat list of "work units" first, then drains it across frames so we never
-- block the game thread for the whole walk.
local function buildSkillWorkList()
  local work = {}
  local numTypes = GetNumSkillTypes()
  for skillType = 1, numTypes do
    local numLines = GetNumSkillLines(skillType)
    for lineIndex = 1, numLines do
      local lineName, _, _, lineId
      if GetSkillLineInfo then lineName = GetSkillLineInfo(skillType, lineIndex) end
      if GetSkillLineId then lineId = GetSkillLineId(skillType, lineIndex) end
      local numAbilities = GetNumSkillAbilities(skillType, lineIndex)
      for abilityIndex = 1, numAbilities do
        work[#work + 1] = {
          skillType = skillType,
          lineIndex = lineIndex,
          abilityIndex = abilityIndex,
          lineName = lineName,
          lineId = lineId,
        }
      end
    end
  end
  return work
end

-- For one skill slot, enumerate base (morph 0) + both morphs (1,2) across ranks 1-4.
-- This is character-INDEPENDENT: it reads the whole tree regardless of what's unlocked.
local function captureSkillSlot(unit)
  local slot = {
    skillType = unit.skillType,
    lineId = unit.lineId,
    lineName = unit.lineName,
    abilityIndex = unit.abilityIndex,
    morphs = {},
  }

  -- Slot-level info (passive/ultimate flags, progressionIndex) from the base entry.
  if GetSkillAbilityInfo then
    local ok, name, _, earnedRank, passive, ultimate, purchased, progressionIndex =
      pcall(GetSkillAbilityInfo, unit.skillType, unit.lineIndex, unit.abilityIndex)
    if ok then
      slot.name = name
      slot.passive = passive
      slot.ultimate = ultimate
      slot.progressionIndex = progressionIndex
    end
  end

  -- morphChoice 0 = base, 1/2 = morphs; rank 1-4. Passives have no morphs (only morph 0).
  local maxMorph = slot.passive and 0 or 2
  for morphChoice = 0, maxMorph do
    for rank = 1, 4 do
      if GetSpecificSkillAbilityInfo then
        local ok, abilityId, rankNeeded, levelNeeded =
          pcall(GetSpecificSkillAbilityInfo, unit.skillType, unit.lineIndex,
                unit.abilityIndex, morphChoice, rank)
        if ok and abilityId and abilityId ~= 0 then
          local ability = captureAbility(abilityId, rank)
          if ability then
            ability.morphChoice = morphChoice
            ability.skillRankNeeded = rankNeeded
            ability.characterLevelNeeded = levelNeeded
            slot.morphs[#slot.morphs + 1] = ability
          end
        end
      end
    end
  end

  return slot
end

-- ---------------------------------------------------------------------------
-- Gear sets: enumerate all set ids, capture each bonus tier (build-independent)
-- ---------------------------------------------------------------------------

local function getAllSetIds()
  -- Prefer LibSets' curated list when available.
  if LibSets and LibSets.GetAllSetIds then
    local ok, ids = pcall(LibSets.GetAllSetIds)
    if ok and type(ids) == "table" and next(ids) ~= nil then
      local list = {}
      for setId in pairs(ids) do list[#list + 1] = setId end
      return list, "LibSets"
    end
  end
  -- Fallback: numeric scan. GetItemSetInfo(setId) returns hasSet=false for gaps.
  local list = {}
  for setId = 1, 1000 do
    if GetItemSetInfo then
      local ok, hasSet = pcall(GetItemSetInfo, setId)
      if ok and hasSet then list[#list + 1] = setId end
    end
  end
  return list, "scan"
end

-- Build a reference (gold/CP160) itemLink for a set so bonus text comes back with
-- computed numbers via GetItemLinkSetBonusInfo. Uses LibSets' own API:
--   LibSets.GetSetItemId(setId) -> a representative itemId for the set
--   LibSets.buildItemLink(itemId, qualitySubType) -> the itemLink
-- Returns nil if LibSets is absent; captureSet then falls back to the setId form.
-- NOTE: at the current client the setId form (GetItemSetBonusInfo) already returns
-- resolved values, so the fallback is not lossy — the itemLink path is preferred only
-- as a hardening against future API changes.
local function buildReferenceItemLink(setId)
  if not LibSets then return nil end
  -- Prefer the singular GetSetItemId; fall back to the plural table form.
  local itemId
  if LibSets.GetSetItemId then
    local ok, id = pcall(LibSets.GetSetItemId, setId)
    if ok then itemId = id end
  end
  if not itemId and LibSets.GetSetItemIds then
    local ok, itemIds = pcall(LibSets.GetSetItemIds, setId)
    if ok and type(itemIds) == "table" then itemId = next(itemIds) end
  end
  if not itemId then return nil end
  -- Pass Legendary (gold) quality subtype 370 so the reference link yields CP160 gold
  -- set-bonus values; LibSets.buildItemLink otherwise defaults to Normal (366).
  if LibSets.buildItemLink then
    local LEGENDARY_QUALITY_SUBTYPE = 370
    local ok, link = pcall(LibSets.buildItemLink, itemId, LEGENDARY_QUALITY_SUBTYPE)
    if ok and link and link ~= "" then return link end
  end
  return nil
end

local function captureSet(setId)
  if not GetItemSetInfo then return nil end
  local ok, hasSet, setName, numBonuses, _, _, maxEquipped = pcall(GetItemSetInfo, setId)
  if not ok or not hasSet then return nil end
  local entry = { id = setId, name = setName, maxEquipped = maxEquipped, bonuses = {} }

  local link = buildReferenceItemLink(setId)

  if numBonuses and numBonuses > 0 then
    for i = 1, numBonuses do
      local numRequired, bonusDescription, isPerfected
      -- Preferred: itemLink form with equipped=false → computed, build-independent numbers.
      if link and GetItemLinkSetBonusInfo then
        local bok, n, desc, perf = pcall(GetItemLinkSetBonusInfo, link, false, i)
        if bok then numRequired, bonusDescription, isPerfected = n, desc, perf end
      end
      -- Fallback: setId form (templates) — kept so the set is never dropped entirely.
      if (not bonusDescription or bonusDescription == "") and GetItemSetBonusInfo then
        local bok, n, desc, perf = pcall(GetItemSetBonusInfo, setId, i)
        if bok then numRequired, bonusDescription, isPerfected = n, desc, perf end
        entry.usedTemplateFallback = true
      end
      if bonusDescription and bonusDescription ~= "" then
        entry.bonuses[#entry.bonuses + 1] = {
          numRequired = numRequired,
          description = bonusDescription,    -- raw, markup intact (stripped offline)
          perfected = isPerfected,
        }
      end
    end
  end
  return entry
end

-- ---------------------------------------------------------------------------
-- Chunked runner: drains a work list across frames within FRAME_BUDGET_MS
-- ---------------------------------------------------------------------------

local function runChunked(label, workList, perItemFn, onDone)
  local i = 1
  local total = #workList
  local results = {}
  local frame = 0

  local function step()
    frame = frame + 1
    local startMs = GetGameTimeMilliseconds()
    while i <= total do
      local item = workList[i]
      local ok, res = pcall(perItemFn, item)
      if ok and res ~= nil then results[#results + 1] = res end
      i = i + 1
      if GetGameTimeMilliseconds() - startMs >= FRAME_BUDGET_MS then break end
    end
    if i <= total then
      if (frame % 10) == 0 then
        d(string.format("[%s] %s: %d / %d", ADDON_NAME, label, i - 1, total))
      end
      zo_callLater(step, 0)
    else
      d(string.format("[%s] %s: done (%d items)", ADDON_NAME, label, #results))
      onDone(results)
    end
  end

  d(string.format("[%s] %s: starting (%d items)...", ADDON_NAME, label, total))
  zo_callLater(step, 0)
end

-- ---------------------------------------------------------------------------
-- Top-level dump orchestration
-- ---------------------------------------------------------------------------

local function dumpSkills(onDone)
  local work = buildSkillWorkList()
  runChunked("skills", work, captureSkillSlot, function(slots)
    ESOTooltipDumpSV.skills = slots
    ESOTooltipDumpSV.skillCount = #slots
    -- Health metrics: count abilities that actually came back with a non-empty description.
    local abilities, withDesc = 0, 0
    for _, slot in ipairs(slots) do
      for _, ab in ipairs(slot.morphs or {}) do
        abilities = abilities + 1
        if ab.description and ab.description ~= "" then withDesc = withDesc + 1 end
      end
    end
    ESOTooltipDumpSV.abilityCount = abilities
    ESOTooltipDumpSV.abilityWithDescriptionCount = withDesc
    d(string.format("[%s] skills: %d slots, %d abilities, %d WITH description text.",
      ADDON_NAME, #slots, abilities, withDesc))
    if withDesc == 0 and abilities > 0 then
      d(string.format("|cff0000[%s] WARNING: 0 abilities have description text — dump is EMPTY. Do NOT use.|r", ADDON_NAME))
    end
    if onDone then onDone() end
  end)
end

local function dumpSets(onDone)
  local ids, source = getAllSetIds()
  ESOTooltipDumpSV.setIdSource = source
  runChunked("sets", ids, captureSet, function(sets)
    ESOTooltipDumpSV.sets = sets
    ESOTooltipDumpSV.setCount = #sets
    -- Health metrics: sets with >=1 bonus, and how many fell back to templates.
    local withBonus, templateFallback = 0, 0
    for _, s in ipairs(sets) do
      if s.bonuses and #s.bonuses > 0 then withBonus = withBonus + 1 end
      if s.usedTemplateFallback then templateFallback = templateFallback + 1 end
    end
    ESOTooltipDumpSV.setWithBonusCount = withBonus
    ESOTooltipDumpSV.setTemplateFallbackCount = templateFallback
    d(string.format("[%s] sets: %d total, %d WITH bonus text (source: %s).",
      ADDON_NAME, #sets, withBonus, tostring(source)))
    if templateFallback > 0 then
      d(string.format("|cffaa00[%s] NOTE: %d sets used the TEMPLATE fallback (may show <<n>> tokens). Check itemLink path.|r",
        ADDON_NAME, templateFallback))
    end
    if withBonus == 0 and #sets > 0 then
      d(string.format("|cff0000[%s] WARNING: 0 sets have bonus text — dump is EMPTY. Do NOT use.|r", ADDON_NAME))
    end
    if onDone then onDone() end
  end)
end

local function initDumpHeader()
  ESOTooltipDumpSV = ESOTooltipDumpSV or {}
  ESOTooltipDumpSV.formatVersion = DUMP_FORMAT_VERSION
  ESOTooltipDumpSV.apiVersion = GetAPIVersion and GetAPIVersion() or nil
  ESOTooltipDumpSV.gameTimeMs = GetGameTimeMilliseconds()
  ESOTooltipDumpSV.statSnapshot = captureStatSnapshot()
end

local function handleSlash(args)
  args = (args or ""):lower():gsub("^%s+", ""):gsub("%s+$", "")

  if args == "state" then
    local s = captureStatSnapshot()
    d(string.format("[%s] Reference state: lvl=%s CP=%s equipped=%s | MagMax=%s StaMax=%s SpellDmg=%s WpnDmg=%s",
      ADDON_NAME, tostring(s.level), tostring(s.championPoints), tostring(s.equippedItemCount),
      tostring(s.magickaMax), tostring(s.staminaMax), tostring(s.spellPower), tostring(s.weaponPower)))
    return
  end

  initDumpHeader()
  d(string.format("[%s] API %s. Dumping... do NOT change gear/CP until '/reloadui' to flush.",
    ADDON_NAME, tostring(ESOTooltipDumpSV.apiVersion)))

  if args == "skills" then
    dumpSkills(function()
      d(string.format("[%s] Skills complete. Run /reloadui to write the file.", ADDON_NAME))
    end)
  elseif args == "sets" then
    dumpSets(function()
      d(string.format("[%s] Sets complete. Run /reloadui to write the file.", ADDON_NAME))
    end)
  else
    -- Full dump: skills, then sets.
    dumpSkills(function()
      dumpSets(function()
        d(string.format("[%s] FULL dump complete (%d skills, %d sets). Run /reloadui to write the file.",
          ADDON_NAME, ESOTooltipDumpSV.skillCount or 0, ESOTooltipDumpSV.setCount or 0))
      end)
    end)
  end
end

local function onAddOnLoaded(_, name)
  if name ~= ADDON_NAME then return end
  EVENT_MANAGER:UnregisterForEvent(ADDON_NAME, EVENT_ADD_ON_LOADED)
  ESOTooltipDumpSV = ESOTooltipDumpSV or {}
  SLASH_COMMANDS["/dumptooltips"] = handleSlash
  d(string.format("[%s] loaded. Set your reference state, then run /dumptooltips (or /dumptooltips state to preview).", ADDON_NAME))
end

EVENT_MANAGER:RegisterForEvent(ADDON_NAME, EVENT_ADD_ON_LOADED, onAddOnLoaded)
