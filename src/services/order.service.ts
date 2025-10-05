import { z } from 'zod';
import mongoose from 'mongoose';
import { OrderModel } from '../models/order.model';
import { CartModel } from '../models/cart.model';
import { ProductModel } from '../models/product.model';

export const customerInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  address: z.string().min(1, 'Address is required'),
  contactNumber: z.string().min(1, 'Contact number is required')
});

export type CustomerInfo = z.infer<typeof customerInfoSchema>;

export const createOrder = async (userId: string, customerInfo: CustomerInfo) => {
  const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });

  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  // Validate stock availability for all items
  for (const item of cart.items) {
    const product = await ProductModel.findOne({
      _id: item.productId
    });

    if (!product) {
      throw new Error(`Product ${item.name} not found`);
    }

    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${item.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
    }
  }

  // Deduct stock for all items
  for (const item of cart.items) {
    await ProductModel.findOneAndUpdate(
      {
        _id: item.productId
      },
      { $inc: { stock: -item.quantity } }
    );
  }

  const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const order = new OrderModel({
    userId: new mongoose.Types.ObjectId(userId),
    items: cart.items.map(item => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image
    })),
    total,
    customerInfo,
    status: 'pending'
  });

  await order.save();

  // Clear cart after order
  cart.items = [];
  await cart.save();

  return order;
};

export const getOrders = async (userId: string) => {
  return await OrderModel.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 });
};

export const getOrderById = async (userId: string, orderId: string) => {
  const order = await OrderModel.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!order) throw new Error('Order not found');
  return order;
};
