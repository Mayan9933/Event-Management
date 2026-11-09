import { Router } from 'express';
import { login, registerStudent, me } from '../controllers/authController.js';
import * as p from '../controllers/platformController.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/login', asyncHandler(login));
router.post('/register/student', asyncHandler(registerStudent));
router.post('/organizer-request', asyncHandler(p.organizerRequest));
router.get('/events', asyncHandler(p.publishedEvents));
router.get('/me', authenticate, asyncHandler(me));

router.get('/admin/organizer-requests', authenticate, allowRoles('ADMIN'), asyncHandler(p.listRequests));
router.patch('/admin/organizer-requests/:id', authenticate, allowRoles('ADMIN'), asyncHandler(p.reviewRequest));
router.get('/admin/events', authenticate, allowRoles('ADMIN'), asyncHandler(p.allEvents));
router.get('/admin/stats', authenticate, allowRoles('ADMIN'), asyncHandler(p.stats));
router.get('/admin/users', authenticate, allowRoles('ADMIN'), asyncHandler(p.managedUsers));
router.delete('/admin/users/:id', authenticate, allowRoles('ADMIN'), asyncHandler(p.deleteUser));
router.delete('/admin/events/:id', authenticate, allowRoles('ADMIN'), asyncHandler(p.deleteEvent));
router.get('/admin/events/:id/registrations', authenticate, allowRoles('ADMIN'), asyncHandler(p.eventRegistrations));

router.post('/organizer/events', authenticate, allowRoles('ORGANIZER'), asyncHandler(p.createEvent));
router.get('/organizer/events', authenticate, allowRoles('ORGANIZER'), asyncHandler(p.myEvents));
router.get('/organizer/events/:id/registrations', authenticate, allowRoles('ORGANIZER'), asyncHandler(p.eventRegistrations));
router.put('/organizer/events/:id', authenticate, allowRoles('ORGANIZER'), asyncHandler(p.updateEvent));
router.patch('/organizer/events/:id/cancel', authenticate, allowRoles('ORGANIZER'), asyncHandler(p.cancelEvent));

router.post('/student/events/:id/register', authenticate, allowRoles('STUDENT'), asyncHandler(p.registerEvent));
router.get('/student/registrations', authenticate, allowRoles('STUDENT'), asyncHandler(p.myRegistrations));
router.get('/student/events/:id/registration-status', authenticate, allowRoles('STUDENT'), asyncHandler(p.registrationStatus));

export default router;
