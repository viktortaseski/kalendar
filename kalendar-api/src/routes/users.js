import { Router } from 'express';
import { db } from '../dbConn.js';

const users = Router();

users.get('/', (req, res) => {
  res.json(console.log("Hello From Users"))
});

export default users;
