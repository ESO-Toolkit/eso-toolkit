/**
 * Centralized Chart.js plugin registration.
 *
 * Import this module for its side-effect (`import '@/utils/chartRegistration'`)
 * in any file that renders a Chart.js chart. Calling `ChartJS.register()` with
 * the same plugin multiple times is a no-op, so it is safe to import from many
 * entry points.
 */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeSeriesScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeSeriesScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
);
