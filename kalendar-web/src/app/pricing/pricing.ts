import { Component } from '@angular/core';
import { PricingCard, type Plan } from './pricing-card/pricing-card';

@Component({
  selector: 'app-pricing',
  imports: [PricingCard],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss',
})
export class Pricing {
  plans: Plan[] = [
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

  faqs = [
    {
      q: 'Can I switch plans later?',
      a: 'Yes — upgrade or downgrade any time from your dashboard. Changes prorate automatically.',
    },
    {
      q: 'What counts as a staff calendar?',
      a: 'Each employee or resource (chair, room, machine) that takes bookings is one calendar.',
    },
    {
      q: 'Is there a setup fee?',
      a: "Never. The price you see is the price you pay, and the first 14 days are completely free.",
    },
    {
      q: 'Do you offer refunds?',
      a: 'Yes. We offer a 30-day money-back guarantee on all paid plans, no questions asked.',
    },
  ];
}
