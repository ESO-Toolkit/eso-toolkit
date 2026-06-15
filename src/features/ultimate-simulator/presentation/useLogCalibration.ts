/**
 * Live-log calibration hook for the Ultimate Calculator.
 *
 * Lets the user paste an ESO Logs report code, pick a fight + player, and measure
 * that player's real ultimate generation (via the conservation/snapshot method in
 * calibration.ts) to compare against the model. Self-contained: it queries the
 * EsoLogsClient directly (the Worker proxy injects tokens for public client
 * queries, so no sign-in is needed) rather than going through the report-viewer
 * Redux flow.
 */

import { useCallback, useContext, useMemo, useState } from 'react';

import { EsoLogsClientContext } from '../../../EsoLogsClientContext';
import {
  GetReportByCodeDocument,
  GetReportMasterDataDocument,
  GetResourceEventsDocument,
  HostilityType,
} from '../../../graphql/gql/graphql';
import type { ResourceChangeEvent } from '../../../types/combatlogEvents';
import { calibrateFromEvents, type CalibrationResult } from '../application/calibration';

export interface LogFight {
  readonly id: number;
  readonly name: string;
  readonly durationSeconds: number;
  readonly kill: boolean;
}

export interface LogPlayer {
  readonly id: number;
  readonly name: string;
  readonly subType: string; // class
}

export interface CalibrationMeasurement extends CalibrationResult {
  readonly fightName: string;
  readonly playerName: string;
  readonly playerClass: string;
}

type Phase = 'idle' | 'loadingReport' | 'reportLoaded' | 'measuring' | 'measured' | 'error';

export interface UseLogCalibration {
  phase: Phase;
  error: string | null;
  reportCode: string;
  fights: readonly LogFight[];
  players: readonly LogPlayer[];
  selectedFightId: number | null;
  selectedPlayerId: number | null;
  measurement: CalibrationMeasurement | null;
  /** Are we able to talk to the API yet? */
  ready: boolean;
  setReportCode: (code: string) => void;
  loadReport: () => Promise<void>;
  setFight: (fightId: number) => void;
  setPlayer: (playerId: number) => void;
  measure: () => Promise<void>;
  clear: () => void;
}

/** Extract a bare report code from a pasted code or a full esologs URL. */
export function parseReportCode(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/reports\/([A-Za-z0-9]{16})/);
  if (urlMatch) return urlMatch[1];
  const codeMatch = trimmed.match(/[A-Za-z0-9]{16}/);
  return codeMatch ? codeMatch[0] : trimmed;
}

