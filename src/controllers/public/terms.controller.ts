import { Request, Response } from 'express';
import { db } from '../../configs/db.config';
import { termsConditions } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const getActiveTerm = async (req: Request, res: Response): Promise<void> => {
    try {
        const activeTerm = await db.select()
            .from(termsConditions)
            .where(eq(termsConditions.isActive, true))
            .limit(1);

        if (activeTerm.length === 0) {
            res.status(404).json({ message: 'No active terms found' });
            return;
        }

        res.status(200).json(activeTerm[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};