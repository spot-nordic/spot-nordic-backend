import { Request, Response } from 'express';
import { db } from '../../configs/db.config';
import { blogs, users, blogComments, blogInteractions } from '../../db/schema';
import { eq, and, desc, sql, ilike, or, ne } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getPaginatedBlogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;
        const offset: number = (page - 1) * limit;
        const search: string = req.query.search as string;

        const conditions = [eq(blogs.status, 'PUBLISHED')];

        if (search) {
            conditions.push(or(ilike(blogs.title, `%${search}%`), ilike(blogs.htmlContent, `%${search}%`)) as any);
        }

        const baseQuery = db.select({
            id: blogs.id,
            title: blogs.title,
            slug: blogs.slug,
            thumbnailUrl: blogs.thumbnailUrl,
            publishedAt: blogs.publishedAt,
            viewsCount: blogs.viewsCount,
            likesCount: blogs.likesCount,
            dislikesCount: blogs.dislikesCount,
            authorName: users.firstName
        })
            .from(blogs)
            .leftJoin(users, eq(blogs.authorId, users.id));

        const results = await baseQuery
            .where(and(...conditions))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(blogs.publishedAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(blogs).where(and(...conditions));

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

export const getTrendingBlogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit: number = parseInt(req.query.limit as string) || 5;

        const results = await db.select({
            id: blogs.id,
            title: blogs.title,
            slug: blogs.slug,
            thumbnailUrl: blogs.thumbnailUrl,
            publishedAt: blogs.publishedAt,
            viewsCount: blogs.viewsCount,
            likesCount: blogs.likesCount,
            authorName: users.firstName
        })
            .from(blogs)
            .leftJoin(users, eq(blogs.authorId, users.id))
            .where(eq(blogs.status, 'PUBLISHED'))
            .limit(limit)
            .orderBy(desc(blogs.viewsCount), desc(blogs.likesCount));

        res.status(200).json(results);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getSuggestedBlogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const currentSlug: string = req.query.current as string;
        const limit: number = parseInt(req.query.limit as string) || 3;

        let conditions: any[] = [eq(blogs.status, 'PUBLISHED')];
        
        if (currentSlug) {
            conditions.push(ne(blogs.slug, currentSlug));
        }

        const results = await db.select({
            id: blogs.id,
            title: blogs.title,
            slug: blogs.slug,
            thumbnailUrl: blogs.thumbnailUrl,
            publishedAt: blogs.publishedAt,
            viewsCount: blogs.viewsCount,
            likesCount: blogs.likesCount,
            authorName: users.firstName
        })
            .from(blogs)
            .leftJoin(users, eq(blogs.authorId, users.id))
            .where(and(...conditions))
            .limit(limit)
            .orderBy(desc(blogs.likesCount));

        res.status(200).json(results);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getBlogBySlug = async (req: Request, res: Response): Promise<void> => {
    try {
        const slug: string = req.params.slug as string;

        const blogResult = await db.select({
            id: blogs.id,
            title: blogs.title,
            slug: blogs.slug,
            htmlContent: blogs.htmlContent,
            thumbnailUrl: blogs.thumbnailUrl,
            publishedAt: blogs.publishedAt,
            viewsCount: blogs.viewsCount,
            likesCount: blogs.likesCount,
            dislikesCount: blogs.dislikesCount,
            authorName: users.firstName
        })
            .from(blogs)
            .leftJoin(users, eq(blogs.authorId, users.id))
            .where(and(eq(blogs.slug, slug), eq(blogs.status, 'PUBLISHED')));

        if (blogResult.length === 0) {
            res.status(404).json({ message: 'Blog not found' });
            return;
        }

        res.status(200).json(blogResult[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const incrementBlogView = async (req: Request, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        
        await db.update(blogs)
            .set({ viewsCount: sql`${blogs.viewsCount} + 1` })
            .where(eq(blogs.id, id));

        res.status(200).json({ message: 'View incremented' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const interactBlog = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const blogId: string = req.params.id as string;
        const userId: string = req.user!.id;
        const { type } = req.body; 

        if (type !== 'LIKE' && type !== 'DISLIKE') {
            res.status(400).json({ message: 'Invalid interaction type' });
            return;
        }

        const existingInteraction = await db.select()
            .from(blogInteractions)
            .where(and(eq(blogInteractions.blogId, blogId), eq(blogInteractions.userId, userId)));

        if (existingInteraction.length > 0) {
            const currentType = existingInteraction[0].type;

            if (currentType === type) {
                await db.delete(blogInteractions).where(eq(blogInteractions.id, existingInteraction[0].id));
                
                if (type === 'LIKE') {
                    await db.update(blogs).set({ likesCount: sql`${blogs.likesCount} - 1` }).where(eq(blogs.id, blogId));
                } else {
                    await db.update(blogs).set({ dislikesCount: sql`${blogs.dislikesCount} - 1` }).where(eq(blogs.id, blogId));
                }
                
                res.status(200).json({ message: 'Interaction removed' });
                return;
            } else {
                await db.update(blogInteractions)
                    .set({ type, createdAt: new Date() })
                    .where(eq(blogInteractions.id, existingInteraction[0].id));

                if (type === 'LIKE') {
                    await db.update(blogs).set({ 
                        likesCount: sql`${blogs.likesCount} + 1`,
                        dislikesCount: sql`${blogs.dislikesCount} - 1`
                    }).where(eq(blogs.id, blogId));
                } else {
                    await db.update(blogs).set({ 
                        likesCount: sql`${blogs.likesCount} - 1`,
                        dislikesCount: sql`${blogs.dislikesCount} + 1`
                    }).where(eq(blogs.id, blogId));
                }

                res.status(200).json({ message: 'Interaction updated' });
                return;
            }
        } else {
            await db.insert(blogInteractions).values({
                blogId,
                userId,
                type
            });

            if (type === 'LIKE') {
                await db.update(blogs).set({ likesCount: sql`${blogs.likesCount} + 1` }).where(eq(blogs.id, blogId));
            } else {
                await db.update(blogs).set({ dislikesCount: sql`${blogs.dislikesCount} + 1` }).where(eq(blogs.id, blogId));
            }

            res.status(201).json({ message: 'Interaction added' });
        }
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getBlogComments = async (req: Request, res: Response): Promise<void> => {
    try {
        const blogId: string = req.params.id as string;
        
        const comments = await db.select({
            id: blogComments.id,
            content: blogComments.content,
            createdAt: blogComments.createdAt,
            user: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email
            }
        })
        .from(blogComments)
        .leftJoin(users, eq(blogComments.userId, users.id))
        .where(eq(blogComments.blogId, blogId))
        .orderBy(desc(blogComments.createdAt));

        res.status(200).json(comments);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const addBlogComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const blogId: string = req.params.id as string;
        const userId: string = req.user!.id;
        const { content } = req.body;

        if (!content || content.trim() === '') {
            res.status(400).json({ message: 'Comment content is required' });
            return;
        }

        const newComment = await db.insert(blogComments).values({
            blogId,
            userId,
            content
        }).returning();

        res.status(201).json(newComment[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};