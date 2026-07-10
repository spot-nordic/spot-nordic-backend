import { Response } from 'express';
import { db } from '../../configs/db.config';
import { supportTickets } from '../../db/schema/support/support.schema';
import { users } from '../../db/schema/user/user.schema';
import { eq, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export const getAllTickets = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 20;
        const offset: number = (page - 1) * limit;
        const status = req.query.status as TicketStatus | undefined;

        const whereClause = status ? eq(supportTickets.status, status) : undefined;

        const results = await db.select({
            id: supportTickets.id,
            subject: supportTickets.subject,
            status: supportTickets.status,
            createdAt: supportTickets.createdAt,
            creatorEmail: users.email,
            creatorRole: users.role,
            orderId: supportTickets.orderId
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
        const { status } = req.body as { status: TicketStatus };

        await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
        res.status(200).json({ message: `Ticket marked as ${status}` });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createTicketForUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userEmail, subject, description } = req.body;

        const targetUser = await db.select().from(users).where(eq(users.email, userEmail));
        
        if (targetUser.length === 0) {
            res.status(404).json({ message: 'User not found with the provided email' });
            return;
        }

        const newTicket = await db.insert(supportTickets).values({
            userId: targetUser[0].id,
            subject,
            description,
            orderId: null 
        }).returning();

        res.status(201).json(newTicket[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ticketId: string = req.params.ticketId as string;

        const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
        if (ticket.length === 0) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        await db.delete(supportTickets).where(eq(supportTickets.id, ticketId));
        res.status(200).json({ message: 'Ticket deleted successfully' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error deleting ticket' });
    }
};