import { z } from 'zod';
import { StockModel, IStock } from '../../models/stock.model';
import { LocationModel } from '../../models/location.model';
import { ProductModel } from '../../models/product.model';
import { InventoryMovementModel, MovementType } from '../../models/inventory-movement.model';
import mongoose from 'mongoose';
import { PaginatedResult } from './location.service';
import { stringify } from 'csv-stringify/sync';

export const adjustStockSchema = z.object({
  productId: z.string(),
  locationId: z.string(),
  delta: z.number().int(),
  reason: z.string().min(3).max(500)
});

export const transferStockSchema = z.object({
  productId: z.string(),
  fromLocationId: z.string(),
  toLocationId: z.string(),
  quantity: z.number().int().min(1),
  reason: z.string().min(3).max(500)
});

export const reserveStockSchema = z.object({
  productId: z.string(),
  locationId: z.string(),
  quantity: z.number().int().min(0),
  orderId: z.string().optional()
});

export type AdjustStockData = z.infer<typeof adjustStockSchema>;
export type TransferStockData = z.infer<typeof transferStockSchema>;
export type ReserveStockData = z.infer<typeof reserveStockSchema>;

export interface StockFilters {
  productId?: string;
  locationId?: string;
  page?: number;
  limit?: number;
}

export async function getStocks(
  userId: string,
  filters: StockFilters = {}
): Promise<PaginatedResult<IStock>> {
  const query: any = { userId: new mongoose.Types.ObjectId(userId) };

  if (filters.productId) {
    query.productId = new mongoose.Types.ObjectId(filters.productId);
  }
  if (filters.locationId) {
    query.locationId = new mongoose.Types.ObjectId(filters.locationId);
  }

  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    StockModel.find(query)
      .populate('productId', 'name sku')
      .populate('locationId', 'code name')
      .skip(skip)
      .limit(limit),
    StockModel.countDocuments(query)
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function getStocksByProduct(userId: string, productId: string): Promise<IStock[]> {
  return await StockModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    productId: new mongoose.Types.ObjectId(productId)
  })
    .populate('productId', 'name sku')
    .populate('locationId', 'code name')
    .sort({ 'locationId.name': 1 });
}

export async function adjustStock(userId: string, data: AdjustStockData): Promise<IStock> {
  // Find or create stock record
  let stock = await StockModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    productId: new mongoose.Types.ObjectId(data.productId),
    locationId: new mongoose.Types.ObjectId(data.locationId)
  });

  if (!stock) {
    stock = new StockModel({
      userId: new mongoose.Types.ObjectId(userId),
      productId: new mongoose.Types.ObjectId(data.productId),
      locationId: new mongoose.Types.ObjectId(data.locationId),
      quantity: 0,
      reservedQuantity: 0
    });
  }

  // Calculate new quantity
  const newQuantity = stock.quantity + data.delta;

  // Check negative stock constraint
  if (newQuantity < 0) {
    const location = await LocationModel.findById(data.locationId);
    if (!location || !location.allowNegativeStock) {
      throw new Error(`Negative stock not allowed at this location. Available: ${stock.quantity}`);
    }
  }

  // Update stock
  stock.quantity = newQuantity;
  await stock.save();

  // Create movement record
  await InventoryMovementModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    productId: new mongoose.Types.ObjectId(data.productId),
    locationId: new mongoose.Types.ObjectId(data.locationId),
    movementType: data.delta > 0 ? MovementType.IN : MovementType.OUT,
    quantity: Math.abs(data.delta),
    reason: data.reason,
    createdBy: new mongoose.Types.ObjectId(userId)
  });

  return stock;
}

