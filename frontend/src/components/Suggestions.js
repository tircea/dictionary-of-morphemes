import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper
} from '@mui/material';

const Suggestions = ({ suggestions, onSuggestionClick }) => {
  if (!suggestions || suggestions.length === 0) return null;
  
  return (
    <Paper sx={{ mt: 2, p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Можливо, ви мали на увазі:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {suggestions.map((suggestion, index) => (
          <Chip
            key={index}
            label={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            variant="outlined"
            clickable
            color="primary"
          />
        ))}
      </Box>
    </Paper>
  );
};

export default Suggestions; 