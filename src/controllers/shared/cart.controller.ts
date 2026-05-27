import { Response } from 'express';
import { db } from '../../configs/db.config';
import { carts, cartItems, products } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getMyCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;

        let cart = await db.select().from(carts).where(eq(carts.userId, userId));
        if (cart.length === 0) {
            cart = await db.insert(carts).values({ userId }).returning();
        }

        const items = await db.select({
            id: cartItems.id,
            productId: products.id,
            name: products.name,
            sku: products.sku,
            basePrice: products.basePrice,
            discountPercentage: products.discountPercentage,
            quantity: cartItems.quantity,
            images: products.images,
            stock: products.stock
        })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.cartId, cart[0].id));

        res.status(200).json({ cart: cart[0], items });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const addToCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const { productId, quantity } = req.body;

        const product = await db.select().from(products).where(eq(products.id, String(productId)));
        if (product.length === 0 || product[0].status !== 'ACTIVE') {
            res.status(404).json({ message: 'Product not found or inactive' });
            return;
        }

        if (product[0].stock < quantity) {
            res.status(400).json({ message: 'Insufficient stock' });
            return;
        }

        let cart = await db.select().from(carts).where(eq(carts.userId, userId));
        if (cart.length === 0) {
            cart = await db.insert(carts).values({ userId }).returning();
        }

        const existingItem = await db.select().from(cartItems).where(
            and(eq(cartItems.cartId, cart[0].id), eq(cartItems.productId, String(productId)))
        );

        const totalQty = (existingItem.length > 0 ? existingItem[0].quantity : 0) + quantity;

        if (existingItem.length > 0) {
            await db.update(cartItems).set({ quantity: totalQty }).where(eq(cartItems.id, existingItem[0].id));
        } else {
            await db.insert(cartItems).values({ cartId: cart[0].id, productId: String(productId), quantity });
        }

        await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart[0].id));

        res.status(200).json({ message: 'Added to cart successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateCartItemQuantity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const itemId: string = String(req.params.itemId);
        const { quantity } = req.body;

        if (quantity <= 0) {
            await db.delete(cartItems).where(eq(cartItems.id, itemId));
            res.status(200).json({ message: 'Item removed from cart' });
            return;
        }

        const existingItem = await db.select().from(cartItems).where(eq(cartItems.id, itemId));
        if (existingItem.length === 0) {
            res.status(404).json({ message: 'Cart item not found' });
            return;
        }

        const product = await db.select().from(products).where(eq(products.id, existingItem[0].productId));
        if (product[0].stock < quantity) {
            res.status(400).json({ message: 'Insufficient stock available' });
            return;
        }

        await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId));
        await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, existingItem[0].cartId));

        res.status(200).json({ message: 'Quantity updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const removeFromCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const itemId: string = String(req.params.itemId);
        await db.delete(cartItems).where(eq(cartItems.id, itemId));
        res.status(200).json({ message: 'Item removed from cart' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const clearMyCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id;
        const cart = await db.select().from(carts).where(eq(carts.userId, userId));
        
        if (cart.length > 0) {
            await db.delete(cartItems).where(eq(cartItems.cartId, cart[0].id));
        }
        
        res.status(200).json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};