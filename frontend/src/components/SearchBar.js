import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  InputBase, 
  IconButton, 
  Box,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

const SearchBar = ({ onSearch, searchMode, onModeChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  useEffect(() => {
    if (!searchTerm.trim()) return;

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const newTimeout = setTimeout(() => {
      setIsLoading(true);
      onSearch(searchTerm.trim())
        .finally(() => setIsLoading(false));
    }, 300);

    setTypingTimeout(newTimeout);

    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [searchTerm]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setIsLoading(true);
      onSearch(searchTerm.trim())
        .finally(() => setIsLoading(false));
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={searchMode}
          exclusive
          onChange={(e, newMode) => newMode && onModeChange(newMode)}
          aria-label="search mode"
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 500,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                }
              }
            }
          }}
        >
          <ToggleButton value="word" aria-label="word search">
            Пошук за словом
          </ToggleButton>
          <ToggleButton value="component" aria-label="component search">
            Пошук за компонентами
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          boxShadow: 3,
          borderRadius: 2,
          backgroundColor: 'white',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: 6,
          },
          height: 56,
          position: 'relative'
        }}
      >
        <InputBase
          sx={{ ml: 2, flex: 1 }}
          placeholder={searchMode === 'word' ? "Введіть слово..." : "Введіть компонент..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Box sx={{ 
          width: 56, 
          height: 56, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative'
        }}>
          {isLoading ? (
            <CircularProgress size={24} />
          ) : (
            <IconButton sx={{ p: '10px' }} aria-label="search" type="submit">
              <SearchIcon />
            </IconButton>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default SearchBar; 