import { Request, Response } from 'express';
import { db } from '../../configs/db.config';
import { subscribers } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const subscribeToNewsletter = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, preferences = { products: true, blogs: true, sms: false }, termsAccepted } = req.body;

        if (!termsAccepted) {
            res.status(400).json({ message: 'You must accept the terms and privacy policy to subscribe.' });
            return;
        }

        const existing = await db.select().from(subscribers).where(eq(subscribers.email, email));
        
        if (existing.length > 0) {
            await db.update(subscribers).set({ isActive: true, preferences, updatedAt: new Date() }).where(eq(subscribers.id, existing[0].id));
            res.status(200).json({ message: 'Subscription preferences updated successfully' });
            return;
        }

        await db.insert(subscribers).values({ email, preferences });
        res.status(201).json({ message: 'Successfully subscribed to the newsletter' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const unsubscribeFromNewsletter = async (req: Request, res: Response): Promise<void> => {
    try {
        const email = req.query.email as string;

        if (!email) {
            res.status(400).json({ message: 'Email parameter is required.' });
            return;
        }

        const existing = await db.select().from(subscribers).where(eq(subscribers.email, email));

        if (existing.length === 0) {
            res.status(404).json({ message: 'Subscription not found.' });
            return;
        }

        await db.update(subscribers).set({ isActive: false, updatedAt: new Date() }).where(eq(subscribers.email, email));

        res.status(200).json({ message: 'You have been successfully unsubscribed.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};