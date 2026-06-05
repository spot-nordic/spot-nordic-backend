import { Response } from 'express';
import { db } from '../../configs/db.config';
import { products, productCategories, productReviews, users } from '../../db/schema';
import { eq, ne, and, or, ilike, sql, desc } from 'drizzle-orm';
import { uploadFileToS3 } from '../../services/upload.service';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const checkCategorySlugAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const slug: string = req.query.slug as string;
        const excludeId: string = req.query.excludeId as string;

        if (!slug) {
            res.status(400).json({ message: 'Slug is required' });
            return;
        }

        const conditions = [eq(productCategories.slug, slug)];
        if (excludeId) {
            conditions.push(ne(productCategories.id, excludeId));
        }

        const existingCategory = await db.select({ id: productCategories.id })
            .from(productCategories)
            .where(and(...conditions))
            .limit(1);

        res.status(200).json({ isAvailable: existingCategory.length === 0 });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, slug, description } = req.body;

        const slugCheck = await db.select().from(productCategories).where(eq(productCategories.slug, slug)).limit(1);
        if (slugCheck.length > 0) {
            res.status(400).json({ message: 'Slug already exists.' });
            return;
        }

        const newCategory = await db.insert(productCategories).values({ name, slug, description }).returning();
        res.status(201).json(newCategory[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const results = await db.select().from(productCategories).orderBy(desc(productCategories.createdAt));
        res.status(200).json(results);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const { name, slug, description, status } = req.body;

        if (slug) {
            const slugCheck = await db.select().from(productCategories).where(and(eq(productCategories.slug, slug), ne(productCategories.id, id))).limit(1);
            if (slugCheck.length > 0) {
                res.status(400).json({ message: 'Slug already exists.' });
                return;
            }
        }

        const updatedCategory = await db.update(productCategories)
            .set({ name, slug, description, status, updatedAt: new Date() })
            .where(eq(productCategories.id, id))
            .returning();
        res.status(200).json(updatedCategory[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        await db.update(productCategories).set({ status: 'DISABLED', updatedAt: new Date() }).where(eq(productCategories.id, id));
        res.status(200).json({ message: 'Category disabled' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const checkSkuAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const sku: string = req.query.sku as string;
        const excludeId: string = req.query.excludeId as string;

        if (!sku) {
            res.status(400).json({ message: 'SKU is required' });
            return;
        }

        const conditions = [eq(products.sku, sku)];
        if (excludeId) {
            conditions.push(ne(products.id, excludeId));
        }

        const existingProduct = await db.select({ id: products.id })
            .from(products)
            .where(and(...conditions))
            .limit(1);

        res.status(200).json({ isAvailable: existingProduct.length === 0 });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const productData = req.body;
        const files = req.files as Express.Multer.File[];

        const skuCheck = await db.select().from(products).where(eq(products.sku, productData.sku)).limit(1);
        if (skuCheck.length > 0) {
            res.status(400).json({ message: 'SKU already exists.' });
            return;
        }

        const categoryCheck = await db.select().from(productCategories).where(eq(productCategories.id, productData.categoryId));
        if (categoryCheck.length === 0 || categoryCheck[0].status !== 'ACTIVE') {
            res.status(400).json({ message: 'Invalid or inactive category selected.' });
            return;
        }

        let imageUrls: string[] = [];
        if (files && files.length > 0) {
            imageUrls = await Promise.all(
                files.map((file) => uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'products'))
            );
        }

        const newProduct = await db.insert(products).values({
            name: productData.name,
            sku: productData.sku,
            categoryId: productData.categoryId,
            description: productData.description,
            images: imageUrls,
            basePrice: parseFloat(productData.basePrice),
            discountPercentage: parseFloat(productData.discountPercentage) || 0,
            stock: parseInt(productData.stock) || 0,
            status: productData.status || 'ACTIVE'
        }).returning();

        res.status(201).json(newProduct[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPaginatedProducts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;
        const offset: number = (page - 1) * limit;
        const search: string = req.query.search as string;
        const status: string = req.query.status as string;

        const conditions = [];

        if (status) {
            conditions.push(eq(products.status, status as any));
        } else {
            conditions.push(ne(products.status, 'DISABLED'));
        }

        if (search) {
            conditions.push(
                or(
                    ilike(products.name, `%${search}%`),
                    ilike(products.sku, `%${search}%`)
                ) as any
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db.select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            categoryId: products.categoryId,
            description: products.description,
            images: products.images,
            basePrice: products.basePrice,
            discountPercentage: products.discountPercentage,
            stock: products.stock,
            status: products.status,
            averageRating: products.averageRating,
            totalReviews: products.totalReviews,
            categoryName: productCategories.name,
            createdAt: products.createdAt
        })
            .from(products)
            .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(products.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(products)
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

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const productData = req.body;
        const files = req.files as Express.Multer.File[];
        
        const targetProduct = await db.select().from(products).where(eq(products.id, id));
        if (targetProduct.length === 0) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        if (productData.sku) {
            const skuCheck = await db.select().from(products).where(and(eq(products.sku, productData.sku), ne(products.id, id))).limit(1);
            if (skuCheck.length > 0) {
                res.status(400).json({ message: 'SKU already exists.' });
                return;
            }
        }

        let imageUrls: string[] = productData.existingImages ? JSON.parse(productData.existingImages) : targetProduct[0].images;

        if (files && files.length > 0) {
            const newImageUrls = await Promise.all(
                files.map((file) => uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'products'))
            );
            imageUrls = [...imageUrls, ...newImageUrls];
        }

        const updates: any = {
            name: productData.name,
            sku: productData.sku,
            categoryId: productData.categoryId,
            description: productData.description,
            basePrice: productData.basePrice ? parseFloat(productData.basePrice) : undefined,
            discountPercentage: productData.discountPercentage !== undefined ? parseFloat(productData.discountPercentage) : undefined,
            stock: productData.stock !== undefined ? parseInt(productData.stock) : undefined,
            status: productData.status,
            images: imageUrls,
            updatedAt: new Date()
        };

        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

        const updatedProduct = await db.update(products).set(updates).where(eq(products.id, id)).returning();
        
        res.status(200).json(updatedProduct[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        await db.update(products).set({ status: 'DISABLED', updatedAt: new Date() }).where(eq(products.id, id));
        res.status(200).json({ message: 'Product disabled successfully' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProductReviewsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 20;
        const offset: number = (page - 1) * limit;

        const results = await db.select({
            id: productReviews.id,
            productId: productReviews.productId,
            productName: products.name,
            userId: productReviews.userId,
            userEmail: users.email,
            rating: productReviews.rating,
            comment: productReviews.comment,
            isVisible: productReviews.isVisible,
            createdAt: productReviews.createdAt
        })
        .from(productReviews)
        .leftJoin(products, eq(productReviews.productId, products.id))
        .leftJoin(users, eq(productReviews.userId, users.id))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(productReviews.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(productReviews);

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

export const toggleReviewVisibility = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const { isVisible } = req.body;

        const updatedReview = await db.update(productReviews)
            .set({ isVisible, updatedAt: new Date() })
            .where(eq(productReviews.id, id))
            .returning();

        if (updatedReview.length === 0) {
            res.status(404).json({ message: 'Review not found' });
            return;
        }

        res.status(200).json({ message: 'Review visibility updated', isVisible: updatedReview[0].isVisible });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};