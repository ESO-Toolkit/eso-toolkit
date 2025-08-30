import { Button } from '@mui/material';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import React from 'react';

import { DataGrid } from '../../../components/DataGrid/DataGrid';
import { LogEvent } from '../../../types/combatlogEvents';

interface EventsGridProps {
  events: LogEvent[];
  title?: string;
  height?: number;
  isTargetMode?: boolean;
  hasTargetSelected?: boolean;
  noTargetMessage?: string;
}

// Transform events data for the table
type EventRowData = {
  id: number;
  timestamp: number;
  type: string;
  sourceID: number | null;
  targetID: number | null;
  abilityGameID: number | null;
  amount: number | null;
  fight: number | null;
  originalEvent: LogEvent;
  [key: string]: unknown; // Add index signature for DataGrid compatibility
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];
Object.freeze(PAGE_SIZE_OPTIONS);

export const EventsGrid: React.FC<EventsGridProps> = ({
  events,
  title = 'Events',
  height = 600,
  isTargetMode = false,
  hasTargetSelected = true,
  noTargetMessage = 'Please select a target to view events associated with that target.',
}) => {
  // Transform events data for the table
  const data: EventRowData[] = React.useMemo(() => {
    return events.map((event, index) => ({
      id: index,
      timestamp: event.timestamp || 0,
      type: event.type || '',
      sourceID: 'sourceID' in event ? event.sourceID : null,
      targetID: 'targetID' in event ? event.targetID : null,
      abilityGameID: 'abilityGameID' in event ? event.abilityGameID : null,
      amount: 'amount' in event ? event.amount : null,
      fight: 'fight' in event ? event.fight : null,
      originalEvent: event,
    }));
  }, [events]);

  // Create column helper
  const columnHelper = createColumnHelper<EventRowData>();

  // Define columns for the table
  const columns = React.useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        size: 80,
      }),
      columnHelper.accessor('timestamp', {
        header: 'Time',
        size: 120,
        cell: (info) => {
          const date = new Date(info.getValue());
          return date.toISOString().substr(11, 12); // HH:mm:ss.sss
        },
      }),
      columnHelper.accessor('type', {
        header: 'Event Type',
        size: 150,
      }),
      columnHelper.accessor('sourceID', {
        header: 'Source ID',
        size: 100,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('targetID', {
        header: 'Target ID',
        size: 100,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('abilityGameID', {
        header: 'Ability ID',
        size: 100,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('amount', {
        header: 'Amount',
        size: 100,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('fight', {
        header: 'Fight',
        size: 80,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.display({
        id: 'details',
        header: 'Event Details',
        size: 150,
        cell: (props) => {
          const handleCopyDetails = async (): Promise<void> => {
            try {
              const jsonString = JSON.stringify(props.row.original.originalEvent, null, 2);
              await navigator.clipboard.writeText(jsonString);
            } catch (error) {
              console.error('Failed to copy to clipboard:', error);
              // Fallback: create a temporary textarea element
              const textarea = document.createElement('textarea');
              textarea.value = JSON.stringify(props.row.original.originalEvent, null, 2);
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
          };

          return (
            <Button
              variant="outlined"
              size="small"
              onClick={handleCopyDetails}
              sx={{ fontSize: '0.75rem' }}
            >
              Copy JSON
            </Button>
          );
        },
      }),
    ],
    [columnHelper]
  );

  // Show target selection message if in target mode but no target is selected
  if (isTargetMode && !hasTargetSelected) {
    return (
      <DataGrid
        data={[]}
        columns={columns as ColumnDef<EventRowData>[]}
        title={title}
        height={height}
        initialPageSize={25}
        pageSizeOptions={[25, 50, 100]}
        enableSorting={false}
        enableFiltering={false}
        enablePagination={false}
        emptyMessage={noTargetMessage}
      />
    );
  }

  return (
    <DataGrid
      data={data}
      columns={columns as ColumnDef<EventRowData>[]}
      title={`${title} (${events.length.toLocaleString()} total)`}
      height={height}
      initialPageSize={25}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      enableSorting={true}
      enableFiltering={true}
      enablePagination={true}
      emptyMessage={
        events.length === 0 ? 'No events to display' : 'No events match the current filters'
      }
    />
  );
};
