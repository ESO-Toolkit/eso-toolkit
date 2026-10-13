import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import React from 'react';

interface ChartDataTableProps {
  caption: string;
  columns: string[];
  rows: number[][];
}

const PAGE_SIZE = 25;

/** A keyboard-accessible alternative to chart tooltips, bounded for long fights. */
export const ChartDataTable: React.FC<ChartDataTableProps> = ({ caption, columns, rows }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const id = React.useId();
  const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, nextExpanded) => setExpanded(nextExpanded)}
      elevation={0}
      sx={{ mt: 2, background: 'transparent' }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        id={`${id}-header`}
        aria-controls={`${id}-data`}
      >
        <Typography>View data table: {caption}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {expanded && (
          <>
            <TableContainer>
              <Table size="small">
                <caption>{caption}</caption>
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell key={column} scope="col">
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows
                    .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
                    .map((row, index) => (
                      <TableRow key={currentPage * PAGE_SIZE + index}>
                        {row.map((value, columnIndex) => (
                          <TableCell key={columnIndex} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {Number.isFinite(value)
                              ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                              : 'Unavailable'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length}>No samples available.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={rows.length}
              page={currentPage}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
            />
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
