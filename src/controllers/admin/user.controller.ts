import { Response } from 'express';
import { db } from '../../configs/db.config';
import { users, orders } from '../../db/schema';
import { eq, and, sql, desc, ilike } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getPaginatedUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;
        const offset: number = (page - 1) * limit;
        const search: string = req.query.search as string;
        const status: string = req.query.status as string;

        let conditions = [eq(users.role, 'USER')];

        if (status) {
            conditions.push(eq(users.status, status as any));
        }

        if (search) {
            conditions.push(ilike(users.email, `%${search}%`));
        }

        const whereClause = and(...conditions);

        const results = await db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            status: users.status,
            createdAt: users.createdAt
        })
            .from(users)
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(users.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(whereClause);

        res.status(200).json({
            data: results,
            meta: {
                totalCount: totalCountQuery[0].count,
                totalPages: Math.ceil(totalCountQuery[0].count / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const { status } = req.body;

        const validStatuses: string[] = ['ACTIVE', 'BLOCKED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }

        const updated = await db.update(users)
            .set({ status, updatedAt: new Date() })
            .where(and(eq(users.id, id), eq(users.role, 'USER')))
            .returning();

        if (updated.length === 0) {
            res.status(404).json({ message: 'Customer not found' });
            return;
        }

        res.status(200).json(updated[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const hardDeleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;

        const orderCheck = await db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(eq(orders.userId, id));

        if (orderCheck[0].count > 0) {
            res.status(409).json({ message: 'Cannot delete user with order history. Block the user instead.' });
            return;
        }

        const deleted = await db.delete(users)
            .where(and(eq(users.id, id), eq(users.role, 'USER')))
            .returning();

        if (deleted.length === 0) {
            res.status(404).json({ message: 'Customer not found' });
            return;
        }

        res.status(200).json({ message: 'Customer permanently deleted' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};