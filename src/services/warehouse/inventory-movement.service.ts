import { InventoryMovementModel, IInventoryMovement, MovementType } from '../../models/inventory-movement.model';
import mongoose from 'mongoose';
import { PaginatedResult } from './location.service';

export interface MovementFilters {
  productId?: string;
  locationId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  movementType?: MovementType;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export async function getMovements(
  userId: string,
  filters: MovementFilters = {}
): Promise<PaginatedResult<IInventoryMovement>> {
  const query: any = { userId: new mongoose.Types.ObjectId(userId) };

  if (filters.productId) {
    query.productId = new mongoose.Types.ObjectId(filters.productId);
  }
  if (filters.locationId) {
    query.locationId = new mongoose.Types.ObjectId(filters.locationId);
  }
  if (filters.fromLocationId) {
    query.fromLocationId = new mongoose.Types.ObjectId(filters.fromLocationId);
  }
  if (filters.toLocationId) {
    query.toLocationId = new mongoose.Types.ObjectId(filters.toLocationId);
  }
  if (filters.movementType) {
    query.movementType = filters.movementType;
  }
  if (filters.fromDate || filters.toDate) {
    query.createdAt = {};
    if (filters.fromDate) {
      query.createdAt.$gte = filters.fromDate;
    }
    if (filters.toDate) {
      query.createdAt.$lte = filters.toDate;
    }
  }

  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    InventoryMovementModel.find(query)
      .populate('productId', 'name sku')
      .populate('locationId', 'code name')
      .populate('fromLocationId', 'code name')
      .populate('toLocationId', 'code name')
      .populate('createdBy', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InventoryMovementModel.countDocuments(query)
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
