import { Response } from 'express'
import { db } from '../../configs/db.config'
import { carts, cartItems, products, orders, orderItems } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { createPayPalOrder, verifyAndCapturePayPalOrder } from '../../services/paypal.service'
import { uploadFileToS3 } from '../../services/upload.service'
import emailConfig from '../../configs/email.config'
import PDFDocument from 'pdfkit'

interface InvoiceOrder {
    id: string
    createdAt: Date | string
    status: string
    shippingStreet: string
    shippingCity: string
    shippingState: string
    shippingPincode: string
    shippingCountry: string
    paymentMethod: string
    currency: string
    paypalPaymentId?: string | null
    totalSubtotal: number
    taxPercentage: number
    taxCountry: string
    totalTax: number
    totalAmount: number
}

interface InvoiceItem {
    productId: string
    productName?: string | null
    quantity: number
    price: number
}

const getTaxPercentage = (countryCode: string): number => {
    const euCountries = ['SE', 'DK', 'NO', 'FI', 'DE', 'FR', 'IT', 'ES', 'NL']
    if (countryCode.toUpperCase() === 'SE') return 25.0
    if (euCountries.includes(countryCode.toUpperCase())) return 20.0
    if (countryCode.toUpperCase() === 'US') return 8.0
    return 0.0
}

const safeSendEmail = async (to: string | undefined, subject: string, html: string): Promise<void> => {
    try {
        if (!to || to.trim() === '') {
            console.warn(`Skipping email notification "${subject}": No recipient email defined.`)
            return
        }
        await emailConfig.sendEmail(to, subject, html)
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown email sending error'
        console.error(`Failed to send email to "${to}":`, errorMessage)
    }
}

