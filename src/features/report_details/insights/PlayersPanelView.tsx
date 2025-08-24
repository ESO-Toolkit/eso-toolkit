import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import React from 'react';

import { ReportActorFragment } from '../../../graphql/generated';
import { PlayerInfo } from '../../../store/events_data/actions';
import { PlayerGear } from '../../../types/playerDetails';
import { detectBuildIssues } from '../../../utils/detectBuildIssues';
import { resolveActorName } from '../../../utils/resolveActorName';

// Helpers for gear classification and chip coloring
const normalizeName = (name?: string) =>
  (name || '')
    .toLowerCase()
    .replace(/^perfected\s+/, '')
    .replace(/’/g, "'")
    .trim();

const ARENA_SET_NAMES = new Set(
  [
    // Maelstrom Arena
    'Crushing Wall',
    'Precise Regeneration',
    'Thunderous Volley',
    'Merciless Charge',
    'Cruel Flurry',
    'Rampaging Slash',
    // Dragonstar Arena (Master)
    'Destructive Impact',
    'Grand Rejuvenation',
    'Caustic Bow',
    'Titanic Cleave',
    'Stinging Slashes',
    'Puncturing Remedy',
    // Blackrose Prison
    'Wild Impulse',
    "Mender's Ward",
    'Mender’s Ward',
    'Virulent Shot',
    'Radial Uppercut',
    'Spectral Cloak',
    'Gallant Charge',
    // Asylum Sanctorium
    'Concentrated Force',
    'Timeless Blessing',
    'Piercing Spray',
    'Disciplined Slash',
    'Chaotic Whirlwind',
    'Defensive Position',
    // Vateshran Hollows
    'Wrath of Elements',
    'Frenzied Momentum',
    'Void Bash',
    "Executioner's Blade",
    'Point-Blank Snipe',
    'Force Overflow',
  ].map((n) => normalizeName(n))
);

const MYTHIC_SET_NAMES = new Set(
  [
    "Bloodlord's Embrace",
    'Thrassian Stranglers',
    'Snow Treaders',
    'Ring of the Wild Hunt',
    "Malacath's Band of Brutality",
    'Torc of Tonal Constancy',
    'Ring of the Pale Order',
    'Pearls of Ehlnofey',
    'Gaze of Sithis',
    "Harpooner's Wading Kilt",
    "Death Dealer's Fete",
    "Shapeshifter's Chain",
    'Markyn Ring of Majesty',
    "Belharza's Band",
    'Spaulder of Ruin',
    "Lefthander's Aegis Belt",
    "Mora's Whispers",
    'Oakensoul Ring',
    "Sea-Serpent's Coil",
    'Dov-Rha Sabatons',
    "Faun's Lark Cladding",
    "Stormweaver's Cavort",
    "Syrabane's Ward",
    "Velothi Ur-Mage's Amulet",
    'Esoteric Environment Greaves',
    'Cryptcanon Vestments',
    'Torc of the Last Ayleid King',
    'Rourken Steamguards',
    "The Shadow Queen's Cowl",
    'The Saint and the Seducer',
  ].map((n) => normalizeName(n))
);

// One-piece monster sets (purple); normalized substrings
const MONSTER_ONE_PIECE_HINTS = [
  'Anthelmir’s Construct',
  'Archdruid Devyric',
  'Balorgh',
  'Baron Thirsk',
  'Bloodspawn',
  'Chokethorn',
  'Domihaus',
  'Earthgore',
  'Engine Guardian',
  'Euphotic Gatekeeper',
  'Galenwe’s Lament',
  'Glorgoloch the Destroyer',
  'Grundwulf',
  'Iceheart',
  'Ilambris',
  'Kjalnar’s Nightmare',
  'Lady Thorn',
  'Lady Malydga',
  'Lord Warden',
  'Maarselok',
  'Magma Incarnate',
  'Maw of the Infernal',
  'Mighty Chudan',
  'Molag Kena',
  'Mother Ciannait',
  'Nazaray',
  'Nerien’eth',
  'Nightflame',
  'Nobilis Eternus',
  'Ozezan the Inferno',
  'Pirate Skeleton',
  'Prior Thierric',
  'Roksa the Warped',
  'Saint Delyn',
  'Scourge Harvester',
  'Selene',
  'Sellistrix',
  'Sentinel of Rkugamz',
  'Shadowrend',
  'Slimecraw',
  'Spawn of Mephala',
  'Stonekeeper',
  'Stormfist',
  'Swarm Mother',
  'Thurvokun',
  'Tremorscale',
  'Troll King',
  'Valkyn Skoria',
  'Velidreth',
  'Vykosa',
  'Zaan',
  'Symphony of Blades',
].map((n) => normalizeName(n));

