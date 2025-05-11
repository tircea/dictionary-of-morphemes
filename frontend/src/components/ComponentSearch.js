import React, { useState, useEffect } from 'react';
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
  CircularProgress
} from '@mui/material';
import { getAllComponents, searchByComponent } from '../api';

const ComponentSearch = ({ onWordSelect }) => {
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
      setWords(result?.words?.words || []);
    } catch (error) {
      console.error('Error searching by component:', error);
      setWords([]);
    } finally {
      setLoading(false);
    }
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
                  {Array.isArray(words) && words.map((word) => (
                    <ListItem
                      key={word.id}
                      button
                      onClick={() => onWordSelect(word)}
                    >
                      <ListItemText 
                        primary={word.basic_word}
                        secondary={word.split_word}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ComponentSearch; 