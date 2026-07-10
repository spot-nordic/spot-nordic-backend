import { Response } from 'express';
import { db } from '../../configs/db.config';
import { documentationNodes, documentationAssets } from '../../db/schema';
import { eq, asc } from 'drizzle-orm';
import { uploadFileToS3 } from '../../services/upload.service';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getDocumentationNodes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const results = await db.select({
            id: documentationNodes.id,
            title: documentationNodes.title,
            slug: documentationNodes.slug,
            parentId: documentationNodes.parentId,
            isGroup: documentationNodes.isGroup,
            sortOrder: documentationNodes.sortOrder,
            status: documentationNodes.status
        })
        .from(documentationNodes)
        .orderBy(asc(documentationNodes.sortOrder));

        res.status(200).json(results);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getDocNodeById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const result = await db.select()
            .from(documentationNodes)
            .where(eq(documentationNodes.id, id));

        if (result.length === 0) {
            res.status(404).json({ message: 'Node not found' });
            return;
        }

        res.status(200).json(result[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getDocAssets = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const results = await db.select()
            .from(documentationAssets)
            .where(eq(documentationAssets.nodeId, id));

        res.status(200).json(results);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createDocNode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, slug, parentId, isGroup, htmlContent, metaTitle, metaDescription, sortOrder, status } = req.body;
        const authorId: string = req.user!.id;

        const newNode = await db.insert(documentationNodes).values({
            title,
            slug,
            parentId: parentId || null,
            isGroup: isGroup ?? false,
            htmlContent,
            metaTitle,
            metaDescription,
            sortOrder: sortOrder || 0,
            authorId,
            status: status || 'DRAFT'
        }).returning();

        res.status(201).json(newNode[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateDocNode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        const updates = req.body;

        updates.updatedAt = new Date();
        const updatedNode = await db.update(documentationNodes)
            .set(updates)
            .where(eq(documentationNodes.id, id))
            .returning();

        if (updatedNode.length === 0) {
            res.status(404).json({ message: 'Node not found' });
            return;
        }

        res.status(200).json(updatedNode[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteDocNode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id as string;
        await db.delete(documentationNodes).where(eq(documentationNodes.id, id));
        res.status(200).json({ message: 'Node deleted successfully' });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const uploadDocAsset = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { nodeId } = req.body;
        const file = req.file as Express.Multer.File;

        if (!file) {
            res.status(400).json({ message: 'No file provided' });
            return;
        }

        const fileUrl: string = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'documentation');

        const newAsset = await db.insert(documentationAssets).values({
            nodeId: nodeId || null,
            fileName: file.originalname,
            fileUrl,
            fileType: file.mimetype,
            fileSize: file.size
        }).returning();

        res.status(201).json(newAsset[0]);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error' });
    }
};