const getGearChipProps = (setName: string, count: number): { sx?: any } => {
  const n = normalizeName(setName);
  // Mythics first (explicit list)
  if (MYTHIC_SET_NAMES.has(n)) {
    return {
      sx: {
        borderColor: '#674305',
        color: '#f2daae',
        '& .MuiChip-label': { color: '#f2daae' },
      },
    };
  }
  // Arena weapons
  if (ARENA_SET_NAMES.has(n)) {
    return {
      sx: {
        borderColor: '#16475d',
        color: '#3c9bff',
        '& .MuiChip-label': { color: '#3c9bff' },
      },
    };
  }
  // Special case: 4-piece Highland Sentinel uses a specific font color
  if (count === 4 && n === normalizeName('Highland Sentinel')) {
    return {
      sx: {
        color: '#00e553',
        '& .MuiChip-label': { color: '#00e553' },
      },
    };
  }
  // 5-piece sets
  if (count >= 5) {
    return {
      sx: {
        borderColor: '#1f5633',
        color: '#93f093',
        '& .MuiChip-label': { color: '#93f093' },
      },
    };
  }
  // Two-piece monsters
  if (count === 2 && MONSTER_ONE_PIECE_HINTS.some((h) => n.includes(h))) {
    return {
      sx: {
        borderColor: '#765fb6',
        color: '#d18bef',
        '& .MuiChip-label': { color: '#d18bef' },
      },
    };
  }
  // One-piece monsters
  if (count === 1 && MONSTER_ONE_PIECE_HINTS.some((h) => n.includes(h))) {
    return {
      sx: {
        borderColor: '#45838b',
        color: '#58d8e9',
        '& .MuiChip-label': { color: '#58d8e9' },
      },
    };
  }
  return {};
};

interface PlayersPanelViewProps {
  playerActors: ReportActorFragment[];
  eventPlayers: Record<string, PlayerInfo>;
  mundusBuffsByPlayer: Record<string, Array<{ name: string; id: number }>>;
  aurasByPlayer: Record<string, Array<{ name: string; id: number; stacks?: number }>>;
  deathsByPlayer: Record<string, number>;
  resurrectsByPlayer: Record<string, number>;
  cpmByPlayer: Record<string, number>;
  reportId?: string;
  fightId?: string;
}

