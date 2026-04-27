import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink],
  templateUrl: './pricing-card.html',
  styleUrl: './pricing-card.scss',
})
export class PricingCard {
  plan = input.required<Plan>();
}