export async function transferStock(
  userId: string,
  data: TransferStockData
): Promise<{ from: IStock; to: IStock }> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Validate locations exist and are active
    const [fromLoc, toLoc] = await Promise.all([
      LocationModel.findOne({ _id: data.fromLocationId, userId: userObjectId, isActive: true }),
      LocationModel.findOne({ _id: data.toLocationId, userId: userObjectId, isActive: true })
    ]);

    if (!fromLoc) throw new Error('Source location not found or inactive');
    if (!toLoc) throw new Error('Destination location not found or inactive');

    // Find source stock
    const fromStock = await StockModel.findOne({
      userId: userObjectId,
      productId: new mongoose.Types.ObjectId(data.productId),
      locationId: new mongoose.Types.ObjectId(data.fromLocationId)
    }).session(session);

    if (!fromStock) {
      throw new Error('Source location has no stock for this product');
    }

    // Check availability (quantity - reserved)
    const available = fromStock.quantity - fromStock.reservedQuantity;
    if (available < data.quantity) {
      throw new Error(
        `Insufficient available stock. Available: ${available}, Requested: ${data.quantity}`
      );
    }

    // Deduct from source
    fromStock.quantity -= data.quantity;
    await fromStock.save({ session });

    // Add to destination (create if doesn't exist)
    let toStock = await StockModel.findOne({
      userId: userObjectId,
      productId: new mongoose.Types.ObjectId(data.productId),
      locationId: new mongoose.Types.ObjectId(data.toLocationId)
    }).session(session);

    if (!toStock) {
      toStock = new StockModel({
        userId: userObjectId,
        productId: new mongoose.Types.ObjectId(data.productId),
        locationId: new mongoose.Types.ObjectId(data.toLocationId),
        quantity: data.quantity,
        reservedQuantity: 0
      });
    } else {
      toStock.quantity += data.quantity;
    }
    await toStock.save({ session });

    // Create movement record
    await InventoryMovementModel.create(
      [
        {
          userId: userObjectId,
          productId: new mongoose.Types.ObjectId(data.productId),
          fromLocationId: new mongoose.Types.ObjectId(data.fromLocationId),
          toLocationId: new mongoose.Types.ObjectId(data.toLocationId),
          movementType: MovementType.TRANSFER,
          quantity: data.quantity,
          reason: data.reason,
          createdBy: userObjectId
        }
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    return { from: fromStock, to: toStock };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function reserveStock(userId: string, data: ReserveStockData): Promise<IStock> {
  const stock = await StockModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    productId: new mongoose.Types.ObjectId(data.productId),
    locationId: new mongoose.Types.ObjectId(data.locationId)
  });

  if (!stock) {
    throw new Error('Stock record not found');
  }

  const newReserved = stock.reservedQuantity + data.quantity;
  if (newReserved > stock.quantity) {
    throw new Error('Cannot reserve more than available quantity');
  }

  stock.reservedQuantity = newReserved;
  await stock.save();
  return stock;
}

export async function unreserveStock(userId: string, data: ReserveStockData): Promise<IStock> {
  const stock = await StockModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    productId: new mongoose.Types.ObjectId(data.productId),
    locationId: new mongoose.Types.ObjectId(data.locationId)
  });

  if (!stock) {
    throw new Error('Stock record not found');
  }

  stock.reservedQuantity = Math.max(0, stock.reservedQuantity - data.quantity);
  await stock.save();
  return stock;
}

// CSV Import/Export
export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; sku: string; error: string }>;
}

export async function bulkImportStocksFromCSV(
  userId: string,
  csvData: { sku: string; location_code: string; quantity: number }[]
): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: []
  };

  const userObjectId = new mongoose.Types.ObjectId(userId);

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed

    try {
      if (!row.sku || !row.location_code || row.quantity === undefined) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          sku: row.sku || 'Unknown',
          error: 'Missing required fields (sku, location_code, quantity)'
        });
        continue;
      }

      const quantity = Number(row.quantity);
      if (isNaN(quantity) || quantity < 0) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          sku: row.sku,
          error: `Invalid quantity: ${row.quantity}`
        });
        continue;
      }

      // Find product by name (treating sku column as product name for simplicity)
      const product = await ProductModel.findOne({
        userId: userObjectId,
        name: row.sku
      });

      if (!product) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          sku: row.sku,
          error: 'Product not found'
        });
        continue;
      }

      // Find location by code
      const location = await LocationModel.findOne({
        userId: userObjectId,
        code: row.location_code.toUpperCase()
      });

      if (!location) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          sku: row.sku,
          error: `Location code '${row.location_code}' not found`
        });
        continue;
      }

      // Create or update stock
      let stock = await StockModel.findOne({
        userId: userObjectId,
        productId: product._id,
        locationId: location._id
      });

      const oldQuantity = stock?.quantity || 0;
      const delta = quantity - oldQuantity;

      if (!stock) {
        stock = new StockModel({
          userId: userObjectId,
          productId: product._id,
          locationId: location._id,
          quantity,
          reservedQuantity: 0
        });
        await stock.save();
      } else {
        stock.quantity = quantity;
        await stock.save();
      }

      // Create movement record
      if (delta !== 0) {
        await InventoryMovementModel.create({
          userId: userObjectId,
          productId: product._id,
          locationId: location._id,
          movementType: MovementType.ADJUSTMENT,
          quantity: Math.abs(delta),
          reason: `CSV import: ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}`,
          createdBy: userObjectId
        });
      }

      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        row: rowNumber,
        sku: row.sku || 'Unknown',
        error: (error as Error).message
      });
    }
  }

  return result;
}

export async function exportStocksToCSV(
  userId: string,
  filters?: StockFilters
): Promise<string> {
  const query: any = { userId: new mongoose.Types.ObjectId(userId) };

  if (filters?.productId) {
    query.productId = new mongoose.Types.ObjectId(filters.productId);
  }
  if (filters?.locationId) {
    query.locationId = new mongoose.Types.ObjectId(filters.locationId);
  }

  const stocks = await StockModel.find(query)
    .populate('productId', 'name')
    .populate('locationId', 'code name');

  const csvData = stocks.map((stock: any) => ({
    sku: stock.productId.name,
    product_name: stock.productId.name,
    location_code: stock.locationId.code,
    location_name: stock.locationId.name,
    quantity: stock.quantity,
    reserved_quantity: stock.reservedQuantity,
    available_quantity: stock.quantity - stock.reservedQuantity
  }));

  return stringify(csvData, { header: true });
}
