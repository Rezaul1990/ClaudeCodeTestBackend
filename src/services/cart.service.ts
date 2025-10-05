import mongoose from 'mongoose';
import { CartModel } from '../models/cart.model';
import { ProductModel } from '../models/product.model';

export const getCart = async (userId: string) => {
  const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  if (!cart) {
    const newCart = new CartModel({ userId: new mongoose.Types.ObjectId(userId), items: [] });
    await newCart.save();
    return newCart;
  }
  return cart;
};

export const addToCart = async (userId: string, productId: string, quantity: number = 1) => {
  const product = await ProductModel.findById(productId);
  if (!product) throw new Error('Product not found');
  if (product.stock < quantity) throw new Error('Insufficient stock');

  let cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });

  if (!cart) {
    cart = new CartModel({
      userId: new mongoose.Types.ObjectId(userId),
      items: []
    });
  }

  const existingItemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId
  );

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += quantity;
  } else {
    cart.items.push({
      productId: new mongoose.Types.ObjectId(productId),
      quantity,
      price: product.price,
      name: product.name,
      image: product.image
    });
  }

  await cart.save();
  return cart;
};

export const updateCartItem = async (userId: string, productId: string, quantity: number) => {
  if (quantity < 1) throw new Error('Quantity must be at least 1');

  const product = await ProductModel.findById(productId);
  if (!product) throw new Error('Product not found');
  if (product.stock < quantity) throw new Error('Insufficient stock');

  const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  if (!cart) throw new Error('Cart not found');

  const itemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId
  );

  if (itemIndex === -1) throw new Error('Item not in cart');

  cart.items[itemIndex].quantity = quantity;
  await cart.save();
  return cart;
};

export const removeFromCart = async (userId: string, productId: string) => {
  const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  if (!cart) throw new Error('Cart not found');

  cart.items = cart.items.filter(
    item => item.productId.toString() !== productId
  );

  await cart.save();
  return cart;
};

export const clearCart = async (userId: string) => {
  const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  return cart;
};
