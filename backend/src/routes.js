const { 
  searchWord, 
  searchSimilarWords, 
  searchByComponent, 
  getAllComponents,
  getWordsByLetter,
  sanitizeWord,
  getTopComponents
} = require('./database');

function setupRoutes(app) {
  app.get('/api/word/:word', async (req, res) => {
    try {
      const word = req.params.word;
      const sanitizedWord = sanitizeWord(word);
      const result = await searchWord(sanitizedWord);
      
      if (!result) {
        const similarWords = await searchSimilarWords(sanitizedWord);
        res.json({ 
          found: false, 
          suggestions: similarWords.map(w => w.sanitized_word)
        });
      } else {
        res.json({ 
          found: true, 
          word: result 
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/search/:type/:id', async (req, res) => {
    try {
      const { type, id } = req.params;
      const result = await searchByComponent(type, id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/words/letter/:letter', async (req, res) => {
    try {
      const { letter } = req.params;
      const page = parseInt(req.query.page) || 0;
      const limit = parseInt(req.query.limit) || 100;
      
      const result = await getWordsByLetter(letter, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/components/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const components = await getAllComponents(type);
      res.json({ components });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/top-components', async (req, res) => {
    try {
      const topComponents = await getTopComponents();
      res.json(topComponents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = { setupRoutes }; 