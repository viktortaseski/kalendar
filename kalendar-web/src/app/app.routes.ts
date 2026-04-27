import { Routes } from '@angular/router';
import { Pricing } from './pricing/pricing';
import { Home } from './home/home';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Dashboard } from './dashboard/dashboard';
import { Businesses } from './businesses/businesses';
import { BusinessDetail } from './businesses/business-detail';
import { BusinessCreate } from './businesses/business-create';
import { BusinessManage } from './businesses/business-manage';
import { Settings } from './settings/settings';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { MyAppointments } from './my-appointments/my-appointments';
import { MyJob } from './my-jobs/my-job';
import { Inbox } from './inbox/inbox';

export const routes: Routes = [
  { path: '', component: Home, canActivate: [guestGuard] },
  { path: 'pricing', component: Pricing, canActivate: [guestGuard] },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Register, canActivate: [guestGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'settings', component: Settings, canActivate: [authGuard] },
  { path: 'my-appointments', component: MyAppointments, canActivate: [authGuard] },
  { path: 'my-jobs/:slug', component: MyJob, canActivate: [authGuard] },
  { path: 'inbox', component: Inbox, canActivate: [authGuard] },
  { path: 'businesses', component: Businesses },
  { path: 'businesses/new', component: BusinessCreate, canActivate: [authGuard] },
  { path: 'businesses/:slug', component: BusinessDetail },
  { path: 'businesses/:slug/manage', component: BusinessManage, canActivate: [authGuard] },
];
