import { Router } from 'express';
import * as productController from '../controllers/product.controller';

export const productRoutes = Router();

productRoutes.post('/', productController.createProduct);
productRoutes.get('/low-stock', productController.getLowStockProducts);
productRoutes.get('/low-stock/csv', productController.downloadLowStockCSV);
productRoutes.post('/stock/upload', productController.uploadStockCSV);
productRoutes.post('/upload', productController.uploadProductsCSV);
productRoutes.get('/', productController.getProducts);
productRoutes.get('/:id', productController.getProduct);
productRoutes.put('/:id', productController.updateProduct);
productRoutes.delete('/:id', productController.deleteProduct);