export function useLogCalibration(): UseLogCalibration {
  // Read the context non-throwingly: the calculator must work even if it ever
  // renders outside the EsoLogsClientProvider (e.g. tests, isolated previews).
  // If absent, the panel simply shows as not-ready.
  const context = useContext(EsoLogsClientContext);
  const client = context?.client ?? null;
  const isReady = context?.isReady ?? false;

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reportCode, setReportCodeState] = useState('');
  // The report code that was actually LOADED (fights/players/windows belong to
  // it). Measurement must use this, never the live text field — otherwise editing
  // the input after loading would query a new report with the old fight/player.
  const [loadedReportCode, setLoadedReportCode] = useState<string | null>(null);
  const [fights, setFights] = useState<readonly LogFight[]>([]);
  const [players, setPlayers] = useState<readonly LogPlayer[]>([]);
  const [selectedFightId, setSelectedFightId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [measurement, setMeasurement] = useState<CalibrationMeasurement | null>(null);
  // Absolute fight windows, needed to scope the resource-events query.
  const [fightWindows, setFightWindows] = useState<Map<number, { start: number; end: number }>>(
    new Map(),
  );

  const setReportCode = useCallback(
    (code: string) => {
      setReportCodeState(code);
      setError(null);
      // If the entered code no longer matches what was loaded, the loaded
      // fights/players/windows are stale — drop them so Measure can't run against
      // a mismatched report. The user must re-load the new code first.
      if (loadedReportCode != null && parseReportCode(code) !== loadedReportCode) {
        setLoadedReportCode(null);
        setFights([]);
        setPlayers([]);
        setFightWindows(new Map());
        setSelectedFightId(null);
        setSelectedPlayerId(null);
        setMeasurement(null);
        setPhase('idle');
      }
    },
    [loadedReportCode],
  );

  const loadReport = useCallback(async () => {
    if (!client || !isReady) {
      setError('The ESO Logs connection is not ready yet — try again in a moment.');
      return;
    }
    const code = parseReportCode(reportCode);
    if (!code || code.length < 16) {
      setError('Enter a valid ESO Logs report code (16 characters) or report URL.');
      return;
    }
    setPhase('loadingReport');
    setError(null);
    setMeasurement(null);
    try {
      const [reportRes, masterRes] = await Promise.all([
        client.query({ query: GetReportByCodeDocument, variables: { code } }),
        client.query({ query: GetReportMasterDataDocument, variables: { code } }),
      ]);
      const report = (reportRes as { reportData?: { report?: unknown } }).reportData?.report as
        | {
            fights?: Array<{
              id: number;
              name?: string | null;
              kill?: boolean | null;
              startTime: number;
              endTime: number;
            } | null> | null;
          }
        | undefined;
      const master = (masterRes as { reportData?: { report?: unknown } }).reportData?.report as
        | {
            masterData?: {
              actors?: Array<{
                id: number;
                name?: string | null;
                subType?: string | null;
                type?: string | null;
              } | null> | null;
            } | null;
          }
        | undefined;

      const windows = new Map<number, { start: number; end: number }>();
      const fightList: LogFight[] = [];
      for (const f of report?.fights ?? []) {
        if (!f) continue;
        windows.set(f.id, { start: f.startTime, end: f.endTime });
        const durationSeconds = Math.max(0, Math.round((f.endTime - f.startTime) / 1000));
        // Skip trash/very short segments — boss fights are what people calibrate against.
        if (durationSeconds < 10) continue;
        fightList.push({
          id: f.id,
          name: f.name ?? `Fight ${f.id}`,
          durationSeconds,
          kill: Boolean(f.kill),
        });
      }
      fightList.sort((a, b) => b.durationSeconds - a.durationSeconds);

      const playerList: LogPlayer[] = [];
      for (const a of master?.masterData?.actors ?? []) {
        if (!a || a.type !== 'Player') continue;
        playerList.push({
          id: a.id,
          name: a.name ?? `Player ${a.id}`,
          subType: a.subType ?? 'Unknown',
        });
      }
      playerList.sort((a, b) => a.name.localeCompare(b.name));

      if (fightList.length === 0) {
        setError('No fights found in that report (is the code correct and the report public?).');
        setPhase('error');
        return;
      }

      setFights(fightList);
      setPlayers(playerList);
      setFightWindows(windows);
      setSelectedFightId(fightList[0].id);
      setSelectedPlayerId(playerList[0]?.id ?? null);
      setLoadedReportCode(code);
      setPhase('reportLoaded');
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not load that report: ${e.message}`
          : 'Could not load that report.',
      );
      setPhase('error');
    }
  }, [client, isReady, reportCode]);

  const setFight = useCallback((fightId: number) => {
    setSelectedFightId(fightId);
    setMeasurement(null);
  }, []);
  const setPlayer = useCallback((playerId: number) => {
    setSelectedPlayerId(playerId);
    setMeasurement(null);
  }, []);

  const measure = useCallback(async () => {
    if (!client || !isReady) return;
    if (selectedFightId == null || selectedPlayerId == null) return;
    // Always measure the LOADED report — never the live text field — so the
    // fight window/player below refer to the same report being queried.
    if (loadedReportCode == null) return;
    const window = fightWindows.get(selectedFightId);
    if (!window) return;
    const fight = fights.find((f) => f.id === selectedFightId);
    const player = players.find((p) => p.id === selectedPlayerId);
    setPhase('measuring');
    setError(null);
    try {
      // Page through the fight's resource events for both hostility scopes.
      const code = loadedReportCode;
      const all: ResourceChangeEvent[] = [];
      type EventsPage = {
        reportData?: {
          report?: {
            events?: { data?: unknown[]; nextPageTimestamp?: number | null } | null;
          } | null;
        } | null;
      };
      for (const hostilityType of [HostilityType.Friendlies, HostilityType.Enemies]) {
        let next: number | null = null;
        do {
          const res: EventsPage = await client.query({
            query: GetResourceEventsDocument,
            variables: {
              code,
              fightIds: [selectedFightId],
              startTime: next ?? window.start,
              endTime: window.end,
              hostilityType,
              limit: 100000,
            },
          });
          const page = res.reportData?.report?.events;
          if (page?.data) all.push(...(page.data as ResourceChangeEvent[]));
          next = page?.nextPageTimestamp ?? null;
        } while (next);
      }

      const result = calibrateFromEvents({
        events: all,
        fightDurationSeconds: fight?.durationSeconds ?? 0,
        targetActorID: selectedPlayerId,
      });
      setMeasurement({
        ...result,
        fightName: fight?.name ?? '',
        playerName: player?.name ?? '',
        playerClass: player?.subType ?? '',
      });
      setPhase('measured');
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not measure that fight: ${e.message}`
          : 'Could not measure that fight.',
      );
      setPhase('error');
    }
  }, [
    client,
    isReady,
    selectedFightId,
    selectedPlayerId,
    fightWindows,
    fights,
    players,
    loadedReportCode,
  ]);

  const clear = useCallback(() => {
    setPhase('idle');
    setError(null);
    setReportCodeState('');
    setLoadedReportCode(null);
    setFights([]);
    setPlayers([]);
    setSelectedFightId(null);
    setSelectedPlayerId(null);
    setMeasurement(null);
    setFightWindows(new Map());
  }, []);

  return useMemo(
    () => ({
      phase,
      error,
      reportCode,
      fights,
      players,
      selectedFightId,
      selectedPlayerId,
      measurement,
      ready: isReady,
      setReportCode,
      loadReport,
      setFight,
      setPlayer,
      measure,
      clear,
    }),
    [
      phase,
      error,
      reportCode,
      fights,
      players,
      selectedFightId,
      selectedPlayerId,
      measurement,
      isReady,
      setReportCode,
      loadReport,
      setFight,
      setPlayer,
      measure,
      clear,
    ],
  );
}
