import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authRoutes } from './routes/auth.routes';
import { appRoutes } from './routes/app.routes';
import { productRoutes } from './routes/product.routes';
import { cartRoutes } from './routes/cart.routes';
import { orderRoutes } from './routes/order.routes';
import { locationRoutes } from './routes/warehouse/location.routes';
import { stockRoutes } from './routes/warehouse/stock.routes';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.WEB_ORIGIN,
  credentials: true
}));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/apps', appRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/stocks', stockRoutes);

export { app };