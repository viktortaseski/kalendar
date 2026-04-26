import express from 'express';
import { db } from './dbConn.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api', (req, res) => res.send('Hello World'));

app.listen(PORT, () => {
  console.log(`Kalendar-api listening on http://localhost:${PORT}`);
});
