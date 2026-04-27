import { Router } from 'express';
import { db } from '../dbConn.js';

const appointments = Router();

appointments.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM appointments');
  res.json(result.rows);
});


// Returns appointments for given customer with employee names included
appointments.get('/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const result = await db.query(
    `SELECT a.*, e.name AS employee_name
     FROM appointments a
     LEFT JOIN employees e ON e.id = a.employee_id
     WHERE a.customer_id = $1`,
    [customerId]
  );
  res.json(result.rows);
});

export default appointments;
