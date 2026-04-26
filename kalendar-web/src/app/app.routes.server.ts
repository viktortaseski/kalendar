import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Render everything in the browser. Dynamic routes (`/businesses/:slug`,
  // `/dashboard`, etc.) need API/auth data at runtime, so prerender doesn't fit.
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
