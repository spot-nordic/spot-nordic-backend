import { Response } from 'express';
import { db } from '../../configs/db.config';
import { supportTickets } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const { subject, description } = req.body;

        const newTicket = await db.insert(supportTickets).values({
            userId,
            subject,
            description
        }).returning();

        res.status(201).json(newTicket[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMyTickets = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;
        const offset: number = (page - 1) * limit;

        const results = await db.select().from(supportTickets)
            .where(eq(supportTickets.userId, userId))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(supportTickets.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(supportTickets)
            .where(eq(supportTickets.userId, userId));

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

export const getTicketDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const ticketId: string = req.params.ticketId as string;
        
        const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
        
        if (ticket.length === 0 || (ticket[0].userId !== userId && req.user!.role !== 'ADMIN')) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        res.status(200).json({ ticket: ticket[0] });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const resolveMyTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const ticketId: string = req.params.ticketId as string;

        const ticket = await db.select().from(supportTickets).where(and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, userId)));
        
        if (ticket.length === 0) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        await db.update(supportTickets).set({ status: 'RESOLVED', updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));

        res.status(200).json({ message: 'Ticket resolved' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};