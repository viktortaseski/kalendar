import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  features = [
    {
      icon: '📅',
      title: 'Always-on booking',
      body: 'Customers book 24/7 from any device. No more missed calls or after-hours emails.',
    },
    {
      icon: '⏰',
      title: 'Smart reminders',
      body: 'Automatic SMS + email reminders cut no-shows by up to 70%.',
    },
    {
      icon: '👥',
      title: 'Multi-staff calendars',
      body: 'Each employee gets their own schedule — bookings sync across the whole team.',
    },
    {
      icon: '💳',
      title: 'Take payments upfront',
      body: 'Optional deposits or full payments at booking. Stripe-powered.',
    },
    {
      icon: '📊',
      title: 'Insights that matter',
      body: 'See peak hours, popular services, and which staff members are crushing it.',
    },
    {
      icon: '🎨',
      title: 'Your brand, your way',
      body: 'Custom domain, colors, and logo. Looks like your site, runs like ours.',
    },
  ];

  steps = [
    {
      num: '01',
      title: 'Pick a plan',
      body: 'Choose Basic for small teams or Premium when you need more horsepower. Free for 14 days.',
    },
    {
      num: '02',
      title: 'Set your hours',
      body: 'Add staff, services, and availability. We handle time zones, breaks, and holidays.',
    },
    {
      num: '03',
      title: 'Share your link',
      body: "Drop your custom booking link on Instagram, your website, or business cards. You're live.",
    },
  ];

  days = [
    { n: 31, muted: true },
    ...Array.from({ length: 30 }, (_, i) => ({ n: i + 1, muted: false })),
  ];
}
