import mongoose from 'mongoose';
import { app } from './app';
import { ProductModel } from './models/product.model';

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('MongoDB connected');

  // Clean up old sku index
  try {
    const collection = ProductModel.collection;
    const indexes = await collection.indexes();
    const skuIndexExists = indexes.some((index: any) => index.key && index.key.sku !== undefined);
    if (skuIndexExists) {
      await collection.dropIndex('sku_1');
      console.log('✓ Dropped old sku_1 index');
    }
  } catch (error: any) {
    if (error.code !== 27) { // 27 = IndexNotFound
      console.log('Note: sku_1 index cleanup attempted');
    }
  }
};

const startServer = async () => {
  await connectDB();
  const port = process.env.API_PORT || 4000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer().catch(console.error);