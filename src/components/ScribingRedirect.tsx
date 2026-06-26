import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * The Scribing planner moved from its own page onto the Calculator page as the
 * "Scribing" tab (next to Ultimate). This forwards any old `/scribing-simulator`
 * link — including shared build URLs that carry `?grimoire=&focus=&signature=&affix=`
 * — to `/calculator#scribing`, preserving the query so the tab opens with the
 * shared build intact.
 */
export const ScribingRedirect: React.FC = () => {
  const { search } = useLocation();
  return <Navigate to={`/calculator${search}#scribing`} replace />;
};
