const express = require('express');
const cors = require('cors');
const { setupRoutes } = require('./routes');
const { initializeDatabase } = require('./database');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

initializeDatabase();

setupRoutes(app);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 