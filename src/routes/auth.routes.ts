import { Router } from 'express';
import { authLimiter, tokenLimiter } from '../middlewares/rateLimit.middleware';
import * as authController from '../controllers/auth/auth.controller';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/verify-otp', authLimiter, authController.verifyOTP);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/refresh-token', tokenLimiter, authController.refreshAccessToken);
router.post('/logout', authController.logout);

export default router;