import { Router } from 'express';
import * as blogController from '../controllers/public/blog.controller';
import * as contactController from '../controllers/public/contact.controller';
import * as docController from '../controllers/public/documentation.controller';
import * as faqController from '../controllers/public/faq.controller';
import * as privacyController from '../controllers/public/privacy.controller';
import * as shopController from '../controllers/public/shop.controller';
import * as termsController from '../controllers/public/terms.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/blogs', blogController.getPaginatedBlogs);
router.get('/blogs/trending', blogController.getTrendingBlogs);
router.get('/blogs/suggested', blogController.getSuggestedBlogs);
router.get('/blogs/:slug', blogController.getBlogBySlug);
router.post('/blogs/:id/view', blogController.incrementBlogView);
router.get('/blogs/:id/comments', blogController.getBlogComments);

router.post('/blogs/:id/interact', protect, blogController.interactBlog);
router.post('/blogs/:id/comments', protect, blogController.addBlogComment);

router.post('/contact', contactController.submitContactRequest);

router.get('/docs/tree', docController.getDocumentationTree);
router.get('/docs/:slug', docController.getDocumentationPage);

router.get('/faqs', faqController.getActiveFaqs);

router.get('/privacy/active', privacyController.getActivePolicy);

router.get('/shop', shopController.browseProducts);
router.get('/shop/categories', shopController.getCategories);
router.get('/shop/:id', shopController.getProductDetails);
router.get('/shop/:id/suggested', shopController.getSuggestedProducts);
router.get('/shop/:id/reviews', shopController.getProductReviews);
router.post('/shop/:id/reviews', protect, shopController.addProductReview);

router.get('/terms/active', termsController.getActiveTerm);

export default router;