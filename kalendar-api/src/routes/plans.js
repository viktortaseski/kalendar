import { Router } from 'express';

const plans = Router();

plans.get('/', (req, res) => {
  res.send(req, "Hello from plans")
});

export default plans;
