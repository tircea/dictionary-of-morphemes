import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { getAllComponents, searchByComponent } from '../api';

// Convert to use forwardRef to access methods from parent component
const ComponentSearch = forwardRef(({ onWordSelect }, ref) => {
  const [componentType, setComponentType] = useState('prefix');
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState('');
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComponents();
  }, [componentType]);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const result = await getAllComponents(componentType);
      setComponents(result?.components || []);
      setSelectedComponent('');
      setWords([]);
    } catch (error) {
      console.error('Error loading components:', error);
      setComponents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleComponentSelect = async (id) => {
    try {
      setSelectedComponent(id);
      setLoading(true);
      const result = await searchByComponent(componentType, id);
      setWords(result?.words || []);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error searching by component:', error);
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  // Expose methods to parent components through ref
  useImperativeHandle(ref, () => ({
    selectComponent: (type, id) => {
      // Set the component type first
      setComponentType(type);
      
      // Instead of relying on the state update, use the passed type directly
      const loadAndSelectComponent = async () => {
        try {
          setLoading(true);
          
          // First load components for this type
          const result = await getAllComponents(type);
          setComponents(result?.components || []);
          
          // Then select the specific component
          setSelectedComponent(id);
          
          // Finally, search with the component
          const searchResult = await searchByComponent(type, id);
          setWords(searchResult?.words || []);
          window.scrollTo(0, 0);
        } catch (error) {
          console.error('Error in loadAndSelectComponent:', error);
        } finally {
          setLoading(false);
        }
      };
      
      // Start the loading process
      loadAndSelectComponent();
    }
  }));

  const getMorphologicalPreview = (word) => {
    if (!word.morphologicalAlternation || word.morphologicalAlternation.length === 0) {
      return null;
    }
    const firstProcess = word.morphologicalAlternation[0].morphology_process;
    if (!firstProcess) return null;
    
    return firstProcess;
  };

  const getSecondaryRootInfo = (word) => {
    if (!word.roots || word.roots.length === 0) {
      return null;
    }
    
    const rootsWithSecondary = word.roots.filter(root => root.secondary_root);
    if (rootsWithSecondary.length === 0) {
      return null;
    }
    
    return rootsWithSecondary.map(root => root.secondary_root).join(', ');
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Тип компонента</InputLabel>
            <Select
              value={componentType}
              label="Тип компонента"
              onChange={(e) => setComponentType(e.target.value)}
            >
              <MenuItem value="prefix">Префікс</MenuItem>
              <MenuItem value="root">Корінь</MenuItem>
              <MenuItem value="suffix">Суфікс</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', minHeight: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Доступні компоненти
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {Array.isArray(components) && components.map((component) => (
                    <ListItem
                      key={component.id}
                      button
                      selected={selectedComponent === component.id}
                      onClick={() => handleComponentSelect(component.id)}
                    >
                      <ListItemText 
                        primary={component.identification_prefix || 
                                component.identification_root || 
                                component.identification_suffix}
                        secondary={component.explanation}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', minHeight: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Знайдені слова
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {Array.isArray(words) && words.map((word) => {
                    const morphologicalPreview = getMorphologicalPreview(word);
                    const secondaryRootInfo = componentType === 'root' ? getSecondaryRootInfo(word) : null;
                    
                    return (
                      <ListItem
                        key={word.id}
                        button
                        onClick={() => onWordSelect(word)}
                      >
                        <ListItemText 
                          primary={word.basic_word}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary">
                                {word.split_word}
                              </Typography>
                              {secondaryRootInfo && (
                                <Typography component="span" variant="body2" color="primary.main" sx={{ display: 'block', mt: 0.5, fontWeight: 500 }}>
                                  Варіант головного кореня: {secondaryRootInfo}
                                </Typography>
                              )}
                              {morphologicalPreview && (
                                <Tooltip title="Морфологічна альтернація">
                                  <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Процес: {morphologicalPreview}
                                  </Typography>
                                </Tooltip>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
});

export default ComponentSearch; 