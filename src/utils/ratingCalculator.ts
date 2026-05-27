// import { db } from '../configs/db';
// import { productReviews, products, dealerReviews, dealerProfiles } from '../db/schema';
// import { eq, sql } from 'drizzle-orm';

// export const recalculateProductRating = async (productId: string): Promise<void> => {
//     const result = await db.select({
//         avg: sql<number>`avg(${productReviews.rating})`,
//         count: sql<number>`count(${productReviews.id})`
//     })
//         .from(productReviews)
//         .where(eq(productReviews.productId, productId));

//     const averageRating = result[0]?.avg ? Number(Number(result[0].avg).toFixed(2)) : 0;
//     const reviewCount = result[0]?.count ? Number(result[0].count) : 0;

//     await db.update(products)
//         .set({ averageRating, reviewCount })
//         .where(eq(products.id, productId));
// };

// export const recalculateDealerRating = async (dealerId: string): Promise<void> => {
//     const result = await db.select({
//         avg: sql<number>`avg(${dealerReviews.rating})`,
//         count: sql<number>`count(${dealerReviews.id})`
//     })
//         .from(dealerReviews)
//         .where(eq(dealerReviews.dealerId, dealerId));

//     const averageRating = result[0]?.avg ? Number(Number(result[0].avg).toFixed(2)) : 0;
//     const reviewCount = result[0]?.count ? Number(result[0].count) : 0;

//     await db.update(dealerProfiles)
//         .set({ averageRating, reviewCount })
//         .where(eq(dealerProfiles.id, dealerId));
// };