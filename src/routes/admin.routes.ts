import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { upload } from '../middlewares/upload.middleware';

import * as blogController from '../controllers/admin/blog.controller';
import * as contactController from '../controllers/admin/contact.controller';
import * as dashboardController from '../controllers/admin/dashboard.controller';
import * as docController from '../controllers/admin/documentation.controller';
import * as faqController from '../controllers/admin/faq.controller';
import * as orderController from '../controllers/admin/order.controller';
import * as privacyController from '../controllers/admin/privacy.controller';
import * as productController from '../controllers/admin/product.controller';
import * as termsController from '../controllers/admin/terms.controller';
import * as ticketController from '../controllers/admin/ticket.controller';
import * as userController from '../controllers/admin/user.controller';
import * as chatController from '../controllers/shared/chat.controller';
import * as newsletterController from '../controllers/admin/newsletter.controller';

const router = Router();

router.use(protect, authorize('ADMIN', 'SUBADMIN'));

router.get('/dashboard/stats', dashboardController.getAdminDashboardStats);

router.get('/blogs', blogController.getPaginatedBlogs);
router.get('/blogs/check-slug', blogController.checkBlogSlugAvailability);
router.post('/blogs', upload.single('thumbnail'), blogController.createBlog);
router.post('/blogs/upload-image', upload.single('image'), blogController.uploadBlogImage);
router.put('/blogs/:id', upload.single('thumbnail'), blogController.updateBlog);
router.delete('/blogs/:id', blogController.deleteBlog);
router.get('/blogs/:id/comments', blogController.getBlogCommentsAdmin);
router.delete('/blogs/comments/:commentId', blogController.deleteBlogCommentAdmin);

router.get('/contacts', contactController.getPaginatedContactRequests);
router.put('/contacts/:id/status', contactController.updateContactRequestStatus);
router.delete('/contacts/:id', contactController.deleteContactRequest);

router.get('/docs', docController.getDocumentationNodes);
router.get('/docs/:id', docController.getDocNodeById);
router.get('/docs/:id/assets', docController.getDocAssets);
router.post('/docs', docController.createDocNode);
router.put('/docs/:id', docController.updateDocNode);
router.delete('/docs/:id', docController.deleteDocNode);
router.post('/docs/assets', upload.single('file'), docController.uploadDocAsset);

router.get('/faqs', faqController.getPaginatedFaqsAdmin);
router.post('/faqs', faqController.createFaq);
router.post('/faqs/upload-image', upload.single('image'), faqController.uploadFaqImage);
router.put('/faqs/:id', faqController.updateFaq);
router.delete('/faqs/:id', faqController.deleteFaq);

router.get('/newsletter/subscribers', newsletterController.getSubscribers);
router.post('/newsletter/subscribers', newsletterController.addSubscriber);
router.post('/newsletter/broadcast', newsletterController.broadcastNewsletter);
router.post('/newsletter/upload-image', upload.single('image'), newsletterController.uploadNewsletterImage);

router.get('/orders', orderController.getAllOrders);
router.put('/orders/:id/status', orderController.updateOrderStatus);
router.post('/orders/:id/invoice', upload.single('invoice'), orderController.uploadOrderInvoice);

router.get('/privacy', privacyController.getPaginatedPolicies);
router.post('/privacy', privacyController.createPolicy);
router.put('/privacy/:id', privacyController.updatePolicy);
router.patch('/privacy/:id/activate', privacyController.activatePolicy);
router.delete('/privacy/:id', privacyController.deletePolicy);

router.post('/products/category', productController.createCategory);
router.get('/products/category', productController.getCategories);
router.get('/products/category/check-slug', productController.checkCategorySlugAvailability);
router.put('/products/category/:id', productController.updateCategory);
router.delete('/products/category/:id', productController.deleteCategory);

router.get('/products', productController.getPaginatedProducts);
router.get('/products/check-sku', productController.checkSkuAvailability);
router.post('/products', upload.array('images', 5), productController.createProduct);
router.put('/products/:id', upload.array('images', 5), productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

router.get('/products/reviews', productController.getProductReviewsAdmin);
router.patch('/products/reviews/:id/visibility', productController.toggleReviewVisibility);

router.get('/terms', termsController.getPaginatedTerms);
router.post('/terms', termsController.createTerm);
router.put('/terms/:id', termsController.updateTerm);
router.patch('/terms/:id/activate', termsController.activateTerm);
router.delete('/terms/:id', termsController.deleteTerm);

router.get('/tickets', ticketController.getAllTickets);
router.post('/tickets/user', ticketController.createTicketForUser); 
router.get('/tickets/:ticketId', ticketController.getTicketDetailsAdmin);
router.put('/tickets/:ticketId/status', ticketController.updateTicketStatus);
router.delete('/tickets/:ticketId', ticketController.deleteTicket);

router.get('/chat/conversations', chatController.getMyConversations);
router.get('/chat/history/:targetUserId', chatController.getChatHistory);
router.post('/chat/send', upload.single('file'), chatController.sendMessageWithAttachment);

router.get('/users', userController.getPaginatedUsers);
router.put('/users/:id/status', userController.updateUserStatus);
router.delete('/users/:id', userController.hardDeleteUser);

router.post('/users/subadmin', authorize('ADMIN'), userController.createSubAdmin);
router.put('/users/subadmin/:id/permissions', authorize('ADMIN'), userController.updateSubAdminPermissions);

export default router;