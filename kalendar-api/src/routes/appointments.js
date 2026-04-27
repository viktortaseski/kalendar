import { Router } from 'express';
import { db } from '../dbConn.js';

const appointments = Router();

appointments.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM appointments');
  res.json(result.rows);
});

appointments.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const result = await db.query('SELECT * FROM appointments WHERE customer_id = $1', [userId]);
  res.json(result.rows);
});

export default appointments;
