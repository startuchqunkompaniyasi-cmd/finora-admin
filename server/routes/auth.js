/**
 * routes/auth.js
 */

import { Router } from 'express';
import { register, login, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', requireAuth, logout);
authRouter.get('/me', me);
