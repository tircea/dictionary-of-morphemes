import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  Book as BookIcon,
  KeyboardArrowRight as ArrowIcon
} from '@mui/icons-material';
import SearchBar from './components/SearchBar';
import WordDetails from './components/WordDetails';
import ComponentSearch from './components/ComponentSearch';
import Suggestions from './components/Suggestions';
import { searchWord } from './api';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      marginBottom: '1rem'
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      marginBottom: '0.75rem'
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      marginBottom: '0.75rem'
    }
  },
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dictionary-tabpanel-${index}`}
      aria-labelledby={`dictionary-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DictionaryInfo = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Paper sx={{ p: 4, mt: 3 }}>
      <Typography variant="h1">Словник українських морфем</Typography>
      
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mt: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Про словник" />
        <Tab label="Членування слів" />
        <Tab label="Морфеми у слові" />
        <Tab label="Вторинні морфеми" />
        <Tab label="Правила поділу слів" />
        <Tab label="Як користуватися словником" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Typography variant="h2" sx={{ mt: 2 }}>Про словник</Typography>
        <Typography paragraph>
          У словнику подано близько 40 000 слів з різних галузей знань, поділених на морфеми. 
          Описано майже всі відомі в українській мові префіксальні, суфіксальні та кореневі морфеми, 
          наведено приклади слів, утворених нерегулярним способом, чергувань голосних і приголосних, 
          компоненти складних слів.
        </Typography>

        <Typography variant="h3" sx={{ mt: 3 }}>Призначення</Typography>
        <Typography paragraph>
          Словник призначений для студентів вищих і середніх спеціальних навчальних закладів, 
          викладачів, вчителів і учнів загальноосвітніх шкіл, усіх, хто вивчає українську мову 
          як рідну та пізнає її як іноземну.
        </Typography>
        
        <Typography variant="h3" sx={{ mt: 3 }}>Рекомендовано</Typography>
        <Typography paragraph>
          "Рекомендовано Міністерством освіти України" (Прот. №259 від 26.02.93 р.)
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="h3">Бібліографічні відомості</Typography>
          <Typography paragraph>
            Полюга Л.М. Словник українських морфем. — Львів: Світ, 2001. — 448 с.
          </Typography>
          <Typography paragraph>
            ISBN 966-603-105-1.
          </Typography>
        </Box>
      </TabPanel>


      <TabPanel value={tabValue} index={1}>
        <Typography variant="h2">Членування слів на морфеми</Typography>
        <Typography paragraph>
          Морфеми можна виділити лише у слові, де вони існують, мають значення і змінюються. 
          Фонетичні та морфологічні зміни, які відбуваються в середині слів, сприяють 
          виникненню різних варіантів морфем. Наприклад, у чотирьох словах стóл/ик, стол/óв/ий, 
          стіл, стíль/ч/ик виділяється три варіанти одної морфеми: стол/, стіл/, стіль/.
        </Typography>

        <Typography variant="h3" sx={{ mt: 3 }}>Найлегший спосіб поділу слів</Typography>
        <Typography paragraph>
          Найлегший і найпростіший спосіб поділу слів на морфеми — повторюваність морфем, 
          які мають в різних словах однакове значення. Кореневу морфему можна виділити, 
          якщо у мові є ще хоч одне слово з такою ж однозначною кореневою морфемою.
        </Typography>

        <Typography variant="h3" sx={{ mt: 3 }}>Чергування фонем</Typography>
        <Typography paragraph>
          Чергування фонем в українській мові зумовлює заміну в окремих морфемах одних голосних або 
          приголосних іншими. Явище чергування найбільше впливає на виникнення фонетичної варіантності морфем. 
          При чергуванні фонем у морфемах ніколи не утворюється нова морфема, не змінюється значення морфем: 
          виникає лише новий фонетичний варіант тої чи іншої морфеми.
        </Typography>
      </TabPanel>


      <TabPanel value={tabValue} index={2}>
        <Typography variant="h2">Морфеми у слові</Typography>
        <Typography paragraph>
          Серед морфем розрізняють морфеми кореневі (корінь слова), афіксальні (префікси та суфікси), 
          флективні (закінчення). Виділення окремих морфем проводиться на основі певних закономірностей. 
          Адже у словах історично відбуваються відчутні зміни, які впливають на зменшення або збільшення 
          кореневих морфем.
        </Typography>

        <Typography variant="h3" sx={{ mt: 3 }}>Причини появи варіантів морфем</Typography>
        <Typography paragraph>
          Можна визначити три основні причини, що сприяють появі варіантів морфем:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>чергування звуків у морфемах і на морфемному шві</li>
          <li>часткове або повне накладання морфем</li>
          <li>їх усічення</li>
        </Box>

        <Typography paragraph>
          Найчастіше нові варіанти морфем виникають унаслідок чергування. Чергування сприяє утворенню 
          кореневих, суфіксальних і префіксальних варіантів.
        </Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Typography variant="h2">Вторинні морфеми</Typography>
        <Typography paragraph>
          Стрімкий розвиток суспільства позначається і на розвитку мови та значень слів, а також впливає 
          на зміни у складі морфем. У таких умовах процеси перерозкладу, ускладнення і спрощення у морфемах 
          відбуваються у більшій кількості й швидше. Внаслідок спрощення, перерозкладу основи відбувається 
          переміщення частини або цілої морфеми до іншої.
        </Typography>

        <Typography paragraph>
          Під вторинним коренем треба розуміти таку спільну етимологічно споріднену словотворчу частину слів, 
          яка вже не поділяється на менші словотворчі частини без втрати суцільності свого лексико-семантичного 
          значення.
        </Typography>

        <Typography variant="h3" sx={{ mt: 3 }}>Поява вторинних морфем</Typography>
        <Typography paragraph>
          Поява вторинних морфем — процес незворотний. У деяких словах він уже завершився, в інших — ще триває, 
          а ще в інших — може виявитися, бо навіть тепер у мові відбувається оновлення значень, а отже, і морфем.
        </Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Typography variant="h2">Критерії виділення морфем</Typography>
        <Typography paragraph>
          Критерій виділення морфем за значенням можна вважати основним. Він допомагає визначити спорідненість 
          або неспорідненість слів, виявити, чи вони походять від одного кореня. Другим критерієм членування є 
          формальний критерій повторюваності морфем у словах.
        </Typography>

        <Typography variant="h3" sx={{ mt: 3 }}>Членування морфем у запозичених словах</Typography>
        <Typography paragraph>
          Певні труднощі у членування морфем вносять слова, запозичені з інших слов'янських мов, особливо 
          якщо ці слова мають корені, подібні до слів української мови і наближені за значеннями. Такі слова 
          в сучасній українській мові виступають з неподільними коренями.
        </Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <Typography variant="h2">Як користуватися словником</Typography>
        
        <Typography variant="h3" sx={{ mt: 3 }}>Про реєстр словника</Typography>
        <Typography paragraph>
          До реєстру словника внесені лише ті слова, які за чинним українським правописом пишуться разом. 
          У словнику членуються на морфеми загальновживані, найпоширеніші слова. Крім стилістично нейтральних, 
          у реєстрі представлені й слова розмовного плану.
        </Typography>

        <Typography variant="h3" sx={{ mt: 3 }}>Обмеження реєстру</Typography>
        <Typography paragraph>
          Обмежено подаються у словнику:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>слова — назви рослин, більшість назв тварин, птахів</li>
          <li>назви хвороб, більшість звуконаслідувальних слів</li>
          <li>іменники віддієслівного походження на -ння і прикметникового на -ість</li>
          <li>іменники жіночого роду з суфіксом -к- (назви осіб жіночої статі)</li>
          <li>дієслова з суфіксом -ся, якщо поряд є дієслова такої самої морфемної будови без -ся</li>
        </Box>

        <Typography variant="h3" sx={{ mt: 3 }}>Умовні знаки</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box component="ul" sx={{ mb: 3 }}>
              <li>. (крапка) — ставиться після скорочених слів</li>
              <li>, (кома) — розділяє варіанти морфем</li>
              <li>/ (похила риска) — розділяє морфеми слова</li>
              <li>( [(круглі дужки) — у них подається додаткова інформація</li>
              <li>~ (тильда) — ставиться перед кінцевою частиною слова у додатковій інформації</li>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box component="ul" sx={{ mb: 3 }}>
              <li>ʼ (наголос) — ставиться на всіх дво- і більше складових словах</li>
              <li>[ ](квадратні дужки) — у них подають частину морфеми, яка транскрибується</li>
              <li>↔ (стрілки) — вказують на взаємодію або повне чи часткове накладання морфем</li>
              <li>' (пом'якшення) — вказує на пом'якшення попередньої приголосної</li>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="text" 
          color="primary" 
          disabled={tabValue === 0} 
          onClick={() => setTabValue(prevValue => prevValue - 1)}
          startIcon={<ArrowIcon sx={{ transform: 'rotate(180deg)' }} />}
        >
          Попередній розділ
        </Button>
        <Button 
          variant="text" 
          color="primary" 
          disabled={tabValue === 5} 
          onClick={() => setTabValue(prevValue => prevValue + 1)}
          endIcon={<ArrowIcon />}
        >
          Наступний розділ
        </Button>
      </Box>
    </Paper>
  );
};

