/**
 * Scribing Simulator Page
 * Page-level component for the scribing simulator
 */

import React from 'react';

import { ScribingSimulator } from '../components/ScribingSimulator';

export interface ScribingSimulatorPageProps {
  className?: string;
}

export const ScribingSimulatorPage: React.FC<ScribingSimulatorPageProps> = ({ className }) => {
  return <ScribingSimulator className={className} autoSimulate={false} />;
};
