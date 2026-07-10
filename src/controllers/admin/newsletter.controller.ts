import { Response } from 'express';
import { db } from '../../configs/db.config';
import { subscribers, newsletters } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';
import emailConfig from '../../configs/email.config';
import { uploadFileToS3 } from '../../services/upload.service';

export const getSubscribers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 20;
        const offset: number = (page - 1) * limit;

        const results = await db.select()
            .from(subscribers)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(subscribers.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(subscribers);

        res.status(200).json({
            data: results,
            meta: {
                totalCount: totalCountQuery[0].count,
                totalPages: Math.ceil(totalCountQuery[0].count / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const addSubscriber = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { email, preferences } = req.body;
        
        const existingSubscriber = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
        if (existingSubscriber.length > 0) {
            res.status(400).json({ message: 'Subscriber with this email already exists.' });
            return;
        }

        const newSubscriber = await db.insert(subscribers).values({
            email,
            preferences: preferences || { products: true, blogs: true, sms: false },
            isActive: true
        }).returning();

        res.status(201).json(newSubscriber[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const broadcastNewsletter = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { subject, htmlContent, targetSegment } = req.body; 
        
        const campaign = await db.insert(newsletters).values({
            subject, htmlContent, status: 'DRAFT'
        }).returning();

        const activeSubscribers = await db.select().from(subscribers).where(eq(subscribers.isActive, true));
        
        const targetEmails = activeSubscribers
            .filter(sub => {
                const prefs = sub.preferences as Record<string, boolean>;
                return targetSegment === 'all' || prefs[targetSegment] === true;
            })
            .map(sub => sub.email);

        for (const email of targetEmails) {
            await emailConfig.sendEmail(email, subject, htmlContent);
        }

        await db.update(newsletters)
            .set({ status: 'SENT', sentAt: new Date() })
            .where(eq(newsletters.id, campaign[0].id));

        res.status(200).json({ message: `Newsletter broadcasted to ${targetEmails.length} subscribers.` });
    } catch (error) {
        res.status(500).json({ message: 'Server error during broadcast' });
    }
};

export const uploadNewsletterImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const file = req.file as Express.Multer.File;
        if (!file) {
            res.status(400).json({ message: 'No image provided' });
            return;
        }

        const fileUrl: string = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'newsletters/inline');
        
        res.status(201).json({ url: fileUrl });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};