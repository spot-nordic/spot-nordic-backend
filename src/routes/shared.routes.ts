import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

import * as cartController from '../controllers/shared/cart.controller';
import * as chatController from '../controllers/shared/chat.controller';
import * as checkoutController from '../controllers/shared/checkout.controller';
import * as orderController from '../controllers/shared/order.controller';
import * as profileController from '../controllers/shared/profile.controller';
import * as ticketController from '../controllers/shared/ticket.controller';

const router = Router();

router.use(protect);

router.get('/cart', cartController.getMyCart);
router.post('/cart/add', cartController.addToCart);
router.put('/cart/:itemId', cartController.updateCartItemQuantity);
router.delete('/cart/clear', cartController.clearMyCart);
router.delete('/cart/:itemId', cartController.removeFromCart);

router.get('/chat/conversations', chatController.getMyConversations);
router.get('/chat/history/:targetUserId', chatController.getChatHistory);
router.post('/chat/send', upload.single('file'), chatController.sendMessageWithAttachment);
router.get('/chat/tickets/:ticketId', chatController.getTicketMessages);
router.post('/chat/tickets/:ticketId/send', upload.single('file'), chatController.sendTicketMessage);

router.post('/checkout', checkoutController.checkoutCart);
router.post('/checkout/verify-payment', checkoutController.verifyPayment);

router.get('/orders', orderController.getDetailedOrders);
router.get('/orders/:orderId', orderController.getOrderById);

router.get('/profile', profileController.getMyProfile);
router.put('/profile', profileController.updateMyProfile);

router.get('/tickets', ticketController.getMyTickets);
router.post('/tickets', ticketController.createTicket);
router.get('/tickets/:ticketId', ticketController.getTicketDetails);
router.put('/tickets/:ticketId/resolve', ticketController.resolveMyTicket);

export default router;