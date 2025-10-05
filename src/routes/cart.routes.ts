import { Router } from 'express';
import * as cartController from '../controllers/cart.controller';

export const cartRoutes = Router();

cartRoutes.get('/', cartController.getCart);
cartRoutes.post('/add', cartController.addToCart);
cartRoutes.put('/update', cartController.updateCartItem);
cartRoutes.delete('/remove/:productId', cartController.removeFromCart);
cartRoutes.delete('/clear', cartController.clearCart);
