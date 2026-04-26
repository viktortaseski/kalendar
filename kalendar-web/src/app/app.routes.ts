import { Routes } from '@angular/router';
import { Pricing } from './pricing/pricing';
import { Home } from './home/home';

export const routes: Routes = [
  {path: '', component: Home},
  { path: 'pricing', component: Pricing },
];
