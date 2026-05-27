import { Response } from 'express';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../../configs/db.config';
import {
  orders,
  supportTickets,
  products,
  users,
  orderItems,
} from '../../db/schema';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getAdminDashboardStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const now = new Date();

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const sixMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 5,
      1
    );

    const [
      totalOrdersResult,
      totalProductsResult,
      totalUsersResult,
      openTicketsResult,
      totalRevenueResult,
      monthlyRevenueResult,
      completedOrdersResult,
      pendingOrdersResult,
      newUsersThisMonthResult,
      lowStockProductsResult,
      revenueByMonthResult,
      ordersByMonthResult,
      usersByMonthResult,
      ordersByStatusResult,
      topProductsResult,
      latestOrdersResult,
    ] = await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(orders),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(products),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(users)
        .where(eq(users.role, 'USER')),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(supportTickets)
        .where(eq(supportTickets.status, 'OPEN')),

      db
        .select({
          total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float`,
        })
        .from(orders)
        .where(eq(orders.paymentStatus, 'COMPLETED')),

      db
        .select({
          total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.paymentStatus, 'COMPLETED'),
            gte(orders.createdAt, startOfMonth)
          )
        ),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(eq(orders.paymentStatus, 'COMPLETED')),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(eq(orders.paymentStatus, 'PENDING')),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'USER'),
            gte(users.createdAt, startOfMonth)
          )
        ),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(products)
        .where(sql`${products.stock} <= 5`),

      db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${orders.createdAt}), 'Mon YYYY')`,
          revenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.paymentStatus, 'COMPLETED'),
            gte(orders.createdAt, sixMonthsAgo)
          )
        )
        .groupBy(sql`date_trunc('month', ${orders.createdAt})`)
        .orderBy(sql`date_trunc('month', ${orders.createdAt})`),

      db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${orders.createdAt}), 'Mon YYYY')`,
          orders: sql<number>`count(*)::int`,
        })
        .from(orders)
        .where(gte(orders.createdAt, sixMonthsAgo))
        .groupBy(sql`date_trunc('month', ${orders.createdAt})`)
        .orderBy(sql`date_trunc('month', ${orders.createdAt})`),

      db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${users.createdAt}), 'Mon YYYY')`,
          users: sql<number>`count(*)::int`,
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'USER'),
            gte(users.createdAt, sixMonthsAgo)
          )
        )
        .groupBy(sql`date_trunc('month', ${users.createdAt})`)
        .orderBy(sql`date_trunc('month', ${users.createdAt})`),

      db
        .select({
          status: orders.status,
          count: sql<number>`count(*)::int`,
        })
        .from(orders)
        .groupBy(orders.status),

      db
        .select({
          productId: products.id,
          productName: products.name,
          sku: products.sku,
          totalSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
          revenue: sql<number>`coalesce(sum(${orderItems.price} * ${orderItems.quantity}), 0)::float`,
        })
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.productId))
        .groupBy(products.id, products.name, products.sku)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),

      db
        .select({
          id: orders.id,
          amount: orders.totalAmount,
          currency: orders.currency,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          createdAt: orders.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(orders)
        .innerJoin(users, eq(users.id, orders.userId))
        .orderBy(desc(orders.createdAt))
        .limit(10),
    ]);

    res.status(200).json({
      metrics: {
        totalRevenue: totalRevenueResult[0]?.total || 0,
        monthlyRevenue: monthlyRevenueResult[0]?.total || 0,
        totalOrders: totalOrdersResult[0]?.count || 0,
        completedOrders: completedOrdersResult[0]?.count || 0,
        pendingOrders: pendingOrdersResult[0]?.count || 0,
        totalUsers: totalUsersResult[0]?.count || 0,
        newUsersThisMonth: newUsersThisMonthResult[0]?.count || 0,
        totalProducts: totalProductsResult[0]?.count || 0,
        lowStockProducts: lowStockProductsResult[0]?.count || 0,
        openTickets: openTicketsResult[0]?.count || 0,
      },

      charts: {
        revenueByMonth: revenueByMonthResult,
        ordersByMonth: ordersByMonthResult,
        usersByMonth: usersByMonthResult,
        ordersByStatus: ordersByStatusResult,
        topProducts: topProductsResult,
        latestOrders: latestOrdersResult,
      },
    });
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      message: 'Server error retrieving dashboard stats',
    });
  }
};