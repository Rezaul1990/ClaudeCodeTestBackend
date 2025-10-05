import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import * as stockController from '../../controllers/warehouse/stock.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

// Stock queries
router.get('/', stockController.getStocksHandler);
router.get('/product/:productId', stockController.getStocksByProductHandler);

// Stock operations
router.post(
  '/adjust',
  requireRole(['admin', 'manager', 'staff']),
  stockController.adjustStockHandler
);
router.post(
  '/transfer',
  requireRole(['admin', 'manager']),
  stockController.transferStockHandler
);
router.post('/reserve', stockController.reserveStockHandler);
router.post('/unreserve', stockController.unreserveStockHandler);

// CSV operations
router.post(
  '/import',
  requireRole(['admin', 'manager']),
  upload.single('file'),
  stockController.importStocksFromCSVHandler
);
router.get('/export', stockController.exportStocksToCSVHandler);

// Inventory movements (ledger)
router.get('/movements', stockController.getInventoryMovementsHandler);

export { router as stockRoutes };
