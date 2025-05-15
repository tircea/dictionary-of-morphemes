import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Divider,
  Paper,
  Modal,
  IconButton,
  Alert
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const ExplanationModal = ({ open, onClose, component }) => {
  if (!component) return null;

  // Определяем, является ли компонент корнем
  const isRoot = Boolean(component.identification_root || component.secondary_root);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="explanation-modal-title"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: 600,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 24,
        p: 4,
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" id="explanation-modal-title">
            {component.identification_prefix || 
             component.identification_root || 
             component.secondary_root ||
             component.identification_suffix}
            {component.allomorph && (
              <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
                Алломорфи: {component.allomorph}
              </Typography>
            )}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box>
          {isRoot ? (
            // Для корней показываем только пример
            component.example && (
              <>
                <Typography variant="h6" gutterBottom>
                  Приклад:
                </Typography>
                <Paper 
                  sx={{ 
                    p: 2,
                    backgroundColor: 'grey.50',
                  }}
                >
                  <Typography>{component.example}</Typography>
                </Paper>
                {component.secondary_example && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Приклад вторинного кореня:
                    </Typography>
                    <Paper 
                      sx={{ 
                        p: 2,
                        backgroundColor: 'grey.50',
                      }}
                    >
                      <Typography>{component.secondary_example}</Typography>
                    </Paper>
                  </>
                )}
              </>
            )
          ) : (
            // Для префиксов и суффиксов показываем объяснение
            component.explanation && (
              <>
                <Typography variant="h6" gutterBottom>
                  Пояснення:
                </Typography>
                <Paper 
                  sx={{ 
                    p: 2,
                    backgroundColor: 'grey.50',
                  }}
                >
                  <Typography>{component.explanation}</Typography>
                </Paper>
              </>
            )
          )}
          
          <Alert severity="info" sx={{ mt: 2, fontSize: '0.875rem' }}>
            Увага! Інформація може бути неточною та потребує перевірки вручну.
          </Alert>
        </Box>
      </Box>
    </Modal>
  );
};

const WordDetails = ({ word }) => {
  const [selectedComponent, setSelectedComponent] = useState(null);

  if (!word) return null;

  const handleComponentClick = (component) => {
    setSelectedComponent(component);
  };

  const getPartOfSpeech = (partOfSpeechCode) => {
    if (!partOfSpeechCode) return 'Невідомо';
    
    const partOfSpeechMap = {
      'NOUN': 'Іменник',
      'ADJF': 'Прикметник',
      'ADJS': 'Короткий прикметник',
      'ADJV': 'Дієприкметник',
      'ADVB': 'Прислівник',
      'VERB': 'Дієслово',
      'PRTF': 'Дієприкметник (активний)',
      'PRTS': 'Дієприкметник (пасивний)',
      'GRND': 'Дієприслівник',
      'NPRO': 'Займенник',
      'PRED': 'Предикатив',
      'PREP': 'Прийменник',
      'CONJ': 'Сполучник',
      'PRCL': 'Частка',
      'INTJ': 'Вигук',
      'NUMR': 'Числівник',
      'INFN': 'Інфінітив',
      'PNCT': 'Пунктуація',
      'LATN': 'Латинський',
      'UNKN': 'Невідомо',
      'ROMN': 'Римські цифри',
    };
    
    
    return partOfSpeechMap[partOfSpeechCode] || partOfSpeechCode;
  };

  const renderComponent = (title, items) => {
    if (!items || items.length === 0) return null;

    return (
      <Paper sx={{ p: 3, mb: 2, borderRadius: 2, boxShadow: 2 }}>
        <Typography 
          variant="h6" 
          color="primary" 
          gutterBottom
          sx={{ 
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            '&::before': {
              content: '""',
              width: 4,
              height: 24,
              backgroundColor: 'primary.main',
              marginRight: 2,
              borderRadius: 1
            }
          }}
        >
          {title}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {items.map((item, index) => (
            <Chip
              key={index}
              label={item.identification_prefix || item.identification_root || item.identification_suffix}
              variant="outlined"
              color="primary"
              onClick={() => handleComponentClick(item)}
              sx={{ 
                m: 0.5,
                borderRadius: 2,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                  transform: 'translateY(-2px)'
                }
              }}
            />
          ))}
        </Box>
      </Paper>
    );
  };

  // Функция для рендера морфологических альтернаций
  const renderMorphologicalAlternation = (morphologicalAlternation) => {
    if (!morphologicalAlternation || morphologicalAlternation.length === 0) return null;

    return (
      <Paper sx={{ p: 3, mb: 2, borderRadius: 2, boxShadow: 2 }}>
        <Typography 
          variant="h6" 
          color="primary" 
          gutterBottom
          sx={{ 
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            '&::before': {
              content: '""',
              width: 4,
              height: 24,
              backgroundColor: 'primary.main',
              marginRight: 2,
              borderRadius: 1
            }
          }}
        >
          Морфологічні альтернації
        </Typography>
        {morphologicalAlternation.map((item, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            {item.morphology_process && (
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                Процес: {item.morphology_process}
              </Typography>
            )}
            {item.meaning && (
              <Typography variant="body2" color="text.secondary">
                Значення: {item.meaning}
              </Typography>
            )}
            {item.explanation && (
              <Typography variant="body2" color="text.secondary">
                Пояснення: {item.explanation}
              </Typography>
            )}
          </Box>
        ))}
      </Paper>
    );
  };

  return (
    <>
      <Card 
        sx={{ 
          mt: 3,
          borderRadius: 2,
          overflow: 'visible',
          boxShadow: theme => `0 8px 24px ${theme.palette.primary.main}15`
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography 
            variant="h4" 
            component="div" 
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              textAlign: 'center',
              mb: 3
            }}
          >
            {word.basic_word}
          </Typography>
          
          <Box sx={{ 
            backgroundColor: 'grey.50',
            p: 2,
            borderRadius: 2,
            mb: 3
          }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 500,
                color: 'text.secondary'
              }}
            >
              Розділене слово: {word.split_word}
            </Typography>

            <Typography 
              sx={{ 
                mt: 1,
                fontWeight: 500,
                color: 'text.secondary'
              }}
            >
              Частина мови: {getPartOfSpeech(word.part_of_speech_name)}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {renderComponent('Префікси', word.prefixes)}
          {renderComponent('Корені', word.roots)}
          {renderComponent('Суфікси', word.suffixes)}
          {renderMorphologicalAlternation(word.morphologicalAlternation)}

          {word.gender && (
            <Box sx={{ 
              mt: 3,
              p: 2,
              backgroundColor: 'grey.50',
              borderRadius: 2
            }}>
              <Typography 
                sx={{ 
                  fontWeight: 500,
                  color: 'text.secondary'
                }}
              >
                Рід: {word.gender === 1 ? 'чоловічий' : word.gender === 2 ? 'жіночий' : 'середній'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <ExplanationModal
        open={!!selectedComponent}
        onClose={() => setSelectedComponent(null)}
        component={selectedComponent}
      />
    </>
  );
};

export default WordDetails; 