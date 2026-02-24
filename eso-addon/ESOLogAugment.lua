-- ESOLogAugment: Stat Snapshot Addon for ESO Log Accuracy
-- Author: GitHub Copilot
-- Version: 0.1
--
-- Snapshots player stats every second during combat and writes to SavedVariables.
-- Intended for use with ESO Log Aggregator accuracy analysis.

ESOLogAugment = {}
ESOLogAugment.snapshots = {}
ESOLogAugment.abilities = {}
ESOLogAugment.isCombat = false
ESOLogAugment.lastSnapshot = 0
ESOLogAugment.SNAPSHOT_INTERVAL = 1000 -- ms

local function GetPlayerStats()
    local stats = {}
    stats.timestamp = GetGameTimeMilliseconds()
    stats.weaponDamage = GetPlayerStat(STAT_WEAPON_POWER)
    stats.spellDamage = GetPlayerStat(STAT_SPELL_POWER)
    stats.maxMagicka = GetPlayerStat(STAT_MAX_MAGICKA)
    stats.maxStamina = GetPlayerStat(STAT_MAX_STAMINA)
    stats.physPen = GetPlayerStat(STAT_PHYSICAL_PENETRATION)
    stats.spellPen = GetPlayerStat(STAT_SPELL_PENETRATION)
    stats.critDamageBonus = GetPlayerStat(STAT_CRITICAL_BONUS_DAMAGE)
    stats.critChance = GetPlayerStat(STAT_CRITICAL_CHANCE)
    stats.cpStars = {}
    for i = 1, 4 do
        local starId = GetSlottedChampionPerkId(i)
        if starId and starId > 0 then
            stats.cpStars[starId] = GetChampionPerkValue(starId)
        end
    end
    return stats
end

local function SnapshotStats()
    if not ESOLogAugment.isCombat then return end
    local now = GetGameTimeMilliseconds()
    if now - ESOLogAugment.lastSnapshot < ESOLogAugment.SNAPSHOT_INTERVAL then return end
    ESOLogAugment.lastSnapshot = now
    local stats = GetPlayerStats()
    table.insert(ESOLogAugment.snapshots, stats)
end

local function OnCombatState(event, inCombat)
    ESOLogAugment.isCombat = inCombat
    if inCombat then
        ESOLogAugment.lastSnapshot = 0
    end
end

local function OnUpdate()
    SnapshotStats()
end

local function OnAbilityUsed(event, abilityId)
    if not ESOLogAugment.abilities[abilityId] then
        local name = GetAbilityName(abilityId)
        local desc = GetAbilityDescription(abilityId)
        ESOLogAugment.abilities[abilityId] = { name = name, description = desc }
    end
end

local function OnPlayerActivated()
    EVENT_MANAGER:RegisterForEvent("ESOLogAugment", EVENT_PLAYER_COMBAT_STATE, OnCombatState)
    EVENT_MANAGER:RegisterForUpdate("ESOLogAugment", ESOLogAugment.SNAPSHOT_INTERVAL, OnUpdate)
    EVENT_MANAGER:RegisterForEvent("ESOLogAugment", EVENT_ABILITY_USED, OnAbilityUsed)
end

EVENT_MANAGER:RegisterForEvent("ESOLogAugment", EVENT_PLAYER_ACTIVATED, OnPlayerActivated)

-- SavedVariables setup
function ESOLogAugment_OnAddOnLoaded(event, addonName)
    if addonName == "ESOLogAugment" then
        ESOLogAugment_Data = ESOLogAugment_Data or { snapshots = {}, abilities = {} }
        ESOLogAugment.snapshots = ESOLogAugment_Data.snapshots
        ESOLogAugment.abilities = ESOLogAugment_Data.abilities
    end
end

EVENT_MANAGER:RegisterForEvent("ESOLogAugment", EVENT_ADD_ON_LOADED, ESOLogAugment_OnAddOnLoaded)

function ESOLogAugment_Save()
    ESOLogAugment_Data.snapshots = ESOLogAugment.snapshots
    ESOLogAugment_Data.abilities = ESOLogAugment.abilities
end

EVENT_MANAGER:RegisterForEvent("ESOLogAugment", EVENT_LOGOUT, ESOLogAugment_Save)
EVENT_MANAGER:RegisterForEvent("ESOLogAugment", EVENT_PLAYER_DEACTIVATED, ESOLogAugment_Save)
