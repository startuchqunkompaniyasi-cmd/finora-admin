/**
 * routes/exchange.js
 */

import { Router } from 'express';
import { getRates, getRatesHistory, convert } from '../controllers/exchangeController.js';

export const exchangeRouter = Router();

exchangeRouter.get('/rates', getRates);
exchangeRouter.get('/rates/history', getRatesHistory);
exchangeRouter.get('/convert', convert);
