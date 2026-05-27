import { Response } from 'express';
import { db } from '../../configs/db.config';
import { faqs } from '../../db/schema';
import { eq, desc, sql, ilike } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getPaginatedFaqsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;
        const search: string = (req.query.search as string) || '';
        const offset: number = (page - 1) * limit;

        let baseQuery = db.select().from(faqs);
        let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(faqs);

        if (search) {
            const searchCondition = ilike(faqs.question, `%${search}%`);
            baseQuery = baseQuery.where(searchCondition as any) as any;
            countQuery = countQuery.where(searchCondition as any) as any;
        }

        const results = await baseQuery
            .limit(limit)
            .offset(offset)
            .orderBy(desc(faqs.createdAt));

        const totalCountResult = await countQuery;

        res.status(200).json({
            data: results,
            meta: {
                totalCount: totalCountResult[0].count,
                totalPages: Math.ceil(totalCountResult[0].count / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createFaq = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { question, answer, category, sortOrder, isActive } = req.body;
        const newFaq = await db.insert(faqs).values({
            question,
            answer,
            category,
            sortOrder: sortOrder || 0,
            isActive: isActive ?? true
        }).returning();
        res.status(201).json(newFaq[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateFaq = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const { question, answer, category, sortOrder, isActive } = req.body;
        const updatedFaq = await db.update(faqs)
            .set({ question, answer, category, sortOrder, isActive, updatedAt: new Date() })
            .where(eq(faqs.id, id))
            .returning();
        
        if (updatedFaq.length === 0) {
            res.status(404).json({ message: 'FAQ not found' });
            return;
        }
        res.status(200).json(updatedFaq[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteFaq = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const deleted = await db.delete(faqs).where(eq(faqs.id, id)).returning();
        if (deleted.length === 0) {
            res.status(404).json({ message: 'FAQ not found' });
            return;
        }
        res.status(200).json({ message: 'FAQ deleted successfully' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};