export const PlayersPanelView: React.FC<PlayersPanelViewProps> = ({
  playerActors,
  eventPlayers,
  mundusBuffsByPlayer,
  aurasByPlayer,
  deathsByPlayer,
  resurrectsByPlayer,
  cpmByPlayer,
  reportId,
  fightId,
}) => {
  // Encoded pins filter provided by user for casts view
  const CASTS_PINS =
    '2%24Off%24%23244F4B%24expression%24ability.id+NOT+IN%2816499%2C28541%2C16165%2C16145%2C18350%2C28549%2C45223%2C18396%2C16277%2C115548%2C85572%2C23196%2C95040%2C39301%2C63507%2C22269%2C95042%2C191078%2C32910%2C41963%2C16261%2C45221%2C48076%2C32974%2C21970%2C41838%2C16565%2C45227%2C118604%2C26832%2C15383%2C45382%2C16420%2C68401%2C47193%2C190583%2C16212%2C228524%2C186981%2C16037%2C15435%2C15279%2C72931%2C45228%2C16688%2C61875%2C61874%29';

  const castsUrl = React.useCallback((rid?: string, fid?: string) => {
    if (!rid) return undefined;
    const fightParam = fid ? `&fight=${encodeURIComponent(fid)}` : '';
    return `https://www.esologs.com/reports/${encodeURIComponent(rid)}?type=casts${fightParam}&pins=${CASTS_PINS}`;
  }, []);

  const getArmorWeightCounts = (gear: PlayerGear[]) => {
    let heavy = 0,
      medium = 0,
      light = 0;
    if (!Array.isArray(gear)) return { heavy, medium, light };
    const norm = (s?: string) => (s || '').toLowerCase();
    for (const g of gear) {
      if (!g || (g as any).id === 0) continue;
      if (typeof g.type === 'number') {
        if (g.type === 3) heavy += 1;
        else if (g.type === 2) medium += 1;
        else if (g.type === 1) light += 1;
        continue;
      }
      const n = norm(g.name);
      if (!n) continue;
      if (n.includes('heavy')) heavy += 1;
      else if (n.includes('medium')) medium += 1;
      else if (n.includes('light')) light += 1;
    }
    return { heavy, medium, light };
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Players
      </Typography>
      <Grid container spacing={2}>
        {playerActors.map((actor) => {
          // Get player details from events.players by actor id
          const player = actor.id ? eventPlayers[String(actor.id)] : undefined;

          if (!player) {
            return null;
          }

          const talents = player?.combatantInfo?.talents ?? [];
          const gear = player?.combatantInfo?.gear ?? [];
          const buildIssues = detectBuildIssues(gear);
          return (
            <Box key={actor.id} sx={{ width: '100%', mb: 2 }}>
              <Card variant="outlined" className="u-hover-lift u-fade-in-up" sx={{ width: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box
                    display="flex"
                    flexDirection={{ xs: 'column', md: 'row' }}
                    alignItems="stretch"
                    gap={2}
                  >
                    {/* Left column: identity, talents, gear, issues */}
                    <Box flex={1} minWidth={0}>
                      <Box display="flex" alignItems="center" mb={1}>
                        {actor.icon ? (
                          <Avatar
                            src={`https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`}
                            alt={String(resolveActorName(actor))}
                            sx={{ mr: 2 }}
                          />
                        ) : (
                          <Avatar sx={{ mr: 2 }} />
                        )}
                        <Box>
                          <Typography variant="subtitle1">{resolveActorName(actor)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {actor.subType}
                          </Typography>
                        </Box>
                      </Box>
                      {/* Talents */}
                      {talents.length > 0 && (
                        <Box mb={1}>
                          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                            Talents:
                          </Typography>
                          <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
                            {talents.slice(0, 6).map((talent, idx) => (
                              <Avatar
                                key={idx}
                                src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                alt={talent.name}
                                variant="rounded"
                                sx={{ width: 32, height: 32, border: '1px solid var(--border)' }}
                                title={`${talent.name} (ID: ${talent.guid})`}
                              />
                            ))}
                          </Box>
                          {talents.length > 6 && (
                            <Box display="flex" flexWrap="wrap" gap={1}>
                              {talents.slice(6).map((talent, idx) => (
                                <Avatar
                                  key={idx}
                                  src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                  alt={talent.name}
                                  variant="rounded"
                                  sx={{ width: 32, height: 32, border: '1px solid var(--border)' }}
                                  title={`${talent.name} (ID: ${talent.guid})`}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      )}
                      {/* Gear */}
                      {gear.length > 0 && (
                        <Box>
                          {(() => {
                            const w = getArmorWeightCounts(gear);
                            return (
                              <Box display="flex" alignItems="center" gap={0.25} sx={{ mb: 0.5 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  Gear Sets:
                                </Typography>
                                <Box
                                  display="inline-flex"
                                  alignItems="center"
                                  gap={0.375}
                                  sx={{ ml: 0.25 }}
                                >
                                  <ShieldOutlinedIcon
                                    sx={{ color: 'text.secondary', fontSize: 12 }}
                                  />
                                  <Typography
                                    variant="caption"
                                    sx={{ color: '#ff7a7a', fontSize: 11, lineHeight: 1 }}
                                  >
                                    {w.heavy}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                                  >
                                    •
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ color: '#93f093', fontSize: 11, lineHeight: 1 }}
                                  >
                                    {w.medium}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                                  >
                                    •
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ color: '#3c9bff', fontSize: 11, lineHeight: 1 }}
                                  >
                                    {w.light}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })()}
                          <Box display="flex" flexWrap="wrap" gap={1}>
                            {(() => {
                              type BaseSet = {
                                total: number;
                                perfected: number;
                                setID?: number;
                                hasPerfected: boolean;
                                hasRegular: boolean;
                                baseDisplay: string;
                              };
                              const setDataByBase: Record<string, BaseSet> = {};

                              const twoHandedKeywords = [
                                'greatsword',
                                'battle axe',
                                'maul',
                                'bow',
                                'inferno staff',
                                'ice staff',
                                'lightning staff',
                                'flame staff',
                                'destruction staff',
                                'restoration staff',
                              ];
                              const isTwoHandedWeapon = (name?: string) => {
                                if (!name) return false;
                                const n = name.toLowerCase();
                                return twoHandedKeywords.some((k) => n.includes(k));
                              };

                              gear.forEach((g: PlayerGear) => {
                                if (!g.setName) return;
                                const increment = isTwoHandedWeapon(g.name) ? 2 : 1;

                                const isPerfected = /^perfected\s+/i.test(g.setName);
                                const baseDisplay = g.setName.replace(/^Perfected\s+/, '');
                                const baseKey = normalizeName(baseDisplay);

                                if (!setDataByBase[baseKey]) {
                                  setDataByBase[baseKey] = {
                                    total: 0,
                                    perfected: 0,
                                    setID: g.setID,
                                    hasPerfected: false,
                                    hasRegular: false,
                                    baseDisplay,
                                  };
                                }
                                const entry = setDataByBase[baseKey];
                                entry.total += increment;
                                if (isPerfected) {
                                  entry.perfected += increment;
                                  entry.hasPerfected = true;
                                } else {
                                  entry.hasRegular = true;
                                }
                                if (!entry.setID && g.setID) entry.setID = g.setID;
                              });

                              const chips: React.ReactNode[] = [];
                              Object.entries(setDataByBase).forEach(([baseKey, data], idx) => {
                                const labelName =
                                  data.perfected === data.total
                                    ? `Perfected ${data.baseDisplay}`
                                    : data.baseDisplay;
                                const count = data.total;
                                const chipProps = getGearChipProps(labelName, count);
                                chips.push(
                                  <Chip
                                    key={idx}
                                    label={`${count} ${labelName}`}
                                    size="small"
                                    variant="outlined"
                                    title={`Set ID: ${data.setID ?? ''}`}
                                    {...chipProps}
                                  />
                                );

                                if (
                                  count >= 5 &&
                                  data.hasPerfected &&
                                  data.hasRegular &&
                                  data.perfected < 5
                                ) {
                                  const missing = 5 - data.perfected;
                                  if (missing > 0) {
                                    buildIssues.push({
                                      gearName: labelName,
                                      enchantQuality: 5,
                                      message: `Missing ${missing} Perfected piece(s) in ${labelName} for the 5-piece bonus`,
                                    });
                                  }
                                }
                              });
                              return chips;
                            })()}
                          </Box>
                        </Box>
                      )}

                      {/* Build Issues Disclaimer + Details */}
                      {buildIssues.length > 0 && (
                        <Box mt={1}>
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: 'rgba(255, 193, 7, 0.10)',
                              border: '1px solid rgba(255, 193, 7, 0.40)',
                              color: 'warning.main',
                              fontSize: '0.875rem',
                            }}
                          >
                            Disclaimer: build issues were detected in this player's logged gear.
                          </Box>
                          <Accordion variant="outlined" sx={{ mt: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="body2" fontWeight="bold">
                                View Build Issue Details ({buildIssues.length})
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box component="ul" sx={{ m: 0, pl: 2, listStyleType: 'disc' }}>
                                {buildIssues.map((issue, idx) => (
                                  <Typography component="li" key={idx} variant="body2">
                                    {issue.message}
                                  </Typography>
                                ))}
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        </Box>
                      )}
                    </Box>
                    {/* Right column: compact details */}
                    <Box
                      sx={{
                        width: { xs: '100%', md: 300 },
                        p: 1,
                        border: '1px solid var(--border)',
                        borderRadius: 1,
                        backgroundColor: 'rgba(2,6,23,0.25)',
                        alignSelf: 'stretch',
                      }}
                    >
                      {/* Header row: left = Mundus label (if present), right = Resurrects/CPM */}
                      {(() => {
                        const hasMundus = !!(
                          actor.id && mundusBuffsByPlayer[String(actor.id)]?.length
                        );
                        const deathsVal = actor.id ? (deathsByPlayer[String(actor.id)] ?? 0) : 0;
                        const resVal = actor.id ? (resurrectsByPlayer[String(actor.id)] ?? 0) : 0;
                        const cpmVal = actor.id ? (cpmByPlayer[String(actor.id)] ?? 0) : 0;
                        return (
                          <Box
                            sx={{
                              mb: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                                minHeight: 24,
                                flex: '0 0 auto',
                                mr: 1,
                              }}
                            >
                              {hasMundus && (
                                <>
                                  {mundusBuffsByPlayer[String(actor.id)]!.map((buff, idx) => (
                                    <Box
                                      key={idx}
                                      component="span"
                                      title={`Ability ID: ${buff.id}`}
                                      sx={{
                                        display: 'inline-block',
                                        border: '1px solid',
                                        borderColor: 'var(--border)',
                                        borderRadius: 9999,
                                        px: 0.75,
                                        py: 0.25,
                                        fontSize: 11,
                                        lineHeight: 1.2,
                                        color: 'primary.main',
                                        whiteSpace: 'nowrap',
                                        verticalAlign: 'middle',
                                      }}
                                    >
                                      {buff.name.replace(/^Boon:\s*/i, '')}
                                    </Box>
                                  ))}
                                </>
                              )}
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                whiteSpace: 'nowrap',
                                flex: '0 0 auto',
                                flexShrink: 0,
                                ml: 'auto',
                                pr: 1,
                              }}
                            >
                              {/* Deaths • Resurrects • CPM with emojis + tooltips */}
                              <Tooltip title="Deaths in this fight">
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <span role="img" aria-label="deaths">
                                    💀
                                  </span>
                                  &nbsp;{deathsVal}
                                </span>
                              </Tooltip>{' '}
                              •{' '}
                              <Tooltip title="Successful resurrects performed">
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <span role="img" aria-label="resurrects">
                                    ❤️
                                  </span>
                                  &nbsp;{resVal}
                                </span>
                              </Tooltip>{' '}
                              •{' '}
                              <Tooltip title="Casts per Minute">
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <span role="img" aria-label="cpm">
                                    🐭
                                  </span>
                                  &nbsp;
                                  {reportId ? (
                                    <a
                                      href={castsUrl(reportId, fightId)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: 'inherit', textDecoration: 'underline' }}
                                    >
                                      {cpmVal}
                                    </a>
                                  ) : (
                                    <>{cpmVal}</>
                                  )}
                                </span>
                              </Tooltip>
                            </Typography>
                          </Box>
                        );
                      })()}
                      {/* Mundus chips moved to header; block removed to avoid duplication */}
                      {actor.id && aurasByPlayer[String(actor.id)]?.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                            Notable Auras
                          </Typography>
                          <Box display="flex" flexWrap="wrap" gap={1}>
                            {aurasByPlayer[String(actor.id)]
                              .slice()
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .slice(0, 3)
                              .map((aura, idx) => (
                                <Chip
                                  key={idx}
                                  label={
                                    aura.stacks && aura.stacks > 1
                                      ? `${aura.name} (${aura.stacks})`
                                      : aura.name
                                  }
                                  size="small"
                                  variant="outlined"
                                  title={`Ability ID: ${aura.id}${aura.stacks ? ` | Stacks: ${aura.stacks}` : ''}`}
                                />
                              ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  {/* Duplicate long lists removed to keep card minimal; summarized in right panel */}
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
};
