/**
 * server/middleware/security.js
 * Helmet asosida qatʼiy HTTP xavfsizlik sarlavhalari (CSP, HSTS va h.k.).
 * Ilova hech qanday tashqi CDN'dan skript/uslub yuklamaydi (Chart.js lokal serverdan
 * beriladi), shuning uchun CSP juda tor qilib yozilgan: faqat 'self'.
 */

import helmet from 'helmet';
import { env } from '../config/env.js';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: env.isProduction ? [] : null,
    },
  },
  // Faqat ishlab chiqarishda (HTTPS ostida) yoqiladi — lokal http://localhost'da
  // HSTS brauzerni keyinchalik HTTPS talab qilishga majburlab, ishlanmani buzishi mumkin.
  hsts: env.isProduction,
  // Chart.js UMD bundle'i embedder policy bilan toʻqnashmasligi uchun oʻchirilgan.
  crossOriginEmbedderPolicy: false,
});
