import { z } from 'zod';
import { ProductModel } from '../models/product.model';
import mongoose from 'mongoose';

export const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  image: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  category: z.string().min(1)
});

export type ProductData = z.infer<typeof productSchema>;

export const createProduct = async (userId: string, data: ProductData) => {
  const product = new ProductModel({
    ...data,
    userId: new mongoose.Types.ObjectId(userId)
  });
  await product.save();
  return product;
};

export const getProducts = async (userId: string) => {
  return await ProductModel.find({ userId }).sort({ createdAt: -1 });
};

export const getProductById = async (userId: string, id: string) => {
  const product = await ProductModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId)
  });
  if (!product) throw new Error('Product not found');
  return product;
};

export const updateProduct = async (userId: string, id: string, data: Partial<ProductData>) => {
  const product = await ProductModel.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) },
    data,
    { new: true }
  );
  if (!product) throw new Error('Product not found');
  return product;
};

export const deleteProduct = async (userId: string, id: string) => {
  const product = await ProductModel.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId)
  });
  if (!product) throw new Error('Product not found');
};

export const getLowStockProducts = async (userId: string, threshold: number = 5) => {
  return await ProductModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    stock: { $lt: threshold }
  }).sort({ stock: 1 });
};

export interface StockUpdateResult {
  success: number;
  failed: number;
  errors: string[];
}

export const bulkUpdateStockFromCSV = async (userId: string, csvData: { name: string; stock: number }[]): Promise<StockUpdateResult> => {
  const result: StockUpdateResult = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const row of csvData) {
    try {
      if (!row.name || row.stock === undefined || row.stock === null) {
        result.failed++;
        result.errors.push(`Invalid data: name=${row.name}, stock=${row.stock}`);
        continue;
      }

      const stockValue = Number(row.stock);
      if (isNaN(stockValue)) {
        result.failed++;
        result.errors.push(`Invalid stock value for product ${row.name}: ${row.stock}`);
        continue;
      }

      const product = await ProductModel.findOneAndUpdate(
        {
          name: row.name,
          userId: new mongoose.Types.ObjectId(userId)
        },
        { $set: { stock: stockValue } },
        { new: true }
      );

      if (!product) {
        result.failed++;
        result.errors.push(`Product not found or unauthorized: ${row.name}`);
        continue;
      }

      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Error updating product ${row.name}: ${(error as Error).message}`);
    }
  }

  return result;
};

export const bulkCreateProductsFromCSV = async (userId: string, csvData: { name: string; description: string; price: number; stock: number; category: string; image?: string }[]): Promise<StockUpdateResult> => {
  const result: StockUpdateResult = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const row of csvData) {
    try {
      if (!row.name || !row.description || !row.price || !row.category) {
        result.failed++;
        result.errors.push(`Missing required fields for product: ${row.name || 'Unknown'}`);
        continue;
      }

      const price = Number(row.price);
      const stock = row.stock !== undefined ? Number(row.stock) : 0;

      if (isNaN(price) || price < 0) {
        result.failed++;
        result.errors.push(`Invalid price for product ${row.name}: ${row.price}`);
        continue;
      }

      if (isNaN(stock) || stock < 0) {
        result.failed++;
        result.errors.push(`Invalid stock for product ${row.name}: ${row.stock}`);
        continue;
      }

      // Check if product with same name already exists for this user
      const existingProduct = await ProductModel.findOne({
        name: row.name,
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (existingProduct) {
        result.failed++;
        result.errors.push(`Product already exists: ${row.name}`);
        continue;
      }

      const product = new ProductModel({
        userId: new mongoose.Types.ObjectId(userId),
        name: row.name,
        description: row.description,
        price,
        stock,
        category: row.category,
        image: row.image
      });

      await product.save();
      result.success++;
    } catch (error) {
      result.failed++;
      if ((error as any).code === 11000) {
        result.errors.push(`Product already exists: ${row.name}`);
      } else {
        result.errors.push(`Error creating product ${row.name}: ${(error as Error).message}`);
      }
    }
  }

  return result;
};
