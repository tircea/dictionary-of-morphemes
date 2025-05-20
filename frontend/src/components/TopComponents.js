import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import { getTopComponents } from '../api';

// Cache key for localStorage
const CACHE_KEY = 'topComponents';
const CACHE_EXPIRATION = 1000 * 60 * 60; // 1 hour in milliseconds

const TopComponents = ({ onComponentSelect }) => {
  const [topComponents, setTopComponents] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTopComponents = useCallback(async () => {
    try {
      // Check if we have cached data
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        // Check if data is still valid (not expired)
        if (timestamp && Date.now() - timestamp < CACHE_EXPIRATION) {
          setTopComponents(data);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data if no cache or expired
      const response = await getTopComponents();
      
      // Cache the results
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: response,
          timestamp: Date.now()
        })
      );
      
      setTopComponents(response);
    } catch (error) {
      console.error('Error fetching top components:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopComponents();
  }, [fetchTopComponents]);

  const handleComponentClick = (type, id) => {
    if (onComponentSelect) {
      onComponentSelect(type, id);
    }
  };

  const renderComponentList = (title, components, type) => {
    if (!components || components.length === 0) return null;
    
    // Create a unique set of components based on their identification field
    const uniqueComponents = [];
    const seenIdentifiers = new Set();
    const MAX_DISPLAY_ITEMS = 5;
    
    components.forEach(component => {
      const label = component.identification_prefix || 
                  component.identification_root || 
                  component.identification_suffix;
      
      // Add to unique list if not seen before and we haven't reached the display limit
      if (label && !seenIdentifiers.has(label) && uniqueComponents.length < MAX_DISPLAY_ITEMS) {
        seenIdentifiers.add(label);
        uniqueComponents.push(component);
      }
    });
    
    return (
      <Grid item xs={12} md={4}>
        <Box sx={{ height: '100%' }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              fontWeight: 500,
              color: 'primary.main',
              borderBottom: '2px solid',
              borderColor: 'primary.light',
              pb: 1
            }}
          >
            {title}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {uniqueComponents.map((component) => {
              const label = component.identification_prefix || 
                          component.identification_root || 
                          component.identification_suffix;
              
              return (
                <Chip
                  key={component.id}
                  label={`${label} (${component.count})`}
                  onClick={() => handleComponentClick(type, component.id)}
                  variant="outlined"
                  color="primary"
                  sx={{ 
                    justifyContent: 'space-between',
                    mb: 1,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'white',
                      transform: 'translateY(-2px)'
                    }
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        py: 4 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 4, mb: 4, borderRadius: 2 }}>
      <Typography 
        variant="h5" 
        gutterBottom 
        sx={{ 
          textAlign: 'center',
          fontWeight: 600,
          mb: 3
        }}
      >
        Найпоширеніші компоненти
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {renderComponentList('Префікси', topComponents?.prefixes, 'prefix')}
        {renderComponentList('Корені', topComponents?.roots, 'root')}
        {renderComponentList('Суфікси', topComponents?.suffixes, 'suffix')}
      </Grid>
    </Paper>
  );
};

export default TopComponents; 