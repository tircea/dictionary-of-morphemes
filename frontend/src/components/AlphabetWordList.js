import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Button,
  Divider,
  Chip,
  Grid,
  useTheme
} from '@mui/material';
import { getWordsByLetter } from '../api';

const ukrainianAlphabet = ['а', 'б', 'в', 'г', 'ґ', 'д', 'е', 'є', 'ж', 'з', 'и', 'і', 'ї', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ь', 'ю', 'я'];

const AlphabetWordList = ({ onWordSelect }) => {
  const [selectedLetter, setSelectedLetter] = useState('');
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  const theme = useTheme();

  const loadWords = useCallback(async (letter, pageNum = 0, append = false) => {
    if (!letter) return;
    
    try {
      setLoading(true);
      const result = await getWordsByLetter(letter, pageNum);
      
      if (append) {
        setWords(prev => [...prev, ...result.words]);
      } else {
        setWords(result.words);
        window.scrollTo(0, 0);
      }
      
      setHasMore(result.words.length === 100);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading words by letter:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLetter) {
      loadWords(selectedLetter);
    }
  }, [selectedLetter, loadWords]);

  const lastWordElementRef = useCallback(node => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadWords(selectedLetter, page + 1, true);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, selectedLetter, page, loadWords]);

  const handleLetterSelect = (letter) => {
    setSelectedLetter(letter);
    setPage(0);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'center'
        }}
      >
        <Typography variant="subtitle1" sx={{ width: '100%', textAlign: 'center', mb: 1 }}>
          Оберіть літеру:
        </Typography>
        {ukrainianAlphabet.map((letter) => (
          <Chip
            key={letter}
            label={letter.toUpperCase()}
            onClick={() => handleLetterSelect(letter)}
            color={selectedLetter === letter ? "primary" : "default"}
            variant={selectedLetter === letter ? "filled" : "outlined"}
            sx={{ 
              minWidth: '36px',
              height: '36px',
              fontSize: '14px',
              fontWeight: 'bold',
              '& .MuiChip-label': {
                padding: '0px 8px',
                overflow: 'visible'
              },
              '&:hover': {
                backgroundColor: selectedLetter === letter ? theme.palette.primary.main : theme.palette.grey[300]
              }
            }}
          />
        ))}
      </Paper>

      {selectedLetter && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Слова на літеру "{selectedLetter.toUpperCase()}"
          </Typography>
          
          {words.length === 0 && !loading ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Немає слів, що починаються на цю літеру
            </Typography>
          ) : (
            <List>
              {words.map((word, index) => {
                if (index === words.length - 5) {
                  return (
                    <ListItem 
                      key={word.id} 
                      ref={lastWordElementRef}
                      button 
                      onClick={() => onWordSelect(word)}
                      divider
                    >
                      <ListItemText 
                        primary={word.basic_word}
                        secondary={word.split_word} 
                      />
                    </ListItem>
                  );
                } else {
                  return (
                    <ListItem 
                      key={word.id} 
                      button 
                      onClick={() => onWordSelect(word)}
                      divider
                    >
                      <ListItemText 
                        primary={word.basic_word}
                        secondary={word.split_word} 
                      />
                    </ListItem>
                  );
                }
              })}

              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={32} />
                </Box>
              )}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default AlphabetWordList; 