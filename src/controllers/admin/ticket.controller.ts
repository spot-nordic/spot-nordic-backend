import { Response } from 'express';
import { db } from '../../configs/db.config';
import { supportTickets, users } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getAllTickets = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 20;
        const offset: number = (page - 1) * limit;
        const status: string = req.query.status as string;

        const whereClause = status ? eq(supportTickets.status, status as any) : undefined;

        const results = await db.select({
            id: supportTickets.id,
            subject: supportTickets.subject,
            status: supportTickets.status,
            createdAt: supportTickets.createdAt,
            creatorEmail: users.email,
            creatorRole: users.role
        })
        .from(supportTickets)
        .innerJoin(users, eq(supportTickets.userId, users.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(supportTickets.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(supportTickets).where(whereClause);

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

export const getTicketDetailsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ticketId: string = req.params.ticketId as string;
        
        const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
        
        if (ticket.length === 0) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        res.status(200).json({ ticket: ticket[0] });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTicketStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ticketId: string = req.params.ticketId as string;
        const { status } = req.body;

        await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
        res.status(200).json({ message: `Ticket marked as ${status}` });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};