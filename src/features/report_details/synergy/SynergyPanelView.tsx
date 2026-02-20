import GroupsIcon from '@mui/icons-material/Groups';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Link as MuiLink,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useMemo, useState } from 'react';

import type { FightFragment, ReportActorFragment } from '../../../graphql/gql/graphql';

import { ALKOSH_SYNERGY_IDS, filterSynergyData } from './synergyUtils';
import type { SynergyByAbility, SynergyByPlayer, SynergyPanelData } from './synergyUtils';

// Format ms offset as m:ss
function formatFightTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface SynergyPanelViewProps {
  data: SynergyPanelData;
  fight: FightFragment;
  isLoading: boolean;
  actorsById: Record<string | number, ReportActorFragment>;
  reportCode: string | null;
  fightId: number | null;
}

export const SynergyPanelView: React.FC<SynergyPanelViewProps> = ({
  data,
  fight,
  isLoading,
  actorsById,
  reportCode,
  fightId,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [alkoshOnly, setAlkoshOnly] = useState(false);

  const filteredData = useMemo(
    () => (alkoshOnly ? filterSynergyData(data, ALKOSH_SYNERGY_IDS) : data),
    [data, alkoshOnly],
  );

  if (isLoading) {
    return <SynergyPanelSkeleton />;
  }

  if (data.totalCount === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <GroupsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">
          No synergies activated
        </Typography>
        <Typography variant="body2" color="text.disabled">
          No players activated any synergy abilities during this fight.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      {/* Summary header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Synergy Tracking
        </Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={alkoshOnly}
              onChange={(_, checked) => setAlkoshOnly(checked)}
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              Alkosh only
            </Typography>
          }
          sx={{ ml: 0 }}
        />
        <Chip
          label={`${filteredData.totalCount} activation${filteredData.totalCount !== 1 ? 's' : ''}`}
          size="small"
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`${filteredData.byAbility.length} synerg${filteredData.byAbility.length !== 1 ? 'ies' : 'y'}`}
          size="small"
          variant="outlined"
        />
        <Chip
          label={`${filteredData.byPlayer.length} player${filteredData.byPlayer.length !== 1 ? 's' : ''}`}
          size="small"
          variant="outlined"
        />
        {(() => {
          const allSynergiesUrl = buildAllSynergiesUrl(reportCode, fightId);
          return allSynergiesUrl ? (
            <Chip
              component="a"
              href={allSynergiesUrl}
              target="_blank"
              rel="noopener noreferrer"
              icon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              label="View on ESO Logs"
              size="small"
              variant="outlined"
              color="info"
              clickable
            />
          ) : null;
        })()}
      </Box>

      {/* Per-player breakdown */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Who is taking synergies?
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 4,
        }}
      >
        {filteredData.byPlayer.map((player) => (
          <PlayerSynergyCard
            key={player.playerID}
            player={player}
            isDarkMode={isDarkMode}
            reportCode={reportCode}
            fightId={fightId}
          />
        ))}
      </Box>

      {/* Synergy breakdown by ability */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Synergy Abilities
      </Typography>
      <TableContainer
        sx={{
          mb: 4,
          borderRadius: 2,
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Synergy</TableCell>
              <TableCell align="right">Total Activations</TableCell>
              <TableCell>Activated By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.byAbility.map((ability) => (
              <AbilityRow key={ability.abilityGameID} ability={ability} actorsById={actorsById} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Timeline of all activations */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Activation Timeline
      </Typography>
      <TableContainer
        sx={{
          borderRadius: 2,
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          maxHeight: 400,
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Player</TableCell>
              <TableCell>Synergy</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.activations.map((activation, index) => {
              const fightTime = activation.timestamp - fight.startTime;
              const actor = actorsById[activation.sourceID];
              return (
                <TableRow key={`${activation.timestamp}-${activation.sourceID}-${index}`}>
                  <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {formatFightTime(fightTime)}
                  </TableCell>
                  <TableCell>{actor?.name ?? `Player ${activation.sourceID}`}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {activation.abilityIcon && (
                        <Avatar
                          src={`https://assets.eso-hub.com/abilities/${activation.abilityIcon}.webp`}
                          alt=""
                          sx={{ width: 20, height: 20 }}
                        />
                      )}
                      {activation.abilityName ?? `Ability ${activation.abilityGameID}`}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

/** Build an ESO Logs URL filtered to casts of a specific ability by a specific player. */
function buildEsoLogsUrl(
  reportCode: string | null,
  fightId: number | null,
  abilityId: number,
  sourceId: number,
): string | null {
  if (!reportCode || fightId == null) return null;
  return `https://www.esologs.com/reports/${reportCode}?fight=${fightId}&type=casts&ability=${abilityId}&source=${sourceId}`;
}

/**
 * The pins expression for ESO Logs that filters to all synergy ability IDs.
 * Format: `2$Off$#244F4B$expression$ability.id IN (id1,/*Name1* /id2,/*Name2* /...)`
 * Pre-encoded for use in a URL query parameter.
 */
const SYNERGY_PINS_EXPRESSION =
  '2%24Off%24%23244F4B%24expression%24ability.id+IN+%28' +
  '41963%2C%2F*Blood+Feast*%2F' +
  '41994%2C%2F*Black+Widow*%2F' +
  '41838%2C%2F*Radiate*%2F' +
  '42194%2C%2F*Spinal+Surge*%2F' +
  '39301%2C%2F*Combustion*%2F' +
  '63507%2C%2F*Healing+Combustion*%2F' +
  '32910%2C%2F*Shackle*%2F' +
  '32974%2C%2F*Ignite*%2F' +
  '48076%2C%2F*Charged+Lightning*%2F' +
  '23196%2C%2F*Conduit*%2F' +
  '37729%2C%2F*Hidden+Refresh*%2F' +
  '26832%2C%2F*Blessed+Shards*%2F' +
  '95922%2C%2F*Holy+Shards*%2F' +
  '22269%2C%2F*Purify*%2F' +
  '115548%2C%2F*Grave+Robber*%2F' +
  '85572%2C%2F*Harvest*%2F' +
  '191078%2F*Runebreak*%2F' +
  '%29';

/** Build an ESO Logs URL showing all synergy casts for the entire fight. */
function buildAllSynergiesUrl(reportCode: string | null, fightId: number | null): string | null {
  if (!reportCode || fightId == null) return null;
  return `https://www.esologs.com/reports/${reportCode}?fight=${fightId}&type=casts&pins=${SYNERGY_PINS_EXPRESSION}`;
}

/** Card showing synergy usage for a single player. */
const PlayerSynergyCard: React.FC<{
  player: SynergyByPlayer;
  isDarkMode: boolean;
  reportCode: string | null;
  fightId: number | null;
}> = ({ player, isDarkMode, reportCode, fightId }) => (
  <Card
    variant="outlined"
    sx={{
      borderRadius: 3,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
    }}
  >
    <CardContent sx={{ '&:last-child': { pb: 2 } }}>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {player.playerName}
          </Typography>
          {player.displayName && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.3 }}
            >
              {player.displayName}
            </Typography>
          )}
        </Box>
        <Chip label={player.totalCount} size="small" color="primary" />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {Object.entries(player.synergies).map(([abilityId, info]) => {
          const esoLogsUrl = buildEsoLogsUrl(
            reportCode,
            fightId,
            Number(abilityId),
            player.playerID,
          );
          return (
            <Box
              key={abilityId}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                {info.abilityIcon && (
                  <Avatar
                    src={`https://assets.eso-hub.com/abilities/${info.abilityIcon}.webp`}
                    alt=""
                    sx={{ width: 16, height: 16 }}
                  />
                )}
                {esoLogsUrl ? (
                  <MuiLink
                    href={esoLogsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.3,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {info.abilityName ?? `Ability ${abilityId}`}
                    <OpenInNewIcon sx={{ fontSize: 12, opacity: 0.6 }} />
                  </MuiLink>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {info.abilityName ?? `Ability ${abilityId}`}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {info.count}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </CardContent>
  </Card>
);

/** Table row for a single synergy ability. */
const AbilityRow: React.FC<{
  ability: SynergyByAbility;
  actorsById: Record<string | number, { name?: string | null }>;
}> = ({ ability, actorsById }) => {
  // Count per player for this ability
  const playerCounts = new Map<number, number>();
  for (const act of ability.activations) {
    playerCounts.set(act.sourceID, (playerCounts.get(act.sourceID) ?? 0) + 1);
  }

  return (
    <TableRow>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {ability.abilityIcon && (
            <Avatar
              src={`https://assets.eso-hub.com/abilities/${ability.abilityIcon}.webp`}
              alt=""
              sx={{ width: 24, height: 24 }}
            />
          )}
          {ability.abilityName ?? `Ability ${ability.abilityGameID}`}
        </Box>
      </TableCell>
      <TableCell align="right">{ability.totalCount}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {Array.from(playerCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([playerId, count]) => {
              const name = actorsById[playerId]?.name ?? `Player ${playerId}`;
              return (
                <Chip key={playerId} label={`${name}: ${count}`} size="small" variant="outlined" />
              );
            })}
        </Box>
      </TableCell>
    </TableRow>
  );
};

/** Loading skeleton for the synergy panel. */
const SynergyPanelSkeleton: React.FC = () => (
  <Box sx={{ mt: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
      <Skeleton width={180} height={32} />
      <Skeleton width={100} height={24} sx={{ borderRadius: '12px' }} />
    </Box>
    <Skeleton width={200} height={24} sx={{ mb: 1.5 }} />
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
      ))}
    </Box>
    <Skeleton width={160} height={24} sx={{ mb: 1.5 }} />
    <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
  </Box>
);
