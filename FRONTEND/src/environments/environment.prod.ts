// src/environments/environment.prod.ts  (production)
// Nginx strips /api prefix before forwarding to Spring Boot :8081
export const environment = {
  production: true,
  apiUrl: '/api'   // relative URL — works with any domain/IP via Nginx proxy
};
