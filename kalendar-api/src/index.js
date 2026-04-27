import express from 'express';
import cors from 'cors';
import plans from './routes/plans.js';
import users from './routes/users.js';
import auth from './routes/auth.js';
import businesses from './routes/businesses.js';
import appointments from './routes/appointments.js';

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map((s) => s.trim());

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

app.get('/api', (req, res) => res.send('Hello World'));
app.use('/api/auth', auth);
app.use('/api/appointments', appointments);
app.use('/api/plans', plans);
app.use('/api/users', users);
app.use('/api/businesses', businesses);

app.listen(PORT, () => {
  console.log(`Kalendar-api listening on http://localhost:${PORT}`);
});
