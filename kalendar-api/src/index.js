import express from 'express';
import plans from './routes/plans.js';
import users from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/plans', plans);
app.use('/api/users', users);

app.get('/api', (req, res) => res.send('Hello World'));

app.listen(PORT, () => {
  console.log(`Kalendar-api listening on http://localhost:${PORT}`);
});
