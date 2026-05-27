import { Request, Response } from 'express';
import { db } from '../../configs/db.config';
import { faqs } from '../../db/schema';
import { eq, desc, sql, ilike, and } from 'drizzle-orm';

export const getActiveFaqs = async (req: Request, res: Response): Promise<void> => {
    try {
        const category: string = (req.query.category as string) || '';

        let conditions = [eq(faqs.isActive, true)];
        
        if (category) conditions.push(eq(faqs.category, category));

        const finalCondition = and(...conditions);

        const results = await db.select()
            .from(faqs)
            .where(finalCondition)
            .orderBy(desc(faqs.sortOrder)); 

        res.status(200).json(results);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};