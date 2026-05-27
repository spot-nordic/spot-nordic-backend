import { Response } from 'express';
import { db } from '../../configs/db.config';
import { orders, orderItems, products } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getDetailedOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;
        const offset: number = (page - 1) * limit;
        const status: string = req.query.status as string;

        const conditions = [eq(orders.userId, userId)];
        if (status) conditions.push(eq(orders.status, status as any));
        const whereClause = and(...conditions);

        const baseOrders = await db.select()
            .from(orders)
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(orders.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(whereClause);

        const populatedOrders = await Promise.all(baseOrders.map(async (order) => {
            const items = await db.select({
                id: orderItems.id,
                quantity: orderItems.quantity,
                price: orderItems.price,
                originalPrice: orderItems.originalPrice,
                productId: products.id,
                productName: products.name,
                productSku: products.sku,
                images: products.images
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, order.id));

            return {
                ...order,
                items
            };
        }));

        res.status(200).json({
            data: populatedOrders,
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

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const orderId: string = req.params.orderId as string;

        const order = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
        if (order.length === 0) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        const items = await db.select({
            id: orderItems.id,
            quantity: orderItems.quantity,
            price: orderItems.price,
            originalPrice: orderItems.originalPrice,
            productId: products.id,
            productName: products.name,
            productSku: products.sku,
            images: products.images
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));

        res.status(200).json({
            ...order[0],
            items
        });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};