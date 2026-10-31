/**
 * routes/data.js
 * Tranzaksiya/byudjet/maqsad/kategoriya/profil/import — barchasi hisobga kirishni talab qiladi.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { transactions, budgets, goals, categories, profile, importLocalData } from '../controllers/dataController.js';

export const dataRouter = Router();
dataRouter.use(requireAuth);

dataRouter.get('/transactions', transactions.list);
dataRouter.post('/transactions', transactions.create);
dataRouter.patch('/transactions/:id', transactions.update);
dataRouter.delete('/transactions/:id', transactions.remove);

dataRouter.get('/budgets', budgets.list);
dataRouter.post('/budgets', budgets.create);
dataRouter.patch('/budgets/:id', budgets.update);
dataRouter.delete('/budgets/:id', budgets.remove);

dataRouter.get('/goals', goals.list);
dataRouter.post('/goals', goals.create);
dataRouter.patch('/goals/:id', goals.update);
dataRouter.delete('/goals/:id', goals.remove);

dataRouter.get('/categories', categories.list);

dataRouter.get('/profile', profile.get);
dataRouter.patch('/profile', profile.update);

dataRouter.post('/import', importLocalData);
