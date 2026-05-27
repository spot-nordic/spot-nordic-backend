import { Response } from 'express';
import { db } from '../../configs/db.config';
import { orders, users } from '../../db/schema';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { uploadFileToS3 } from '../../services/upload.service';

export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 20;
        const offset: number = (page - 1) * limit;
        const status: string = req.query.status as string;
        const paymentStatus: string = req.query.paymentStatus as string;
        const search: string = req.query.search as string;

        const conditions = [];

        if (status) conditions.push(eq(orders.status, status as any));
        if (paymentStatus) conditions.push(eq(orders.paymentStatus, paymentStatus as any));

        if (search) {
            conditions.push(
                or(
                    ilike(orders.id, `%${search}%`),
                    ilike(users.email, `%${search}%`)
                ) as any
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db.select({
            id: orders.id,
            totalAmount: orders.totalAmount,
            currency: orders.currency,
            status: orders.status,
            paymentStatus: orders.paymentStatus,
            invoiceUrl: orders.invoiceUrl,
            createdAt: orders.createdAt,
            userEmail: users.email
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(orders.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .leftJoin(users, eq(orders.userId, users.id))
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

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const { status } = req.body; 

        const validStatuses: string[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid order status' });
            return;
        }

        const updateData: any = { status, updatedAt: new Date() };
        if (status === 'SHIPPED') updateData.shippedAt = new Date();
        if (status === 'DELIVERED') updateData.deliveredAt = new Date();

        const updatedOrder = await db.update(orders)
            .set(updateData)
            .where(eq(orders.id, id))
            .returning();

        if (updatedOrder.length === 0) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        res.status(200).json({ message: `Order marked as ${status}` });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const uploadOrderInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const file = req.file as Express.Multer.File;

        if (!file) {
            res.status(400).json({ message: 'Invoice file is required' });
            return;
        }

        const invoiceUrl = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'invoices');

        const updatedOrder = await db.update(orders)
            .set({ invoiceUrl, updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();

        if (updatedOrder.length === 0) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        res.status(200).json({ message: 'Invoice uploaded successfully', invoiceUrl });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};