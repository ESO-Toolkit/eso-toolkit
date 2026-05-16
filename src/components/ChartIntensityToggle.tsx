import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectChartIntensity } from '../store/ui/uiSelectors';
import { setChartIntensity, type ChartIntensity } from '../store/ui/uiSlice';

export const ChartIntensityToggle: React.FC = () => {
  const dispatch = useDispatch();
  const intensity = useSelector(selectChartIntensity);

  const handleChange = (_: React.MouseEvent, value: ChartIntensity | null) => {
    if (value) {
      dispatch(setChartIntensity(value));
    }
  };

  return (
    <Tooltip title="Chart visual style" placement="bottom">
      <ToggleButtonGroup
        value={intensity}
        exclusive
        onChange={handleChange}
        size="small"
        sx={{
          height: 32,
          '& .MuiToggleButton-root': {
            px: 1.5,
            py: 0,
            fontSize: '0.75rem',
            textTransform: 'none',
            fontWeight: 600,
          },
        }}
      >
        <ToggleButton value="subtle">Subtle</ToggleButton>
        <ToggleButton value="bold">
          <AutoFixHighIcon sx={{ fontSize: 14, mr: 0.5 }} />
          Bold
        </ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  );
};
