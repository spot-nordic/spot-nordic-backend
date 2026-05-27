import { Request, Response } from 'express';
import { db } from '../../configs/db.config';
import { documentationNodes, documentationAssets } from '../../db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const getDocumentationTree = async (req: Request, res: Response): Promise<void> => {
    try {
        const allNodes = await db.select({
            id: documentationNodes.id,
            title: documentationNodes.title,
            slug: documentationNodes.slug,
            parentId: documentationNodes.parentId,
            isGroup: documentationNodes.isGroup,
            sortOrder: documentationNodes.sortOrder
        })
        .from(documentationNodes)
        .where(eq(documentationNodes.status, 'PUBLISHED'))
        .orderBy(asc(documentationNodes.sortOrder));

        res.status(200).json(allNodes);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getDocumentationPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { slug } = req.params;

        const node = await db.select()
            .from(documentationNodes)
            .where(and(
                eq(documentationNodes.slug, String(slug)), 
                eq(documentationNodes.status, 'PUBLISHED')
            ));

        if (node.length === 0) {
            res.status(404).json({ message: 'Documentation page not found' });
            return;
        }

        const assets = await db.select()
            .from(documentationAssets)
            .where(eq(documentationAssets.nodeId, node[0].id));

        res.status(200).json({ 
            ...node[0], 
            assets 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};