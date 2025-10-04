MUI v7 Quantity Input Component
Below is a React component for Material UI v7 that provides increment/decrement buttons around a number input. It uses MUI’s TextField, IconButton, and InputAdornment components for a modern, accessible spinner.

jsx
import React from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QuantityInputProps {
value: number;
min?: number;
max?: number;
step?: number;
onChange: (newValue: number) => void;
}

export function QuantityInput({
value,
min = 1,
max = 100,
step = 1,
onChange
}: QuantityInputProps) {
const handleDecrement = () => {
const next = Math.max(min, value - step);
onChange(next);
};

const handleIncrement = () => {
const next = Math.min(max, value + step);
onChange(next);
};

const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const parsed = parseInt(e.target.value, 10);
if (!isNaN(parsed)) {
const clamped = Math.max(min, Math.min(max, parsed));
onChange(clamped);
}
};

return (
<TextField
type="number"
value={value}
onChange={handleTypeChange}
inputProps={{
        min,
        max,
        step,
        style: { textAlign: 'center', width: 60 }
      }}
InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <IconButton
              size="small"
              onClick={handleDecrement}
              disabled={value <= min}
              edge="start"
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={handleIncrement}
              disabled={value >= max}
              edge="end"
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        )
      }}
variant="outlined"
/>
);
}
Usage Example
jsx
import React, { useState } from 'react';
import { QuantityInput } from './QuantityInput';

function App() {
const [qty, setQty] = useState(1);

return (

<div>
<QuantityInput
        value={qty}
        min={1}
        max={50}
        step={1}
        onChange={setQty}
      />
<p>Selected quantity: {qty}</p>
</div>
);
}

export default App;
Key Points
MUI v7 imports from @mui/material and @mui/icons-material.

Uses InputAdornment + IconButton for left/right controls.

Disables decrement when value <= min and increment when value >= max.

Clamps typed values to the [min, max] range.

Styles input for centered text and fixed width; easily customizable via inputProps.
