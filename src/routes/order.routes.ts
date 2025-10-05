import { Router } from 'express';
import * as orderController from '../controllers/order.controller';

export const orderRoutes = Router();

orderRoutes.post('/', orderController.createOrder);
orderRoutes.get('/', orderController.getOrders);
orderRoutes.get('/:id', orderController.getOrder);
