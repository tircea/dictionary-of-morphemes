const { 
  searchWord, 
  searchSimilarWords, 
  searchByComponent, 
  getAllComponents,
  sanitizeWord
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
      const words = await searchByComponent(type, id);
      res.json({ words });
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
}

module.exports = { setupRoutes }; 