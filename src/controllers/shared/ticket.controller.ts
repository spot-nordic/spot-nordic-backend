import { Response } from 'express';
import { db } from '../../configs/db.config';
import { supportTickets } from '../../db/schema/support/support.schema';
import { orders } from '../../db/schema/order/order.schema';
import { eq, and, desc, sql, notInArray } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';
import emailConfig from '../../configs/email.config';

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId: string = req.user.id;
        const userEmail: string = req.user.email;
        const { subject, description, orderId } = req.body;

        if (!subject || !description) {
            res.status(400).json({ message: 'Subject and description are required.' });
            return;
        }

        if (orderId && orderId.trim() !== '') {
            const orderCheck = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
            if (orderCheck.length === 0) {
                res.status(400).json({ message: 'Invalid order ID or order does not belong to user.' });
                return;
            }
        }

        const newTicket = await db.insert(supportTickets).values({
            userId,
            subject,
            description,
            orderId: orderId && orderId.trim() !== '' ? orderId : null
        }).returning();

        if (process.env.ADMIN_EMAIL) {
            await emailConfig.sendEmail(
                process.env.ADMIN_EMAIL,
                `New Support Ticket: ${subject}`,
                `<h1>New Support Ticket Raised</h1>
                 <p><strong>Ticket ID:</strong> ${newTicket[0].id}</p>
                 <p><strong>User Email:</strong> ${userEmail}</p>
                 <p><strong>Subject:</strong> ${subject}</p>
                 <p><strong>Order ID:</strong> ${orderId || 'N/A'}</p>
                 <p><strong>Description:</strong> ${description}</p>`
            ).catch(err => console.error('Failed to send admin ticket notification:', err));
        }

        res.status(201).json(newTicket[0]);
    } catch (error: any) {
        console.error('[Create Ticket Error]:', error);
        res.status(500).json({ 
            message: error?.message || 'Server error creating ticket. Check database schema migrations.' 
        });
    }
};

export const getMyTickets = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId: string = req.user.id;
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;
        const offset: number = (page - 1) * limit;

        const results = await db.select().from(supportTickets)
            .where(and(
                eq(supportTickets.userId, userId),
                notInArray(supportTickets.status, ['RESOLVED', 'CLOSED'])
            ))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(supportTickets.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(supportTickets)
            .where(and(
                eq(supportTickets.userId, userId),
                notInArray(supportTickets.status, ['RESOLVED', 'CLOSED'])
            ));

        res.status(200).json({
            data: results,
            meta: {
                totalCount: totalCountQuery[0]?.count || 0,
                totalPages: Math.ceil((totalCountQuery[0]?.count || 0) / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error: any) {
        console.error('[Get Tickets Error]:', error);
        res.status(500).json({ 
            message: error?.message || 'Server error fetching tickets. Ensure support_tickets table exists.' 
        });
    }
};

export const getTicketDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId: string = req.user.id;
        const ticketId: string = req.params.ticketId as string;
        
        const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
        
        if (ticket.length === 0 || (ticket[0].userId !== userId && req.user.role !== 'ADMIN')) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        res.status(200).json({ ticket: ticket[0] });
    } catch (error: any) {
        console.error('[Get Ticket Details Error]:', error);
        res.status(500).json({ message: error?.message || 'Server error' });
    }
};

export const resolveMyTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId: string = req.user.id;
        const ticketId: string = req.params.ticketId as string;

        const ticket = await db.select().from(supportTickets).where(and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, userId)));
        
        if (ticket.length === 0) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        await db.update(supportTickets).set({ status: 'RESOLVED', updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));

        res.status(200).json({ message: 'Ticket resolved' });
    } catch (error: any) {
        console.error('[Resolve Ticket Error]:', error);
        res.status(500).json({ message: error?.message || 'Server error' });
    }
};