import express, { type Request, type Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

type Plan = {
  type: string;
  price: number;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
};

const plans: Plan[] = [
  {
    type: 'Basic',
    price: 19,
    description: 'For solo practitioners and small shops getting started.',
    features: [
      'Up to 2 staff calendars',
      'Unlimited appointments',
      'Email reminders',
      'Custom booking page',
      'Basic analytics',
    ],
    cta: 'Start free trial',
    featured: false,
  },
  {
    type: 'Premium',
    price: 49,
    description: 'For growing teams that need more power and polish.',
    features: [
      'Up to 15 staff calendars',
      'Unlimited appointments',
      'SMS + email reminders',
      'Custom domain & branding',
      'Advanced analytics',
      'Stripe payments',
      'Priority support',
    ],
    cta: 'Start free trial',
    featured: true,
  },
];

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'kalendar-api' });
});

app.get('/api/plans', (_req: Request, res: Response) => {
  res.json(plans);
});

app.post('/api/bookings', (req: Request, res: Response) => {
  const { name, slot } = req.body ?? {};
  if (!name || !slot) {
    return res.status(400).json({ error: 'name and slot are required' });
  }
  res.status(201).json({
    id: crypto.randomUUID(),
    name,
    slot,
    createdAt: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✔ kalendar-api listening on http://localhost:${PORT}`);
});
