import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as orderService from '../services/order.service';

const getUserId = (req: Request): string => {
  const token = req.cookies.token;
  if (!token) throw new Error('Unauthorized');
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return decoded.id;
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const customerInfo = orderService.customerInfoSchema.parse(req.body);
    const order = await orderService.createOrder(userId, customerInfo);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const orders = await orderService.getOrders(userId);
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const order = await orderService.getOrderById(userId, req.params.id);
    res.json(order);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
};
