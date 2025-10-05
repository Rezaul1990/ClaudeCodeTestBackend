import { Router } from 'express';
import { signup, signin, me, signout } from '../controllers/auth.controller';

const router = Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', me);
router.post('/signout', signout);

export { router as authRoutes };