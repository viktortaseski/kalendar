import { Component, input } from '@angular/core';

export type Plan = {
  type: string;
  price: number;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
};

@Component({
  selector: 'app-pricing-card',
  imports: [],
  templateUrl: './pricing-card.html',
  styleUrl: './pricing-card.scss',
})
export class PricingCard {
  plan = input.required<Plan>();
}
