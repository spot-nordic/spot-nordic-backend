import { Request, Response } from 'express';
import { db } from '../../configs/db.config';
import { products, productCategories, productReviews, users } from '../../db/schema';
import { eq, and, desc, sql, ilike, or, gte, lte } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const results = await db.select({
            id: productCategories.id,
            name: productCategories.name,
            slug: productCategories.slug,
            description: productCategories.description
        })
        .from(productCategories)
        .where(eq(productCategories.status, 'ACTIVE'))
        .orderBy(desc(productCategories.createdAt));

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const browseProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit: number = parseInt(req.query.limit as string) || 12; 
        const page: number = parseInt(req.query.page as string) || 1;
        const offset: number = (page - 1) * limit;

        const search: string = req.query.search as string;
        const categoryId: string = req.query.categoryId as string;
        const minPrice: number = parseFloat(req.query.minPrice as string);
        const maxPrice: number = parseFloat(req.query.maxPrice as string);

        const conditions = [eq(products.status, 'ACTIVE')];

        if (categoryId) conditions.push(eq(products.categoryId, String(categoryId)));
        
        if (!isNaN(minPrice)) {
            conditions.push(gte(sql`${products.basePrice} * (1 - ${products.discountPercentage} / 100)`, minPrice));
        }
        if (!isNaN(maxPrice)) {
            conditions.push(lte(sql`${products.basePrice} * (1 - ${products.discountPercentage} / 100)`, maxPrice));
        }

        if (search) {
            conditions.push(
                or(
                    ilike(products.name, `%${search}%`),
                    ilike(products.sku, `%${search}%`),
                    ilike(products.description, `%${search}%`),
                    ilike(productCategories.name, `%${search}%`)
                ) as any
            );
        }

        const whereClause = and(...conditions);

        const results = await db.select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            basePrice: products.basePrice,
            discountPercentage: products.discountPercentage,
            images: products.images,
            averageRating: products.averageRating,
            totalReviews: products.totalReviews,
            categoryName: productCategories.name,
        })
        .from(products)
        .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(products.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(products)
            .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
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
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProductDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const id: string = String(req.params.id);

        const product = await db.select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            description: products.description,
            basePrice: products.basePrice,
            discountPercentage: products.discountPercentage,
            images: products.images,
            stock: products.stock,
            averageRating: products.averageRating,
            totalReviews: products.totalReviews,
            categoryId: products.categoryId,
            categoryName: productCategories.name
        })
        .from(products)
        .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
        .where(and(eq(products.id, id), eq(products.status, 'ACTIVE')));
        
        if (product.length === 0) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        res.status(200).json(product[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getSuggestedProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const id: string = String(req.params.id);
        const limit: number = parseInt(req.query.limit as string) || 4;

        const targetProduct = await db.select({ categoryId: products.categoryId }).from(products).where(eq(products.id, id));

        if (targetProduct.length === 0) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        const suggestedProducts = await db.select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            basePrice: products.basePrice,
            discountPercentage: products.discountPercentage,
            images: products.images,
            averageRating: products.averageRating,
            categoryName: productCategories.name,
        })
        .from(products)
        .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
        .where(and(
            eq(products.categoryId, targetProduct[0].categoryId),
            eq(products.status, 'ACTIVE'),
            sql`${products.id} != ${id}`
        ))
        .limit(limit)
        .orderBy(desc(products.averageRating), desc(products.createdAt));

        res.status(200).json(suggestedProducts);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        
        const reviews = await db.select({
            id: productReviews.id,
            rating: productReviews.rating,
            comment: productReviews.comment,
            createdAt: productReviews.createdAt,
            userName: users.firstName
        })
        .from(productReviews)
        .leftJoin(users, eq(productReviews.userId, users.id))
        .where(and(eq(productReviews.productId, id), eq(productReviews.isVisible, true)))
        .orderBy(desc(productReviews.createdAt));

        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const addProductReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const productId: string = req.params.id as string;
        const userId: string = req.user!.id;
        const { rating, comment } = req.body;

        const numericRating = parseInt(rating);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
            res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
            return;
        }

        const targetProduct = await db.select().from(products).where(eq(products.id, productId));
        if (targetProduct.length === 0) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        const newReview = await db.insert(productReviews).values({
            productId,
            userId,
            rating: numericRating,
            comment
        }).returning();

        const currentAvg = targetProduct[0].averageRating;
        const currentTotal = targetProduct[0].totalReviews;
        const newTotal = currentTotal + 1;
        const newAvg = ((currentAvg * currentTotal) + numericRating) / newTotal;

        await db.update(products).set({
            averageRating: newAvg,
            totalReviews: newTotal
        }).where(eq(products.id, productId));

        res.status(201).json(newReview[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};