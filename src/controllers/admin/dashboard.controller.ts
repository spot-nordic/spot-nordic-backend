import { Response } from 'express';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../../configs/db.config';
import { orders, orderItems } from '../../db/schema/order/order.schema';
import { supportTickets } from '../../db/schema/support/support.schema';
import { users } from '../../db/schema/user/user.schema';
import { products } from '../../db/schema/product/product.schema';
import { AuthRequest } from '../../middlewares/auth.middleware';

interface CountResult {
  count: number;
}

interface TotalResult {
  total: number;
}

interface MonthlyRevenueResult {
  month: string;
  revenue: number;
}

interface MonthlyOrdersResult {
  month: string;
  orders: number;
}

interface MonthlyUsersResult {
  month: string;
  users: number;
}

interface OrderStatusResult {
  status: string;
  count: number;
}

interface TopProductResult {
  productId: string;
  productName: string;
  sku: string;
  totalSold: number;
  revenue: number;
}

interface LatestOrderResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  firstName: string;
  lastName: string;
  email: string;
}

interface DashboardMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalProducts: number;
  lowStockProducts: number;
  openTickets: number;
}

interface DashboardCharts {
  revenueByMonth: MonthlyRevenueResult[];
  ordersByMonth: MonthlyOrdersResult[];
  usersByMonth: MonthlyUsersResult[];
  ordersByStatus: OrderStatusResult[];
  topProducts: TopProductResult[];
  latestOrders: LatestOrderResult[];
}

interface DashboardResponse {
  metrics: DashboardMetrics;
  charts: DashboardCharts;
}

const safeDb = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await promise;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown DB error';
    console.warn(`[Dashboard Metric Fallback Triggered]: ${msg}`);
    return fallback;
  }
};

export const getAdminDashboardStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!orders || !products || !users || !supportTickets || !orderItems) {
      throw new Error('Database schema tables are undefined. Check your schema imports.');
    }

    const now: Date = new Date();
    const startOfMonth: Date = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo: Date = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalOrdersResult,
      totalProductsResult,
      totalUsersResult,
      openTicketsResult,
    ]: [CountResult[], CountResult[], CountResult[], CountResult[]] = await Promise.all([
      safeDb(db.select({ count: sql<number>`count(*)::int` }).from(orders), [{ count: 0 }]),
      safeDb(db.select({ count: sql<number>`count(*)::int` }).from(products), [{ count: 0 }]),
      safeDb(db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, 'USER')), [{ count: 0 }]),
      safeDb(db.select({ count: sql<number>`count(*)::int` }).from(supportTickets).where(eq(supportTickets.status, 'OPEN')), [{ count: 0 }]),
    ]);

    const [
      totalRevenueResult,
      monthlyRevenueResult,
      completedOrdersResult,
      pendingOrdersResult,
    ]: [TotalResult[], TotalResult[], CountResult[], CountResult[]] = await Promise.all([
      safeDb(db.select({ total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float` }).from(orders).where(eq(orders.paymentStatus, 'COMPLETED')), [{ total: 0 }]),
      safeDb(db.select({ total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float` }).from(orders).where(and(eq(orders.paymentStatus, 'COMPLETED'), gte(orders.createdAt, startOfMonth))), [{ total: 0 }]),
      safeDb(db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.paymentStatus, 'COMPLETED')), [{ count: 0 }]),
      safeDb(db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.paymentStatus, 'PENDING')), [{ count: 0 }]),
    ]);

    const [
      newUsersThisMonthResult,
      lowStockProductsResult,
    ]: [CountResult[], CountResult[]] = await Promise.all([
      safeDb(db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, 'USER'), gte(users.createdAt, startOfMonth))), [{ count: 0 }]),
      safeDb(db.select({ count: sql<number>`count(*)::int` }).from(products).where(sql`${products.stock} <= 5`), [{ count: 0 }]),
    ]);

    const [
      revenueByMonthResult,
      ordersByMonthResult,
      usersByMonthResult,
      ordersByStatusResult,
    ]: [
      MonthlyRevenueResult[],
      MonthlyOrdersResult[],
      MonthlyUsersResult[],
      OrderStatusResult[]
    ] = await Promise.all([
      safeDb(
        db
          .select({
            month: sql<string>`to_char(date_trunc('month', ${orders.createdAt}), 'Mon YYYY')`,
            revenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float`,
          })
          .from(orders)
          .where(and(eq(orders.paymentStatus, 'COMPLETED'), gte(orders.createdAt, sixMonthsAgo)))
          .groupBy(sql`date_trunc('month', ${orders.createdAt})`)
          .orderBy(sql`date_trunc('month', ${orders.createdAt})`),
        []
      ),

      safeDb(
        db
          .select({
            month: sql<string>`to_char(date_trunc('month', ${orders.createdAt}), 'Mon YYYY')`,
            orders: sql<number>`count(*)::int`,
          })
          .from(orders)
          .where(gte(orders.createdAt, sixMonthsAgo))
          .groupBy(sql`date_trunc('month', ${orders.createdAt})`)
          .orderBy(sql`date_trunc('month', ${orders.createdAt})`),
        []
      ),

      safeDb(
        db
          .select({
            month: sql<string>`to_char(date_trunc('month', ${users.createdAt}), 'Mon YYYY')`,
            users: sql<number>`count(*)::int`,
          })
          .from(users)
          .where(and(eq(users.role, 'USER'), gte(users.createdAt, sixMonthsAgo)))
          .groupBy(sql`date_trunc('month', ${users.createdAt})`)
          .orderBy(sql`date_trunc('month', ${users.createdAt})`),
        []
      ),

      safeDb(
        db
          .select({
            status: orders.status,
            count: sql<number>`count(*)::int`,
          })
          .from(orders)
          .groupBy(orders.status),
        []
      ),
    ]);

    const [
      topProductsResult,
      latestOrdersResult,
    ]: [TopProductResult[], LatestOrderResult[]] = await Promise.all([
      safeDb(
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
        []
      ),

      safeDb(
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
        []
      ),
    ]);

    const responseData: DashboardResponse = {
      metrics: {
        totalRevenue: totalRevenueResult[0]?.total ?? 0,
        monthlyRevenue: monthlyRevenueResult[0]?.total ?? 0,
        totalOrders: totalOrdersResult[0]?.count ?? 0,
        completedOrders: completedOrdersResult[0]?.count ?? 0,
        pendingOrders: pendingOrdersResult[0]?.count ?? 0,
        totalUsers: totalUsersResult[0]?.count ?? 0,
        newUsersThisMonth: newUsersThisMonthResult[0]?.count ?? 0,
        totalProducts: totalProductsResult[0]?.count ?? 0,
        lowStockProducts: lowStockProductsResult[0]?.count ?? 0,
        openTickets: openTicketsResult[0]?.count ?? 0,
      },
      charts: {
        revenueByMonth: revenueByMonthResult,
        ordersByMonth: ordersByMonthResult,
        usersByMonth: usersByMonthResult,
        ordersByStatus: ordersByStatusResult,
        topProducts: topProductsResult,
        latestOrders: latestOrdersResult,
      },
    };

    res.status(200).json(responseData);
  } catch (error: unknown) {
    const errorMessage: string =
      error instanceof Error ? error.message : 'Server error retrieving dashboard stats';
    res.status(500).json({
      message: errorMessage,
    });
  }
};