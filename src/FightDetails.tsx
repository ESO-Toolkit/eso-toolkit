import React from "react";
import { Box, Typography } from "@mui/material";

// Fight type definition
export type Fight = {
  id: string;
  name: string;
  start: string;
  end: string;
};

interface FightDetailsProps {
  fight: Fight | undefined;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight }) => {
  if (!fight) return <Typography>No details found.</Typography>;
  return (
    <Box>
      <Typography><strong>Name:</strong> {fight.name}</Typography>
      <Typography><strong>Start Time:</strong> {fight.start}</Typography>
      <Typography><strong>End Time:</strong> {fight.end}</Typography>
      {/* Add more details here as needed */}
    </Box>
  );
};

export default FightDetails;