function App() {
  const [searchMode, setSearchMode] = useState('word');
  const [wordDetails, setWordDetails] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentView, setCurrentView] = useState('search');

  const handleSearch = async (searchTerm) => {
    try {
      const result = await searchWord(searchTerm);
      if (result.found) {
        setWordDetails(result.word);
        setSuggestions([]);
      } else {
        setWordDetails(null);
        setSuggestions(result.suggestions);
      }
      return result;
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleWordSelect = (word) => {
    setWordDetails(word);
    setSuggestions([]);
    setSearchMode('word');
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const menuItems = [
    { text: 'Пошук', icon: <SearchIcon />, view: 'search' },
    { text: 'Про словник', icon: <InfoIcon />, view: 'info' }
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed">
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Морфологічний аналізатор
            </Typography>
          </Toolbar>
        </AppBar>

        <Drawer
          variant="temporary"
          anchor="left"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          sx={{
            width: 240,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 240,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          <Divider />
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.text}
                onClick={() => {
                  setCurrentView(item.view);
                  setDrawerOpen(false);
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: '100%',
            minHeight: '100vh',
            backgroundColor: 'background.default',
            mt: 8
          }}
        >
          {currentView === 'search' ? (
            <Container maxWidth="lg">
              <SearchBar 
                onSearch={handleSearch}
                searchMode={searchMode}
                onModeChange={setSearchMode}
              />
              
              <Suggestions 
                suggestions={suggestions}
                onSuggestionClick={handleSearch}
              />

              {searchMode === 'word' ? (
                <WordDetails word={wordDetails} />
              ) : (
                <ComponentSearch onWordSelect={handleWordSelect} />
              )}
            </Container>
          ) : (
            <Container maxWidth="lg">
              <DictionaryInfo />
            </Container>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App; 