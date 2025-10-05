import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import * as productService from '../services/product.service';

const getUserId = (req: Request): string => {
  const token = req.cookies.token;
  if (!token) throw new Error('Unauthorized');
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return decoded.id;
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const data = productService.productSchema.parse(req.body);
    const product = await productService.createProduct(userId, data);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const products = await productService.getProducts(userId);
    res.json(products);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const product = await productService.getProductById(userId, req.params.id);
    res.json(product);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const product = await productService.updateProduct(userId, req.params.id, req.body);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await productService.deleteProduct(userId, req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 5;
    const products = await productService.getLowStockProducts(userId, threshold);
    res.json(products);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const downloadLowStockCSV = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 5;
    const products = await productService.getLowStockProducts(userId, threshold);

    // CSV header
    const csvRows = ['name,category,price,stock'];

    // CSV data
    products.forEach(product => {
      csvRows.push(`${product.name},${product.category},${product.price},${product.stock}`);
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=low-stock-products.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Multer configuration for CSV upload
const upload = multer({ storage: multer.memoryStorage() });

export const uploadStockCSV = [
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Parse CSV
      const csvData: { name: string; stock: number }[] = [];
      const stream = Readable.from(req.file.buffer);

      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (row) => {
            csvData.push({
              name: row.name,
              stock: parseInt(row.stock)
            });
          })
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });

      if (csvData.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty or invalid' });
      }

      // Bulk update stock
      const result = await productService.bulkUpdateStockFromCSV(userId, csvData);

      res.json({
        message: 'Stock update completed',
        ...result
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
];

export const uploadProductsCSV = [
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Parse CSV
      const csvData: { name: string; description: string; price: number; stock: number; category: string; image?: string }[] = [];
      const stream = Readable.from(req.file.buffer);

      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (row) => {
            csvData.push({
              name: row.name,
              description: row.description,
              price: parseFloat(row.price),
              stock: row.stock ? parseInt(row.stock) : 0,
              category: row.category,
              image: row.image || undefined
            });
          })
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });

      if (csvData.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty or invalid' });
      }

      // Bulk create products
      const result = await productService.bulkCreateProductsFromCSV(userId, csvData);

      res.json({
        message: 'Product upload completed',
        ...result
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
];
