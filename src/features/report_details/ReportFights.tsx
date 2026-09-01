import React from 'react';

import { DynamicMetaTags } from '../../components/DynamicMetaTags';
import { FightFragment } from '../../graphql/gql/graphql';
import { useReportData } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { cleanArray } from '../../utils/cleanArray';
import { preloadReportFightDetails } from '../../utils/reportRoutePreload';
import { isRecentlyUploaded } from '../reports/reportFormatting';

import { ReportFightsView } from './ReportFightsView';

// A still-processing (recently uploaded, zero-fight) report re-checks the API
// on this cadence so the page heals by itself once ESO Logs finishes parsing.
// Bounded: after MAX_AUTO_RECHECKS the user still has the manual "Check again"
// action, so a log that never parses cannot poll forever.
const AUTO_RECHECK_INTERVAL_MS = 30_000;
const MAX_AUTO_RECHECKS = 10;

export const ReportFights: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportData, isReportLoading, reportError, refetchReport } = useReportData();

  // Every fight in this list links to the (lazy, heavy) fight-details route, so
  // warm its chunk during idle time: by the time the user picks an encounter the
  // chunk is already resolved and the navigation paints without a round trip.
  // Deferred to idle so it never competes with this page's own report fetch.
  React.useEffect(() => {
    const ric = (
      window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      const handle = ric(() => preloadReportFightDetails(), { timeout: 2500 });
      return () => {
        (
          window as unknown as { cancelIdleCallback?: (handle: number) => void }
        ).cancelIdleCallback?.(handle);
      };
    }
    const timer = window.setTimeout(() => preloadReportFightDetails(), 200);
    return () => window.clearTimeout(timer);
  }, []);

  const memoizedFights = React.useMemo<FightFragment[]>((): FightFragment[] => {
    return cleanArray(reportData?.fights?.filter(Boolean));
  }, [reportData]);

  // A loaded report with zero fights is either still being parsed by ESO Logs
  // (recent upload — the overwhelmingly common case) or permanently broken.
  // Deliberately NOT gated on isReportLoading: a background re-check flips the
  // slice to loading, and dropping stillProcessing then would (a) swap the card
  // to the contradictory "Empty Log" variant for the duration of every poll and
  // (b) tear down + re-create the auto-recheck interval, resetting its cap.
  const stillProcessing =
    reportData != null && memoizedFights.length === 0 && isRecentlyUploaded(reportData);

  // While the report looks still-processing, quietly re-check from the network
  // so the page heals in place the moment fights appear. Skipped while the tab
  // is hidden; capped so an abandoned tab does not poll indefinitely.
  React.useEffect(() => {
    if (!stillProcessing) return undefined;
    let checks = 0;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      checks += 1;
      if (checks > MAX_AUTO_RECHECKS) {
        window.clearInterval(id);
        return;
      }
      refetchReport();
    }, AUTO_RECHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [stillProcessing, refetchReport]);

  // Generate dynamic meta tags for social sharing
  const metaTags = React.useMemo(() => {
    if (reportId && reportData) {
      const title = `${reportData.title || reportId} - Report Analysis`;
      const fightsCount = memoizedFights.length;
      const duration = reportData.endTime - reportData.startTime;
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);

      const description =
        `ESO combat log analysis for ${fightsCount} encounter${fightsCount !== 1 ? 's' : ''}. ` +
        `Total duration: ${minutes}:${seconds.toString().padStart(2, '0')}. ` +
        `View detailed damage, healing, and performance metrics.`;

      return {
        title,
        description,
        url: `${window.location.origin}${window.location.pathname}${window.location.search}`,
        type: 'website' as const,
      };
    }
    return null;
  }, [reportId, reportData, memoizedFights]);

  // Skeleton while nothing is known about this report yet — including the
  // client-warmup gap before the first fetch dispatches (no data, no error,
  // not loading), which previously flashed the "Empty Log" card. A background
  // re-check of an already-rendered (empty or healthy) report must not blank
  // the page back to a skeleton every poll, so data presence wins over loading.
  const showSkeleton = !reportData && (isReportLoading || (Boolean(reportId) && !reportError));

  return (
    <>
      {metaTags && <DynamicMetaTags {...metaTags} />}
      <ReportFightsView
        fights={showSkeleton ? undefined : memoizedFights}
        loading={showSkeleton}
        fightId={fightId}
        reportId={reportId}
        reportStartTime={reportData?.startTime}
        reportData={reportData}
        error={reportError}
        stillProcessing={stillProcessing}
        onRetry={refetchReport}
      />
    </>
  );
};
