import { Response } from 'express';
import { db } from '../../configs/db.config';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const { metadata, firstName, lastName } = req.body;

        const currentUser = await db.select().from(users).where(eq(users.id, userId));
        
        if (!currentUser.length) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const existingMetadata = (currentUser[0].metadata as Record<string, any>) || {};

        const updatedMetadata = {
            ...existingMetadata,
            ...(metadata || {})
        };

        const updatedUser = await db.update(users)
            .set({ 
                firstName: firstName || currentUser[0].firstName,
                lastName: lastName || currentUser[0].lastName,
                metadata: updatedMetadata, 
                updatedAt: new Date() 
            })
            .where(eq(users.id, userId))
            .returning();

        res.status(200).json(updatedUser[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const user = await db.select().from(users).where(eq(users.id, userId));
        
        if (!user.length) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json(user[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};