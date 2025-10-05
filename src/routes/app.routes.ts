import { Router } from 'express';
import { create, list, detail, remove } from '../controllers/app.controller';

const router = Router();

router.post('/', create);
router.get('/', list);
router.get('/:id', detail);
router.delete('/:id', remove);

export { router as appRoutes };