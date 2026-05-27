import { Response } from 'express';
import { db } from '../../configs/db.config';
import { chatMessages, supportTickets, ticketMessages, users } from '../../db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { uploadFileToS3 } from '../../services/upload.service';
import { Server } from 'socket.io';

interface ContactRow {
    contact_id: string;
    last_interaction: string;
}

export const sendMessageWithAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const senderId: string = req.user!.id;
        const { receiverId, content } = req.body;
        const file: Express.Multer.File | undefined = req.file;

        let finalContent: string = content || '';

        if (file) {
            const fileUrl: string = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'chat_attachments');
            finalContent = finalContent ? `${finalContent} \n\n [Attachment](${fileUrl})` : `[Attachment](${fileUrl})`;
        }

        if (!finalContent) {
            res.status(400).json({ message: 'Message content or image is required' });
            return;
        }

        const newMessage = await db.insert(chatMessages).values({
            senderId,
            receiverId: String(receiverId),
            content: finalContent,
            deliveryStatus: 'SENT'
        }).returning();

        const io: Server = req.app.get('io');
        if (io) {
            const roomId: string = [senderId, String(receiverId)].sort().join('_');
            io.to(`chat_${roomId}`).emit('receive_chat_message', newMessage[0]);
        }

        res.status(201).json(newMessage[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const targetUserId: string = String(req.params.targetUserId);
        const limit: number = parseInt(req.query.limit as string) || 50;
        const page: number = parseInt(req.query.page as string) || 1;
        const offset: number = (page - 1) * limit;

        const conditions = or(
            and(eq(chatMessages.senderId, userId), eq(chatMessages.receiverId, targetUserId)),
            and(eq(chatMessages.senderId, targetUserId), eq(chatMessages.receiverId, userId))
        );

        const messages = await db.select().from(chatMessages)
            .where(conditions)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(chatMessages.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(chatMessages).where(conditions);

        res.status(200).json({
            data: messages,
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

export const getMyConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;

        const rawQuery = sql`
            SELECT DISTINCT ON (contact_id)
                contact_id,
                last_interaction
            FROM (
                SELECT 
                    CASE 
                        WHEN sender_id = ${userId}::uuid THEN receiver_id 
                        ELSE sender_id 
                    END as contact_id,
                    created_at as last_interaction
                FROM chat_messages
                WHERE sender_id = ${userId}::uuid OR receiver_id = ${userId}::uuid
            ) sub
            ORDER BY contact_id, last_interaction DESC
        `;

        const distinctContacts = await db.execute(rawQuery);

        const formattedConversations = await Promise.all((distinctContacts.rows as unknown as ContactRow[]).map(async (row: ContactRow) => {
            const contactUser = await db.select().from(users).where(eq(users.id, String(row.contact_id)));
            if (!contactUser.length) return null;

            const unreadCount = await db.select({ count: sql<number>`count(*)::int` })
                .from(chatMessages)
                .where(and(
                    eq(chatMessages.senderId, String(row.contact_id)),
                    eq(chatMessages.receiverId, userId),
                    eq(chatMessages.deliveryStatus, 'SENT')
                ));

            return {
                contactId: row.contact_id,
                displayName: `${contactUser[0].firstName} ${contactUser[0].lastName}`,
                role: contactUser[0].role,
                lastInteraction: row.last_interaction,
                unreadCount: unreadCount[0].count
            };
        }));

        res.status(200).json(formattedConversations.filter((c: unknown) => c !== null));
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getTicketMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const userRole: string = req.user!.role;
        const ticketId: string = req.params.ticketId as string;

        const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));

        if (ticket.length === 0 || (ticket[0].userId !== userId && userRole !== 'ADMIN')) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        const messages = await db.select({
            id: ticketMessages.id,
            message: ticketMessages.message,
            createdAt: ticketMessages.createdAt,
            senderId: ticketMessages.senderId,
            senderRole: users.role
        })
        .from(ticketMessages)
        .innerJoin(users, eq(ticketMessages.senderId, users.id))
        .where(eq(ticketMessages.ticketId, ticketId))
        .orderBy(desc(ticketMessages.createdAt));

        res.status(200).json(messages);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const sendTicketMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const userRole: string = req.user!.role;
        const ticketId: string = req.params.ticketId as string;
        const { message } = req.body;
        const file: Express.Multer.File | undefined = req.file;

        let finalContent: string = message || '';
        
        if (file) {
            const fileUrl: string = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'ticket_attachments');
            finalContent = finalContent ? `${finalContent} \n\n [Attachment](${fileUrl})` : `[Attachment](${fileUrl})`;
        }

        if (!finalContent) {
            res.status(400).json({ message: 'Message content or file is required' });
            return;
        }

        const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));

        if (ticket.length === 0 || (ticket[0].userId !== userId && userRole !== 'ADMIN')) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }

        if (ticket[0].status === 'CLOSED' || ticket[0].status === 'RESOLVED') {
            res.status(400).json({ message: 'Cannot reply to a resolved or closed ticket' });
            return;
        }

        const newMessage = await db.insert(ticketMessages).values({
            ticketId,
            senderId: userId,
            message: finalContent
        }).returning();

        // Ensure we construct the complete payload including the senderRole
        const completeMessage = {
            ...newMessage[0],
            senderRole: userRole
        };

        const io: Server = req.app.get('io');
        if (io) {
            io.to(`ticket_${ticketId}`).emit('ticketMessage', completeMessage);
        }

        // Return the fully constructed object instead of just newMessage[0]
        res.status(201).json(completeMessage);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};