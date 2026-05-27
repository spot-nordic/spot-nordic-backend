import { Response } from 'express'
import { db } from '../../configs/db.config'
import { carts, cartItems, products, orders, orderItems } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { createPayPalOrder, verifyAndCapturePayPalOrder } from '../../services/paypal.service'
import { uploadFileToS3 } from '../../services/upload.service'
import PDFDocument from 'pdfkit'

const getTaxPercentage = (countryCode: string): number => {
    const euCountries = ['SE', 'DK', 'NO', 'FI', 'DE', 'FR', 'IT', 'ES', 'NL']
    if (countryCode.toUpperCase() === 'SE') return 25.0
    if (euCountries.includes(countryCode.toUpperCase())) return 20.0
    if (countryCode.toUpperCase() === 'US') return 8.0
    return 0.0
}

const getCurrencyConversion = (currency: string): { rate: number; charge: number } => {
    const curr = currency.toUpperCase()
    if (curr === 'EUR') return { rate: 0.088, charge: 2.0 }
    if (curr === 'USD') return { rate: 0.095, charge: 2.5 }
    if (curr === 'GBP') return { rate: 0.075, charge: 1.5 }
    return { rate: 1.0, charge: 0.0 }
}

const generateInvoicePDF = (order: any, items: any[]): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const chunks: Buffer[] = []

        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('SPOT NORDIC', 50, 50)
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Order Invoice', 50, 80)

        // Invoice meta
        doc.fillColor('#000000')
        doc.fontSize(10)
            .text(`Invoice ID: INV-${order.id.slice(0, 8).toUpperCase()}`, 350, 50, { align: 'right' })
            .text(`Order ID: ${order.id}`, 350, 65, { align: 'right' })
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}`, 350, 80, { align: 'right' })
            .text(`Status: ${order.status}`, 350, 95, { align: 'right' })

        // Divider
        doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#dddddd').stroke()

        // Shipping address
        doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text('Ship To', 50, 130)
        doc.fontSize(10).font('Helvetica')
            .text(order.shippingStreet, 50, 148)
            .text(`${order.shippingCity}, ${order.shippingState} ${order.shippingPincode}`, 50, 163)
            .text(order.shippingCountry, 50, 178)

        // Payment info
        doc.fontSize(11).font('Helvetica-Bold').text('Payment', 300, 130)
        doc.fontSize(10).font('Helvetica')
            .text(`Method: PayPal`, 300, 148)
            .text(`Currency: ${order.currency}`, 300, 163)
            .text(`Payment ID: ${order.paypalPaymentId || 'N/A'}`, 300, 178)

        // Divider
        doc.moveTo(50, 205).lineTo(545, 205).strokeColor('#dddddd').stroke()

        // Table header
        doc.fillColor('#f5f5f5').rect(50, 215, 495, 22).fill()
        doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
            .text('Product', 58, 221)
            .text('Qty', 340, 221)
            .text('Unit Price', 390, 221)
            .text('Total', 480, 221)

        // Table rows
        let y = 245
        for (const item of items) {
            const unitPrice = item.price
            const lineTotal = unitPrice * item.quantity

            doc.fontSize(10).font('Helvetica').fillColor('#000000')
                .text(item.productName || item.productId, 58, y, { width: 270 })
                .text(String(item.quantity), 340, y)
                .text(`${order.currency} ${unitPrice.toFixed(2)}`, 390, y)
                .text(`${order.currency} ${lineTotal.toFixed(2)}`, 480, y)

            y += 22

            doc.moveTo(50, y - 3).lineTo(545, y - 3).strokeColor('#eeeeee').stroke()
        }

        // Totals block
        y += 10
        doc.moveTo(350, y).lineTo(545, y).strokeColor('#dddddd').stroke()
        y += 12

        doc.fontSize(10).font('Helvetica').fillColor('#555555')
            .text('Subtotal', 350, y)
            .text(`${order.currency} ${order.totalSubtotal.toFixed(2)}`, 480, y)

        y += 18
        doc.text(`Tax (${order.taxPercentage}% — ${order.taxCountry})`, 350, y)
            .text(`${order.currency} ${order.totalTax.toFixed(2)}`, 480, y)

        y += 18
        doc.text(`Conversion Charge`, 350, y)
            .text(`${order.currency} ${order.conversionCharge.toFixed(2)}`, 480, y)

        y += 10
        doc.moveTo(350, y).lineTo(545, y).strokeColor('#dddddd').stroke()
        y += 12

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
            .text('Total', 350, y)
            .text(`${order.currency} ${order.totalAmount.toFixed(2)}`, 480, y)

        // Footer
        doc.fontSize(9).font('Helvetica').fillColor('#aaaaaa')
            .text('Thank you for your order.', 50, 720, { align: 'center', width: 495 })
            .text('Spot Nordic — spot-nordic.com', 50, 733, { align: 'center', width: 495 })

        doc.end()
    })
}

export const checkoutCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId: string = req.user!.id
        const {
            shippingStreet,
            shippingCity,
            shippingState,
            shippingPincode,
            shippingCountry,
            currency = 'USD',
        } = req.body

        const cart = await db.select().from(carts).where(eq(carts.userId, userId))
        if (cart.length === 0) {
            res.status(400).json({ message: 'Cart is empty' })
            return
        }

        const items = await db
            .select({
                productId: cartItems.productId,
                quantity: cartItems.quantity,
                basePrice: products.basePrice,
                discountPercentage: products.discountPercentage,
                stock: products.stock,
            })
            .from(cartItems)
            .innerJoin(products, eq(cartItems.productId, products.id))
            .where(eq(cartItems.cartId, cart[0].id))

        if (items.length === 0) {
            res.status(400).json({ message: 'Cart is empty' })
            return
        }

        let totalSubtotal = 0
        for (const item of items) {
            if (item.stock < item.quantity) {
                res.status(400).json({ message: `Insufficient stock for product ID: ${item.productId}` })
                return
            }
            totalSubtotal += item.basePrice * (1 - item.discountPercentage / 100) * item.quantity
        }

        const { rate, charge } = getCurrencyConversion(currency)
        const taxPercentage = getTaxPercentage(shippingCountry)
        const subtotalConverted = totalSubtotal * rate
        const taxAmount = subtotalConverted * (taxPercentage / 100)
        const finalTotal = subtotalConverted + taxAmount + charge

        const newOrder = await db
            .insert(orders)
            .values({
                userId,
                totalSubtotal: parseFloat(subtotalConverted.toFixed(2)),
                totalTax: parseFloat(taxAmount.toFixed(2)),
                totalAmount: parseFloat(finalTotal.toFixed(2)),
                taxCountry: shippingCountry,
                taxPercentage,
                currency,
                conversionRate: rate,
                conversionCharge: charge,
                status: 'PENDING',
                paymentMethod: 'PAYPAL',
                paymentStatus: 'PENDING',
                shippingStreet,
                shippingCity,
                shippingState,
                shippingPincode,
                shippingCountry,
            })
            .returning()

        const orderId = newOrder[0].id

        await db.insert(orderItems).values(
            items.map((item) => ({
                orderId,
                productId: item.productId,
                quantity: item.quantity,
                price: parseFloat((item.basePrice * (1 - item.discountPercentage / 100) * rate).toFixed(2)),
                originalPrice: parseFloat((item.basePrice * rate).toFixed(2)),
            }))
        )

        const paypalOrder = await createPayPalOrder(finalTotal, orderId)

        await db
            .update(orders)
            .set({ paypalOrderId: paypalOrder.id })
            .where(eq(orders.id, orderId))

        res.status(200).json({
            order: newOrder[0],
            paypalOrderId: paypalOrder.id,
            orderId,
            amount: finalTotal,
            currency,
        })
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' })
    }
}

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orderId, paypalOrderId } = req.body

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!orderId || !uuidRegex.test(orderId)) {
            res.status(400).json({ message: 'Invalid orderId — must be a database UUID' })
            return
        }

        const isCaptured = await verifyAndCapturePayPalOrder(paypalOrderId)
        if (!isCaptured) {
            res.status(400).json({ message: 'Payment capture failed' })
            return
        }

        // Fetch full order details for PDF generation
        const orderData = await db.select().from(orders).where(eq(orders.id, orderId))
        if (orderData.length === 0) {
            res.status(404).json({ message: 'Order not found' })
            return
        }

        // Fetch order items with product names
        const orderItemsData = await db
            .select({
                productId: orderItems.productId,
                quantity: orderItems.quantity,
                price: orderItems.price,
                originalPrice: orderItems.originalPrice,
                productName: products.name,
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, orderId))

        const fullOrder = {
            ...orderData[0],
            paypalPaymentId: paypalOrderId,
        }

        // Generate PDF invoice and upload to S3
        const pdfBuffer = await generateInvoicePDF(fullOrder, orderItemsData)
        const fileName = `inv_${orderId.slice(0, 8)}_${Date.now()}.pdf`
        const invoiceUrl = await uploadFileToS3(pdfBuffer, fileName, 'application/pdf', 'invoices')

        const updatedOrder = await db
            .update(orders)
            .set({
                paymentStatus: 'COMPLETED',
                status: 'PROCESSING',
                paypalPaymentId: paypalOrderId,
                invoiceUrl,
                updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId))
            .returning()

        const cart = await db.select().from(carts).where(eq(carts.userId, req.user!.id))
        if (cart.length > 0) {
            await db.delete(cartItems).where(eq(cartItems.cartId, cart[0].id))
        }

        res.status(200).json({
            message: 'Payment verified successfully',
            order: updatedOrder[0],
        })
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' })
    }
}