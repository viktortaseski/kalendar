import { Router } from 'express';
import { db } from '../dbConn.js';

const plans = Router();

plans.get('/', (req, res) => {
  db.query("SELECT * FROM plans")
    .then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

export default plans;
