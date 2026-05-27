import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from './db.config';
import { chatMessages, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const setupSocket = (server: HttpServer) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
            socket.data.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const userId = socket.data.user.id;
        const userRole = socket.data.user.role;

        socket.on('joinTicket', (ticketId: string) => {
            socket.join(`ticket_${ticketId}`);
        });

        socket.on('join_chat', (targetUserId: string) => {
            const roomId = [userId, targetUserId].sort().join('_');
            socket.join(`chat_${roomId}`);
        });

        socket.on('send_chat_message', async (data: { receiverId: string, content: string }) => {
            try {
                const roomId = [userId, data.receiverId].sort().join('_');

                const newMessage = await db.insert(chatMessages).values({
                    senderId: userId,
                    receiverId: data.receiverId,
                    content: data.content,
                    deliveryStatus: 'SENT'
                }).returning();

                io.to(`chat_${roomId}`).emit('receive_chat_message', newMessage[0]);
            } catch (error) {
                console.error(error);
            }
        });

        socket.on('update_message_status', async (data: { messageId: string, targetUserId: string, status: string }) => {
            try {
                await db.update(chatMessages)
                    .set({ deliveryStatus: data.status as any })
                    .where(eq(chatMessages.id, data.messageId));

                const roomId = [userId, data.targetUserId].sort().join('_');
                io.to(`chat_${roomId}`).emit('message_status_updated', {
                    messageId: data.messageId,
                    status: data.status
                });
            } catch (error) {
                console.error(error);
            }
        });

        socket.on('disconnect', () => { });

        socket.on('send_bulk_chat', async (data: { targetRole: 'USER' | 'ADMIN', content: string }) => {
            try {
                if (userRole !== 'ADMIN') return;

                const targetUsers = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(
                        and(
                            eq(users.role, data.targetRole),
                            eq(users.status, 'ACTIVE')
                        )
                    );

                if (targetUsers.length === 0) return;

                const messagesToInsert = targetUsers.map(u => ({
                    senderId: userId,
                    receiverId: u.id,
                    content: data.content,
                    deliveryStatus: 'SENT' as any
                }));

                await db.insert(chatMessages).values(messagesToInsert);

                for (const u of targetUsers) {
                    const roomId = [userId, u.id].sort().join('_');

                    io.to(`chat_${roomId}`).emit('receive_chat_message', {
                        senderId: userId,
                        receiverId: u.id,
                        content: data.content,
                        deliveryStatus: 'SENT',
                        createdAt: new Date().toISOString()
                    });
                }

                socket.emit('bulk_message_sent', {
                    targetRole: data.targetRole,
                    content: data.content,
                    recipientCount: targetUsers.length,
                    createdAt: new Date().toISOString()
                });

            } catch (error) {
                console.error(error);
            }
        });
    });

    return io;
};