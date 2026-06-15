/**
 * Arcanist Ultimate Simulator page.
 */

import React from 'react';

import { UltimateSimulator } from '../components/UltimateSimulator';

export interface UltimateSimulatorPageProps {
  className?: string;
}

export const UltimateSimulatorPage: React.FC<UltimateSimulatorPageProps> = ({ className }) => {
  return <UltimateSimulator className={className} />;
};
