-- ESOTooltipDump
-- Iterates every skill line / ability / morph / rank and every gear set, recording the
-- game's own tooltip strings, stat values, and structural relationships to SavedVariables.
-- Output is consumed offline by scripts/parse-tooltip-dump.mjs.
--
-- Usage in-game:
--   /dumptooltips         run the full dump (skills + sets), then /reloadui to flush to disk
--   /dumptooltips skills  dump skills only
--   /dumptooltips sets    dump sets only
--   /dumptooltips ids     ID-driven pass only (scribing + enum ids, from CaptureIds.lua)
--   /dumptooltips allids  exhaustive ability-id scan (slow, catches combat/proc/NPC ids)
--   /dumptooltips state   print the current reference-state stat snapshot (no dump)
--   /dumptooltips probe   test whether locked (e.g. scribing) abilities return text (no dump)

-- The dump records a snapshot of the player's derived stats so the numbers are traceable
-- to the exact character state they were produced at. Run at a consistent reference state
-- (documented in the project runbook) for stable cross-patch output.

local ADDON_NAME = "ESOTooltipDump"
local ADDON_VERSION = "1.1.2"
local DUMP_FORMAT_VERSION = 3
local CASTER = "player"

-- Exhaustive ability-id scan bounds. The current data already contains ids above 243k;
-- 300k leaves room for new patch content while still being practical with chunking.
local ABILITY_ID_SCAN_MIN = 1
local ABILITY_ID_SCAN_MAX = 300000
local SET_ID_SCAN_MAX = 3000

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
  if GetAbilityEffectDescription then
    local ok, effectDesc = pcall(GetAbilityEffectDescription, abilityId, overrideRank, CASTER)
    if ok and effectDesc and effectDesc ~= "" then entry.effectDescription = effectDesc end
  end
  if GetAbilityEffectType then
    local ok, effectType = pcall(GetAbilityEffectType, abilityId)
    if ok and effectType ~= nil then entry.effectType = effectType end
  end
  if GetAbilityTargetType then
    local ok, targetType = pcall(GetAbilityTargetType, abilityId)
    if ok and targetType ~= nil then entry.targetType = targetType end
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
  local seen = {}
  local list = {}
  local sources = {}
  local libSetsCandidates = 0
  local scanCandidates = 0

  local function addSetId(setId)
    if setId and not seen[setId] then
      seen[setId] = true
      list[#list + 1] = setId
    end
  end

  -- Prefer LibSets' curated list when available, but do not trust it as complete:
  -- an outdated LibSets can miss brand-new or PTS sets. Merge it with a numeric scan.
  if LibSets and LibSets.GetAllSetIds then
    local ok, ids = pcall(LibSets.GetAllSetIds)
    if ok and type(ids) == "table" and next(ids) ~= nil then
      sources[#sources + 1] = "LibSets"
      for key, value in pairs(ids) do
        local setId = type(value) == "number" and value or key
        if type(setId) == "number" then
          libSetsCandidates = libSetsCandidates + 1
          addSetId(setId)
        end
      end
    end
  end

  -- Numeric scan catches sets not present in LibSets. GetItemSetInfo(setId) returns
  -- hasSet=false for gaps, so keeping the range broad is cheap and future-proof.
  if GetItemSetInfo then
    local before = #list
    for setId = 1, SET_ID_SCAN_MAX do
      local ok, a, b, c = pcall(GetItemSetInfo, setId)
      local hasSet = false
      if ok then
        if type(a) == "boolean" then
          hasSet = a
        elseif type(a) == "string" and a ~= "" then
          hasSet = true
        elseif type(b) == "string" and b ~= "" then
          hasSet = true
        elseif type(c) == "string" and c ~= "" then
          hasSet = true
        end
      end
      if hasSet then
        scanCandidates = scanCandidates + 1
        addSetId(setId)
      end
    end
    if #list > before then sources[#sources + 1] = "scan" end
  end

  table.sort(list)
  if #sources == 0 then sources[#sources + 1] = "none" end
  ESOTooltipDumpSV.setIdLibSetsCandidateCount = libSetsCandidates
  ESOTooltipDumpSV.setIdScanCandidateCount = scanCandidates
  ESOTooltipDumpSV.setIdCandidateCount = #list
  return list, table.concat(sources, "+")
end

local function parseItemSetInfo(setId)
  if not GetItemSetInfo then return nil end
  local ok, a, b, c, d, e, f = pcall(GetItemSetInfo, setId)
  if not ok then return nil end

  local values = { a, b, c, d, e, f }
  local hasSet, setName, numBonuses, maxEquipped
  if type(a) == "boolean" then
    hasSet, setName, numBonuses, maxEquipped = a, b, c, f
  else
    hasSet = true
    for i = 1, #values do
      if type(values[i]) == "string" and values[i] ~= "" then
        setName = values[i]
        for j = i + 1, #values do
          if type(values[j]) == "number" then
            numBonuses = values[j]
            break
          end
        end
        break
      end
    end
    for i = #values, 1, -1 do
      if type(values[i]) == "number" then
        maxEquipped = values[i]
        break
      end
    end
  end

  if not hasSet or not setName or setName == "" then return nil end
  return setName, numBonuses, maxEquipped
end

-- Build a reference (gold/CP160) itemLink for a set so bonus text comes back with
-- computed numbers via GetItemLinkSetBonusInfo. Uses LibSets' own API:
--   LibSets.GetSetItemId(setId) -> a representative itemId for the set
--   LibSets.buildItemLink(itemId, qualitySubType) -> the itemLink
-- Returns nil if LibSets is absent; captureSet then falls back to the setId form.
-- NOTE: at the current client the setId form (GetItemSetBonusInfo) already returns
-- resolved values, so the fallback is not lossy — the itemLink path is preferred only
-- as a hardening against future API changes.
local function getLibSetsSetName(setId)
  if not LibSets then return nil end
  if LibSets.GetSetName then
    local ok, name = pcall(LibSets.GetSetName, setId)
    if ok and name and name ~= "" then return name end
  end
  if LibSets.GetSetNames then
    local ok, names = pcall(LibSets.GetSetNames, setId)
    if ok and type(names) == "table" then
      local lang = GetCVar and GetCVar("Language.2") or "en"
      if names[lang] and names[lang] ~= "" then return names[lang] end
      if names.en and names.en ~= "" then return names.en end
      for _, name in pairs(names) do
        if type(name) == "string" and name ~= "" then return name end
      end
    end
  end
  return nil
end

local function buildReferenceItemLink(setId)
  if not LibSets then return nil, nil, nil end
  -- Prefer the singular GetSetItemId; fall back to the plural table form.
  local itemId
  local itemIds
  if LibSets.GetSetItemId then
    local ok, id = pcall(LibSets.GetSetItemId, setId)
    if ok then itemId = id end
  end
  if LibSets.GetSetItemIds then
    local ok, ids = pcall(LibSets.GetSetItemIds, setId)
    if ok and type(ids) == "table" then
      itemIds = {}
      for key, value in pairs(ids) do
        local id = type(value) == "number" and value or key
        if type(id) == "number" then itemIds[#itemIds + 1] = id end
      end
      table.sort(itemIds)
      if not itemId then itemId = itemIds[1] end
    end
  end

  if not itemId then return nil, nil, itemIds end

  -- Pass Legendary (gold) quality subtype 370 so the reference link yields CP160 gold
  -- set-bonus values; LibSets.buildItemLink otherwise defaults to Normal (366).
  if LibSets.buildItemLink then
    local LEGENDARY_QUALITY_SUBTYPE = 370
    local ok, link = pcall(LibSets.buildItemLink, itemId, LEGENDARY_QUALITY_SUBTYPE)
    if ok and link and link ~= "" then return link, itemId, itemIds end
  end
  return nil, itemId, itemIds
end

local function captureSetMetadata(setId, entry, link)
  if link and GetItemLinkIcon then
    local ok, icon = pcall(GetItemLinkIcon, link)
    if ok and icon and icon ~= "" then entry.itemIcon = icon end
  end
  if LibSets then
    local function captureTable(methodName, fieldName)
      local fn = LibSets[methodName]
      if not fn then return end
      local ok, value = pcall(fn, setId)
      if ok and type(value) == "table" then
        local list = {}
        for _, v in pairs(value) do
          local tv = type(v)
          if tv == "string" or tv == "number" or tv == "boolean" then
            list[#list + 1] = v
          end
        end
        table.sort(list, function(a, b) return tostring(a) < tostring(b) end)
        if #list > 0 then entry[fieldName] = list end
      elseif ok and value ~= nil then
        local tv = type(value)
        if tv == "string" or tv == "number" or tv == "boolean" then entry[fieldName] = value end
      end
    end
    captureTable("GetSetSourceTypes", "sourceTypes")
    captureTable("GetSetSourceType", "sourceType")
    captureTable("GetSetType", "setType")
    captureTable("GetSetEquipmentTypes", "equipTypes")
    captureTable("GetSetEquipTypes", "equipTypes")
  end
end

local function captureSet(setId)
  local link, itemId, itemIds = buildReferenceItemLink(setId)
  local setName, numBonuses, maxEquipped

  -- Prefer the item-link API. LibSets itself validates set IDs this way, and it
  -- returns the canonical shape: hasSet, setName, numBonuses, equipped, maxEquipped, setId.
  if link and GetItemLinkSetInfo then
    local ok, hasSet, linkSetName, linkNumBonuses, _, linkMaxEquipped, linkSetId = pcall(GetItemLinkSetInfo, link, false)
    if ok and hasSet and (not linkSetId or linkSetId == setId) then
      setName = linkSetName
      numBonuses = linkNumBonuses
      maxEquipped = linkMaxEquipped
    end
  end

  -- Fallback for environments without LibSets/item links.
  if not setName then
    setName, numBonuses, maxEquipped = parseItemSetInfo(setId)
  end

  -- Last-resort LibSets fallback: do not drop a known set id just because the ESO
  -- direct set APIs do not expose it in this client state. Bonus text may still be
  -- filled below if item-link bonus APIs resolve.
  if not setName then
    setName = getLibSetsSetName(setId)
    numBonuses = numBonuses or 0
  end

  if not setName or setName == "" then return nil end
  local entry = { id = setId, name = setName, maxEquipped = maxEquipped, bonuses = {} }

  if itemId then entry.itemId = itemId end
  if itemIds and #itemIds > 0 then entry.itemIds = itemIds end
  if link then entry.referenceItemLink = link end
  captureSetMetadata(setId, entry, link)

  -- Bonus COUNT must come from the itemLink form for PERFECTED sets. GetItemSetInfo(setId)
  -- returns the base tier count and omits the perfected-only stat tier, so looping to that
  -- count silently drops it (this is why every Perfected set previously mirrored its base).
  -- GetItemLinkSetInfo(perfectedItemLink) reports numBonuses INCLUDING the perfected tier
  -- (matches ZOS's own tooltip code: esoui itemtooltips.lua AddSet), and the per-bonus loop
  -- below already reads it build-independently via GetItemLinkSetBonusInfo(link, false, i).
  -- No item needs to be equipped. Keep the GetItemSetInfo count as the no-LibSets fallback.
  if link and GetItemLinkSetInfo then
    local lok, lHasSet, _, lNumBonuses = pcall(GetItemLinkSetInfo, link, false)
    if lok and lHasSet and lNumBonuses and lNumBonuses > (numBonuses or 0) then
      numBonuses = lNumBonuses
    end
  end

  -- Bonus COUNT must come from the itemLink form for PERFECTED sets. GetItemSetInfo(setId)
  -- returns the base tier count and omits the perfected-only stat tier, so looping to that
  -- count silently drops it (this is why every Perfected set previously mirrored its base).
  -- GetItemLinkSetInfo(perfectedItemLink) reports numBonuses INCLUDING the perfected tier
  -- (matches ZOS's own tooltip code: esoui itemtooltips.lua AddSet), and the per-bonus loop
  -- below already reads it build-independently via GetItemLinkSetBonusInfo(link, false, i).
  -- No item needs to be equipped. Keep the GetItemSetInfo count as the no-LibSets fallback.
  if link and GetItemLinkSetInfo then
    local lok, lHasSet, _, lNumBonuses = pcall(GetItemLinkSetInfo, link, false)
    if lok and lHasSet and lNumBonuses and lNumBonuses > (numBonuses or 0) then
      numBonuses = lNumBonuses
    end
  end

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
-- ID-driven ability capture: call captureAbility directly over an explicit id
-- list (CaptureIds.lua), independent of the skill-tree walk. This re-sources
-- progression-gated abilities (scribing grimoires/morphs) the tree never
-- enumerates. Rank-aware: morph/transformation abilities can return empty at a
-- nil rank but real text at an explicit rank, so we try ranks 1-4 and keep the
-- highest rank that yields a non-empty description.
-- ---------------------------------------------------------------------------

local function abilityHasTooltipText(ability)
  if not ability then return false end
  if ability.description and ability.description ~= "" then return true end
  if ability.effectDescription and ability.effectDescription ~= "" then return true end
  if ability.descriptionHeader and ability.descriptionHeader ~= "" then return true end
  return false
end

local function abilityHasContent(ability)
  if not ability then return false end
  if abilityHasTooltipText(ability) then return true end
  if ability.name and ability.name ~= "" then return true end
  if ability.icon and ability.icon ~= "" and ability.icon ~= "/esoui/art/icons/icon_missing.dds" then return true end
  return false
end

local function captureAbilityRankBundle(abilityId, keepEmpty)
  if not abilityId or abilityId == 0 then return nil end
  local ranks = {}
  local best

  for rank = 1, 4 do
    local ability = captureAbility(abilityId, rank)
    -- Full-rank preservation is useful for real tooltip text, but storing four
    -- empty/name-only ranks for ~150k resolved ids creates a >600MB SavedVariables
    -- file. Curated ids keep everything; exhaustive allids keeps rank variants only
    -- when text/effect text exists. The best entry below still preserves name/icon
    -- for combat-log id matching.
    if ability and (keepEmpty or abilityHasTooltipText(ability)) then
      ranks[#ranks + 1] = ability
    end
    if ability and abilityHasTooltipText(ability) then
      -- keep the highest rank with text (later ranks overwrite earlier)
      best = ability
    end
  end

  -- Fall back to a nil-rank capture so an entry still exists even with no ranked
  -- description (records name/icon; description may be empty).
  if not best then
    local ability = captureAbility(abilityId, nil)
    if ability and (keepEmpty or abilityHasContent(ability)) then
      best = ability
      if keepEmpty or abilityHasTooltipText(ability) then ranks[#ranks + 1] = ability end
    end
  end

  if not best and #ranks == 0 then return nil end
  best = best or ranks[#ranks]
  return {
    id = abilityId,
    name = best and best.name or nil,
    bestRank = best and best.rank or nil,
    best = best,
    ranks = ranks,
  }
end

local function captureAbilityById(abilityId, keepEmpty)
  local bundle = captureAbilityRankBundle(abilityId, keepEmpty)
  return bundle and bundle.best or nil
end

local function buildAbilityIdScanWorkList()
  local seen = {}
  local work = {}

  local function add(id)
    if id and not seen[id] then
      seen[id] = true
      work[#work + 1] = id
    end
  end

  -- Seed with curated ids so out-of-range or known edge ids are always included.
  if type(ESOTooltipDumpCaptureIds) == "table" then
    for _, id in ipairs(ESOTooltipDumpCaptureIds) do add(id) end
  end
  -- Seed with ids observed in real combat logs/reports. This closes the loop between
  -- what the app needs and what the generic numeric scan can resolve.
  if type(ESOTooltipDumpCombatLogAbilityIds) == "table" then
    for _, id in ipairs(ESOTooltipDumpCombatLogAbilityIds) do add(id) end
  end

  for id = ABILITY_ID_SCAN_MIN, ABILITY_ID_SCAN_MAX do add(id) end
  table.sort(work)
  return work
end

-- ---------------------------------------------------------------------------
-- Chunked runner: drains a work list across frames within FRAME_BUDGET_MS
-- ---------------------------------------------------------------------------

local function runChunked(label, workList, perItemFn, onDone)
  local i = 1
  local total = #workList
  local results = {}
  local errors = 0
  local firstError
  local frame = 0

  local function step()
    frame = frame + 1
    local startMs = GetGameTimeMilliseconds()
    while i <= total do
      local item = workList[i]
      local ok, res = pcall(perItemFn, item)
      if ok and res ~= nil then
        results[#results + 1] = res
      elseif not ok then
        errors = errors + 1
        if not firstError then firstError = tostring(res) end
      end
      i = i + 1
      if GetGameTimeMilliseconds() - startMs >= FRAME_BUDGET_MS then break end
    end
    if i <= total then
      if (frame % 10) == 0 then
        d(string.format("[%s] %s: %d / %d", ADDON_NAME, label, i - 1, total))
      end
      zo_callLater(step, 0)
    else
      ESOTooltipDumpSV[label .. "ErrorCount"] = errors
      if firstError then ESOTooltipDumpSV[label .. "FirstError"] = firstError end
      d(string.format("[%s] %s: done (%d items, %d errors)", ADDON_NAME, label, #results, errors))
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

local function storeAbilityBundles(mode, requestedCount, bundles)
  local bestList = {}
  local rankBundles = {}
  local withDesc = 0
  for _, bundle in ipairs(bundles) do
    if bundle.best then
      bestList[#bestList + 1] = bundle.best
      if bundle.best.description and bundle.best.description ~= "" then withDesc = withDesc + 1 end
    end
    if bundle.ranks and #bundle.ranks > 0 then
      rankBundles[#rankBundles + 1] = {
        id = bundle.id,
        name = bundle.name,
        bestRank = bundle.bestRank,
        ranks = bundle.ranks,
      }
    end
  end
  ESOTooltipDumpSV.abilitiesById = bestList
  ESOTooltipDumpSV.abilityRanksById = rankBundles
  ESOTooltipDumpSV.abilitiesByIdCount = #bestList
  ESOTooltipDumpSV.abilityRanksByIdCount = #rankBundles
  ESOTooltipDumpSV.abilityIdMode = mode
  ESOTooltipDumpSV.abilityIdRequestedCount = requestedCount
  ESOTooltipDumpSV.abilitiesByIdWithDescriptionCount = withDesc
  return withDesc, #bestList
end

local function dumpAbilitiesById(onDone)
  local ids = ESOTooltipDumpCaptureIds
  if type(ids) ~= "table" or #ids == 0 then
    d(string.format("|cffaa00[%s] ids: CaptureIds.lua missing/empty — skipping ID-driven pass.|r", ADDON_NAME))
    if onDone then onDone() end
    return
  end
  runChunked("ids", ids, function(id) return captureAbilityRankBundle(id, true) end, function(bundles)
    local withDesc, captured = storeAbilityBundles("curated", #ids, bundles)
    d(string.format("[%s] ids: %d captured, %d WITH description text (of %d requested).",
      ADDON_NAME, captured, withDesc, #ids))
    if onDone then onDone() end
  end)
end

local function dumpAllAbilitiesById(onDone)
  local ids = buildAbilityIdScanWorkList()
  runChunked("allids", ids, function(id) return captureAbilityRankBundle(id, false) end, function(bundles)
    local withDesc, captured = storeAbilityBundles("exhaustive-scan", #ids, bundles)
    ESOTooltipDumpSV.abilityIdScanMin = ABILITY_ID_SCAN_MIN
    ESOTooltipDumpSV.abilityIdScanMax = ABILITY_ID_SCAN_MAX
    d(string.format("[%s] allids: %d resolvable captured, %d WITH description text (scanned %d ids).",
      ADDON_NAME, captured, withDesc, #ids))
    if onDone then onDone() end
  end)
end

local function countCombatLogSeedIds()
  if type(ESOTooltipDumpCombatLogAbilityIds) ~= "table" then return 0 end
  return #ESOTooltipDumpCombatLogAbilityIds
end

local function initDumpHeader()
  -- Start each dump from a clean table. Otherwise a scoped run after an exhaustive
  -- run can leave stale allids/set fields in SavedVariables and look larger/full
  -- even though the current command did less work.
  ESOTooltipDumpSV = {}
  ESOTooltipDumpSV.formatVersion = DUMP_FORMAT_VERSION
  ESOTooltipDumpSV.addonVersion = ADDON_VERSION
  ESOTooltipDumpSV.apiVersion = GetAPIVersion and GetAPIVersion() or nil
  ESOTooltipDumpSV.gameLanguage = GetCVar and GetCVar("Language.2") or nil
  ESOTooltipDumpSV.libSetsVersion = (LibSets and LibSets.version) or (LibSets and LibSets.VERSION) or nil
  ESOTooltipDumpSV.combatLogSeededAbilityIdCount = countCombatLogSeedIds()
  ESOTooltipDumpSV.gameTimeMs = GetGameTimeMilliseconds()
  ESOTooltipDumpSV.statSnapshot = captureStatSnapshot()
end

-- ---------------------------------------------------------------------------
-- Probe: do GetAbilityName/GetAbilityDescription return real text for abilities
-- the character has NOT unlocked (e.g. scribing grimoires/morphs)? If yes, the
-- ID-driven capture path can re-source them with no in-game unlocking. These ids
-- are scribing grimoire + morph abilities (from scribing-complete.json).
-- ---------------------------------------------------------------------------

local PROBE_IDS = {
  { id = 217699, label = "Banner Bearer (grimoire)" },
  { id = 217704, label = "Sundering Banner (morph)" },
  { id = 217228, label = "Elemental Explosion (grimoire)" },
  { id = 229600, label = "Sundering Explosion (morph)" },
  { id = 220549, label = "Mender's Bond (grimoire)" },
  { id = 217285, label = "Magical Bond (morph)" },
  { id = 216973, label = "Sundering Throw (morph)" },
  { id = 217178, label = "Sundering Smash (morph)" },
}

local function runProbe()
  d(string.format("[%s] PROBE: testing %d locked-ability ids. 'desc=YES' means ID-driven capture works without unlocking.",
    ADDON_NAME, #PROBE_IDS))
  local withDesc = 0
  for _, p in ipairs(PROBE_IDS) do
    local name, desc = "", ""
    if GetAbilityName then
      local ok, n = pcall(GetAbilityName, p.id, CASTER)
      if ok and n then name = n end
    end
    if GetAbilityDescription then
      local ok, dsc = pcall(GetAbilityDescription, p.id, nil, CASTER)
      if ok and dsc then desc = dsc end
    end
    local hasDesc = desc ~= nil and desc ~= ""
    if hasDesc then withDesc = withDesc + 1 end
    d(string.format("  %d  name=%q desc=%s  [%s]",
      p.id, name, hasDesc and "YES" or "no", p.label))
  end
  d(string.format("[%s] PROBE RESULT: %d / %d returned description text.",
    ADDON_NAME, withDesc, #PROBE_IDS))
  if withDesc == #PROBE_IDS then
    d(string.format("|c00ff00[%s] ALL returned text -> ID-driven capture will re-source scribing WITHOUT unlocking. Proceed.|r", ADDON_NAME))
  elseif withDesc > 0 then
    d(string.format("|cffaa00[%s] PARTIAL (%d/%d). Some ids resolve; report this exact count.|r", ADDON_NAME, withDesc, #PROBE_IDS))
  else
    d(string.format("|cff0000[%s] NONE returned text -> locked abilities are gated; grimoires must be unlocked in-game before dumping.|r", ADDON_NAME))
  end
end

local function handleSlash(args)
  args = (args or ""):lower():gsub("^%s+", ""):gsub("%s+$", "")

  if args == "probe" then
    runProbe()
    return
  end

  if args == "state" then
    local s = captureStatSnapshot()
    d(string.format("[%s] Reference state: lvl=%s CP=%s equipped=%s | MagMax=%s StaMax=%s SpellDmg=%s WpnDmg=%s",
      ADDON_NAME, tostring(s.level), tostring(s.championPoints), tostring(s.equippedItemCount),
      tostring(s.magickaMax), tostring(s.staminaMax), tostring(s.spellPower), tostring(s.weaponPower)))
    -- Crit (rating) + penetration too, so A/B gear-swap measurements can read
    -- every offensive stat from this one command (see the gear-upgrade value
    -- sourcing protocol). Crit DAMAGE is not a GetPlayerStat field — read it
    -- from the in-game Character sheet instead.
    d(string.format("[%s]   ...WpnCrit=%s SpellCrit=%s PhysPen=%s SpellPen=%s",
      ADDON_NAME, tostring(s.weaponCrit), tostring(s.spellCrit),
      tostring(s.physicalPen), tostring(s.spellPen)))
    return
  end

  initDumpHeader()
  ESOTooltipDumpSV.lastCommand = args ~= "" and args or "scoped"
  d(string.format("[%s] API %s. Dumping command=%s... do NOT change gear/CP until '/reloadui' to flush.",
    ADDON_NAME, tostring(ESOTooltipDumpSV.apiVersion), tostring(ESOTooltipDumpSV.lastCommand)))

  if args == "skills" then
    dumpSkills(function()
      d(string.format("[%s] Skills complete. Run /reloadui to write the file.", ADDON_NAME))
    end)
  elseif args == "sets" then
    dumpSets(function()
      d(string.format("[%s] Sets complete. Run /reloadui to write the file.", ADDON_NAME))
    end)
  elseif args == "ids" then
    dumpAbilitiesById(function()
      d(string.format("[%s] ID-driven pass complete. Run /reloadui to write the file.", ADDON_NAME))
    end)
  elseif args == "allids" or args == "full" or args == "exhaustive" then
    dumpAllAbilitiesById(function()
      d(string.format("[%s] Exhaustive ID scan complete. Run /reloadui to write the file.", ADDON_NAME))
    end)
  else
    -- Default scoped dump: skills, then sets, then curated/combat-log ids. The 300k
    -- exhaustive scan is intentionally opt-in via `/dumptooltips allids` / `full`.
    dumpSkills(function()
      dumpSets(function()
        dumpAbilitiesById(function()
          d(string.format("[%s] SCOPED dump complete (%d skills, %d sets, %d by-id; mode=%s). Run /reloadui to write the file. Use /dumptooltips allids only for an exhaustive 300k scan.",
            ADDON_NAME, ESOTooltipDumpSV.skillCount or 0, ESOTooltipDumpSV.setCount or 0,
            ESOTooltipDumpSV.abilitiesByIdCount or 0, tostring(ESOTooltipDumpSV.abilityIdMode)))
        end)
      end)
    end)
  end
end

local function onAddOnLoaded(_, name)
  if name ~= ADDON_NAME then return end
  EVENT_MANAGER:UnregisterForEvent(ADDON_NAME, EVENT_ADD_ON_LOADED)
  ESOTooltipDumpSV = ESOTooltipDumpSV or {}
  SLASH_COMMANDS["/dumptooltips"] = handleSlash
  d(string.format("[%s] loaded. Run /dumptooltips for scoped dump, /dumptooltips allids for exhaustive scan, or /dumptooltips state to preview.", ADDON_NAME))
end

EVENT_MANAGER:RegisterForEvent(ADDON_NAME, EVENT_ADD_ON_LOADED, onAddOnLoaded)
