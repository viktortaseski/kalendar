import { Router } from 'express';
import { db } from '../dbConn.js';

const users = Router();

users.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM users');
  res.json(result.rows);
});

export default users;
