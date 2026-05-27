import { Request, Response } from 'express';
import { db } from '../../configs/db.config';
import { blogs, blogComments, users } from '../../db/schema';
import { eq, desc, sql, ilike, or, and } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { uploadFileToS3 } from '../../services/upload.service';

export const getPaginatedBlogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;
        const search: string = (req.query.search as string) || '';
        const offset: number = (page - 1) * limit;

        let baseQuery = db.select({
            id: blogs.id,
            title: blogs.title,
            slug: blogs.slug,
            htmlContent: blogs.htmlContent,
            thumbnailUrl: blogs.thumbnailUrl,
            authorId: blogs.authorId,
            status: blogs.status,
            viewsCount: blogs.viewsCount,
            likesCount: blogs.likesCount,
            dislikesCount: blogs.dislikesCount,
            publishedAt: blogs.publishedAt,
            createdAt: blogs.createdAt,
            updatedAt: blogs.updatedAt
        }).from(blogs);
        let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(blogs);

        if (search) {
            const searchCondition = or(
                ilike(blogs.title, `%${search}%`),
                ilike(blogs.slug, `%${search}%`)
            );
            baseQuery = baseQuery.where(searchCondition as any) as any;
            countQuery = countQuery.where(searchCondition as any) as any;
        }

        const results = await baseQuery
            .limit(limit)
            .offset(offset)
            .orderBy(desc(blogs.createdAt));

        const totalCountResult = await countQuery;

        res.status(200).json({
            data: results,
            meta: {
                totalCount: totalCountResult[0].count,
                totalPages: Math.ceil(totalCountResult[0].count / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createBlog = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, slug, htmlContent, status } = req.body;
        const authorId: string = req.user!.id;
        const file = req.file as Express.Multer.File;

        let thumbnailUrl: string = '';
        if (file) {
            thumbnailUrl = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'blogs');
        }

        const publishedAt: Date | null = status === 'PUBLISHED' ? new Date() : null;

        const newBlog = await db.insert(blogs).values({
            title,
            slug,
            htmlContent,
            thumbnailUrl,
            authorId,
            status,
            publishedAt
        }).returning();

        res.status(201).json(newBlog[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateBlog = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const { title, slug, htmlContent, status } = req.body;
        const file = req.file as Express.Multer.File;

        const currentBlog = await db.select().from(blogs).where(eq(blogs.id, id));
        if (currentBlog.length === 0) {
            res.status(404).json({ message: 'Blog not found' });
            return;
        }

        let thumbnailUrl: string = currentBlog[0].thumbnailUrl;
        if (file) {
            thumbnailUrl = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'blogs');
        }

        const publishedAt: Date | null = status === 'PUBLISHED' && !currentBlog[0].publishedAt ? new Date() : currentBlog[0].publishedAt;

        const updatedBlog = await db.update(blogs)
            .set({ title, slug, htmlContent, status, publishedAt, thumbnailUrl, updatedAt: new Date() })
            .where(eq(blogs.id, id))
            .returning();

        res.status(200).json(updatedBlog[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteBlog = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        await db.delete(blogs).where(eq(blogs.id, id));
        res.status(200).json({ message: 'Blog deleted successfully' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getBlogCommentsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
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

export const deleteBlogCommentAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const commentId: string = req.params.commentId as string;
        await db.delete(blogComments).where(eq(blogComments.id, commentId));
        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};