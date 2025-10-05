import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as cartService from '../services/cart.service';

const getUserId = (req: Request): string => {
  const token = req.cookies.token;
  if (!token) throw new Error('Unauthorized');
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return decoded.id;
};

export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const cart = await cartService.getCart(userId);
    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { productId, quantity } = req.body;
    const cart = await cartService.addToCart(userId, productId, quantity || 1);
    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { productId, quantity } = req.body;
    const cart = await cartService.updateCartItem(userId, productId, quantity);
    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const cart = await cartService.removeFromCart(userId, req.params.productId);
    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const cart = await cartService.clearCart(userId);
    res.json(cart);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
