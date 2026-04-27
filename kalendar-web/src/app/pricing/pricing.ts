import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PricingCard } from './pricing-card/pricing-card';
import { PlanService } from '../services/plan.service';

@Component({
  selector: 'app-pricing',
  imports: [PricingCard],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss',
})
export class Pricing {
  private planService = inject(PlanService);

  plans = toSignal(this.planService.list(), { initialValue: [] });

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
