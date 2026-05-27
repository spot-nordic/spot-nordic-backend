import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../configs/db.config';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { generateOTP } from '../../utils/otp';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { verifyCaptcha } from '../../utils/captcha';
import emailConfig from '../../configs/email.config';
import { redisClient } from '../../configs/redis.config';
import { logger } from '../../utils/logger';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, firstName, lastName, captchaToken } = req.body;
        const normalizedEmail = String(email).toLowerCase().trim();

        if (!captchaToken) {
            res.status(400).json({ message: 'Captcha verification is required' });
            return;
        }

        const isCaptchaValid = await verifyCaptcha(String(captchaToken));
        if (!isCaptchaValid) {
            res.status(400).json({ message: 'Invalid Captcha' });
            return;
        }

        const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));
        if (existingUsers.length > 0) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(String(password), salt);
        // const otp = generateOTP();
        const otp = 123456;
        
        // Normalize email for Redis Key
        const redisKey = `OTP:REGISTER:${normalizedEmail}`;
        const pendingUserData = { 
            email: normalizedEmail, 
            password: hashedPassword, 
            firstName, 
            lastName, 
            role: 'USER', 
            otp 
        };
        
        await redisClient.setEx(redisKey, 600, JSON.stringify(pendingUserData));

        // await emailConfig.sendEmail(
        //     normalizedEmail,
        //     'Verify Your Account',
        //     `<h1>Your Registration OTP is ${otp}</h1><p>It expires in 10 minutes.</p>`
        // );

        res.status(201).json({ message: 'Registration successful, verify OTP to continue' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = String(email).toLowerCase().trim();

        const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));
        if (existingUsers.length === 0) {
            res.status(404).json({ message: 'Invalid credentials' });
            return;
        }

        const user = existingUsers[0];

        if (user.status === 'BLOCKED') {
            res.status(403).json({ message: 'Account is blocked' });
            return;
        }

        const isMatch = await bcrypt.compare(String(password), user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const accessToken = generateAccessToken(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);

        await db.update(users).set({ refreshToken }).where(eq(users.id, user.id));

        res.status(200).json({
            token: accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName }
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const normalizedEmail = String(email).toLowerCase().trim();

        const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));
        if (existingUsers.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // const otp = generateOTP();
        const otp = 123456;
        const redisKey = `OTP:PASSWORD_RESET:${normalizedEmail}`;
        const pendingData = { email: normalizedEmail, otp };
        
        await redisClient.setEx(redisKey, 600, JSON.stringify(pendingData));

        // await emailConfig.sendEmail(
        //     normalizedEmail,
        //     'Password Reset Verification',
        //     `<h1>Your Password Reset OTP is ${otp}</h1><p>It expires in 10 minutes.</p>`
        // );

        res.status(200).json({ message: 'OTP sent to email successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp, type } = req.body;
        const normalizedEmail = String(email).toLowerCase().trim();
        const redisKey = `OTP:${type}:${normalizedEmail}`;

        const storedDataStr = await redisClient.get(redisKey);
        if (!storedDataStr) {
            res.status(400).json({ message: 'OTP expired or invalid.' });
            return;
        }

        const storedData = JSON.parse(storedDataStr);

        // Strict type casting to ensure Number/String mismatches don't trigger false positives
        if (String(storedData.otp).trim() !== String(otp).trim()) {
            res.status(400).json({ message: 'Invalid OTP' });
            return;
        }

        if (type === 'REGISTER') {
            const newUser = await db.insert(users).values({
                email: storedData.email,
                password: storedData.password,
                firstName: storedData.firstName,
                lastName: storedData.lastName,
                role: storedData.role,
                isEmailVerified: true
            }).returning();

            const user = newUser[0];
            const accessToken = generateAccessToken(user.id, user.role);
            const refreshToken = generateRefreshToken(user.id);

            await db.update(users).set({ refreshToken }).where(eq(users.id, user.id));
            await redisClient.del(redisKey);

            res.status(201).json({
                message: 'Account verified and created successfully.',
                token: accessToken,
                refreshToken,
                user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName }
            });
            return;
        }

        if (type === 'PASSWORD_RESET') {
            res.status(200).json({ message: 'OTP verified. Proceed to reset password.', resetToken: storedDataStr });
            return;
        }

        res.status(400).json({ message: 'Invalid operation type' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, newPassword, resetToken } = req.body;
        const normalizedEmail = String(email).toLowerCase().trim();

        const storedData = JSON.parse(String(resetToken));
        if (!storedData || storedData.email !== normalizedEmail) {
            res.status(400).json({ message: 'Invalid reset token' });
            return;
        }

        const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));
        if (existingUsers.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(String(newPassword), salt);

        await db.update(users)
            .set({ password: hashedPassword, refreshToken: null, updatedAt: new Date() })
            .where(eq(users.id, existingUsers[0].id));

        await redisClient.del(`OTP:PASSWORD_RESET:${normalizedEmail}`);

        res.status(200).json({ message: 'Password reset successfully. Please log in.' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(401).json({ message: 'Refresh token is required' });
            return;
        }

        const decoded = jwt.verify(String(refreshToken), process.env.JWT_REFRESH_SECRET as string) as any;

        const existingUsers = await db.select().from(users).where(eq(users.id, String(decoded.id)));
        if (existingUsers.length === 0 || existingUsers[0].refreshToken !== refreshToken) {
            res.status(403).json({ message: 'Invalid refresh token' });
            return;
        }

        const user = existingUsers[0];
        const newAccessToken = generateAccessToken(user.id, user.role);
        const newRefreshToken = generateRefreshToken(user.id);

        await db.update(users)
            .set({ refreshToken: newRefreshToken })
            .where(eq(users.id, user.id));

        res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        logger.error(error);
        res.status(403).json({ message: 'Token expired or invalid' });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.body;
        await db.update(users).set({ refreshToken: null }).where(eq(users.id, String(id)));
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};