const generateInvoicePDF = (order: InvoiceOrder, items: InvoiceItem[]): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const chunks: Buffer[] = []

        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        doc.fontSize(24).font('Helvetica-Bold').text('SPOT NORDIC', 50, 50)
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Order Invoice', 50, 80)

        doc.fillColor('#000000')
        doc.fontSize(10)
            .text(`Invoice ID: INV-${order.id.slice(0, 8).toUpperCase()}`, 350, 50, { align: 'right' })
            .text(`Order ID: ${order.id}`, 350, 65, { align: 'right' })
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}`, 350, 80, { align: 'right' })
            .text(`Status: ${order.status}`, 350, 95, { align: 'right' })

        doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#dddddd').stroke()

        doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text('Ship To', 50, 130)
        doc.fontSize(10).font('Helvetica')
            .text(order.shippingStreet, 50, 148)
            .text(`${order.shippingCity}, ${order.shippingState} ${order.shippingPincode}`, 50, 163)
            .text(order.shippingCountry, 50, 178)

        doc.fontSize(11).font('Helvetica-Bold').text('Payment', 300, 130)
        doc.fontSize(10).font('Helvetica')
            .text(`Method: ${order.paymentMethod}`, 300, 148)
            .text(`Currency: ${order.currency}`, 300, 163)
            .text(`Payment ID: ${order.paypalPaymentId || 'N/A'}`, 300, 178)

        doc.moveTo(50, 205).lineTo(545, 205).strokeColor('#dddddd').stroke()

        doc.fillColor('#f5f5f5').rect(50, 215, 495, 22).fill()
        doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
            .text('Product', 58, 221)
            .text('Qty', 340, 221)
            .text('Unit Price', 390, 221)
            .text('Total', 480, 221)

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

        y += 10
        doc.moveTo(350, y).lineTo(545, y).strokeColor('#dddddd').stroke()
        y += 12

        doc.fontSize(10).font('Helvetica').fillColor('#555555')
            .text('Subtotal', 350, y)
            .text(`${order.currency} ${order.totalSubtotal.toFixed(2)}`, 480, y)

        y += 18
        doc.text(`Tax (${order.taxPercentage}% — ${order.taxCountry})`, 350, y)
            .text(`${order.currency} ${order.totalTax.toFixed(2)}`, 480, y)

        y += 10
        doc.moveTo(350, y).lineTo(545, y).strokeColor('#dddddd').stroke()
        y += 12

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
            .text('Total', 350, y)
            .text(`${order.currency} ${order.totalAmount.toFixed(2)}`, 480, y)

        doc.fontSize(9).font('Helvetica').fillColor('#aaaaaa')
            .text('Thank you for your order.', 50, 720, { align: 'center', width: 495 })
            .text('Spot Nordic — spot-nordic.com', 50, 733, { align: 'center', width: 495 })

        doc.end()
    })
}

export const checkoutCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' })
            return
        }

        const userId: string = req.user.id
        const userEmail: string = req.user.email
        const {
            shippingStreet,
            shippingCity,
            shippingState,
            shippingPincode,
            shippingCountry,
            paymentMethod = 'PAYPAL'
        } = req.body

        const currency = 'EUR'

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

        const taxPercentage = getTaxPercentage(shippingCountry)
        const taxAmount = totalSubtotal * (taxPercentage / 100)
        const finalTotal = totalSubtotal + taxAmount

        const initialStatus = paymentMethod === 'WIRE_TRANSFER' ? 'PENDING_BANK_TRANSFER' : 'PENDING'

        const result = await db.transaction(async (tx) => {
            const newOrder = await tx
                .insert(orders)
                .values({
                    userId,
                    totalSubtotal: parseFloat(totalSubtotal.toFixed(2)),
                    totalTax: parseFloat(taxAmount.toFixed(2)),
                    totalAmount: parseFloat(finalTotal.toFixed(2)),
                    taxCountry: shippingCountry,
                    taxPercentage,
                    currency,
                    conversionRate: 1.0,
                    conversionCharge: 0.0,
                    status: initialStatus,
                    paymentMethod,
                    paymentStatus: 'PENDING',
                    shippingStreet,
                    shippingCity,
                    shippingState,
                    shippingPincode,
                    shippingCountry,
                })
                .returning()

            const orderId = newOrder[0].id

            await tx.insert(orderItems).values(
                items.map((item) => ({
                    orderId,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: parseFloat((item.basePrice * (1 - item.discountPercentage / 100)).toFixed(2)),
                    originalPrice: parseFloat(item.basePrice.toFixed(2)),
                }))
            )

            if (paymentMethod === 'WIRE_TRANSFER') {
                await tx.delete(cartItems).where(eq(cartItems.cartId, cart[0].id))
                return { newOrder: newOrder[0], orderId, paypalOrderId: null }
            }

            const paypalOrder = await createPayPalOrder(finalTotal, orderId)

            await tx
                .update(orders)
                .set({ paypalOrderId: paypalOrder.id })
                .where(eq(orders.id, orderId))

            return { newOrder: newOrder[0], orderId, paypalOrderId: paypalOrder.id }
        })

        if (paymentMethod === 'WIRE_TRANSFER') {
            await safeSendEmail(
                userEmail, 
                `Bank Transfer Instructions for Order #${result.orderId}`,
                `<h1>Thank you for your order!</h1><p>Your order #${result.orderId} has been placed. Please transfer <strong>${currency} ${finalTotal.toFixed(2)}</strong> to the following bank account:</p><ul><li><strong>Bank Name:</strong> Nordic Spot Bank</li><li><strong>IBAN:</strong> SE12345678901234567890</li><li><strong>BIC/SWIFT:</strong> NORSESSS</li><li><strong>Reference:</strong> ${result.orderId}</li></ul><p>IMPORTANT: Please open a support ticket on our website and provide your payment receipt so we can verify and dispatch your order.</p>`
            )

            await safeSendEmail(
                process.env.ADMIN_EMAIL, 
                'New Wire Transfer Order', 
                `A new wire transfer order #${result.orderId} was placed for ${currency} ${finalTotal}.`
            )

            res.status(200).json({
                order: result.newOrder,
                orderId: result.orderId,
                amount: finalTotal,
                currency,
                message: 'Wire transfer instructions sent.',
            })
            return
        }

        res.status(200).json({
            order: result.newOrder,
            paypalOrderId: result.paypalOrderId,
            orderId: result.orderId,
            amount: finalTotal,
            currency,
        })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Server error'
        res.status(500).json({ message: errorMessage })
    }
}

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' })
            return
        }

        const { orderId, paypalOrderId } = req.body

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!orderId || !uuidRegex.test(orderId)) {
            res.status(400).json({ message: 'Invalid orderId' })
            return
        }

        const isCaptured = await verifyAndCapturePayPalOrder(paypalOrderId)
        if (!isCaptured) {
            res.status(400).json({ message: 'Payment capture failed' })
            return
        }

        const orderData = await db.select().from(orders).where(eq(orders.id, orderId))
        if (orderData.length === 0) {
            res.status(404).json({ message: 'Order not found' })
            return
        }

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

        const fullOrder: InvoiceOrder = {
            ...orderData[0],
            paypalPaymentId: paypalOrderId,
        }

        const pdfBuffer = await generateInvoicePDF(fullOrder, orderItemsData)
        const fileName = `inv_${orderId.slice(0, 8)}_${Date.now()}.pdf`
        const invoiceUrl = await uploadFileToS3(pdfBuffer, fileName, 'application/pdf', 'invoices')

        const updatedOrder = await db.transaction(async (tx) => {
            const orderUpdate = await tx
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

            const cart = await tx.select().from(carts).where(eq(carts.userId, req.user.id))
            if (cart.length > 0) {
                await tx.delete(cartItems).where(eq(cartItems.cartId, cart[0].id))
            }

            return orderUpdate
        })

        await safeSendEmail(
            req.user.email,
            `Order Confirmed - #${orderId}`,
            `<h1>Your order has been confirmed!</h1><p>We are processing your order. You can view your invoice <a href="${invoiceUrl}">here</a>.</p>`
        )

        await safeSendEmail(
            process.env.ADMIN_EMAIL,
            `New Order Placed - #${orderId}`,
            `<h1>A new order has been placed!</h1><p>Order ID: ${orderId}</p><p>Total Amount: ${updatedOrder[0].currency} ${updatedOrder[0].totalAmount}</p>`
        )

        res.status(200).json({
            message: 'Payment verified successfully',
            order: updatedOrder[0],
        })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Server error'
        res.status(500).json({ message: errorMessage })
    }
}