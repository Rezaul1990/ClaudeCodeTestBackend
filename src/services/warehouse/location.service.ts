import { z } from 'zod';
import { LocationModel, ILocation } from '../../models/location.model';
import { StockModel } from '../../models/stock.model';
import mongoose from 'mongoose';

export const locationSchema = z.object({
  code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens/underscores'),
  name: z.string().min(1).max(100),
  address: z.string().max(500).optional(),
  allowNegativeStock: z.boolean().default(false)
});

export const updateLocationSchema = locationSchema.partial();

export type LocationData = z.infer<typeof locationSchema>;
export type UpdateLocationData = z.infer<typeof updateLocationSchema>;

export interface LocationFilters {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function createLocation(userId: string, data: LocationData): Promise<ILocation> {
  // Check for duplicate code (case-insensitive)
  const existing = await LocationModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    code: data.code.toUpperCase()
  });

  if (existing) {
    throw new Error('Location code already exists');
  }

  const location = new LocationModel({
    ...data,
    code: data.code.toUpperCase(),
    userId: new mongoose.Types.ObjectId(userId)
  });

  await location.save();
  return location;
}

export async function getLocations(
  userId: string,
  filters: LocationFilters = {}
): Promise<PaginatedResult<ILocation>> {
  const query: any = { userId: new mongoose.Types.ObjectId(userId) };

  // Filter by active status
  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  // Search by name or code
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { code: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    LocationModel.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    LocationModel.countDocuments(query)
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

export async function getLocationById(userId: string, locationId: string): Promise<ILocation> {
  const location = await LocationModel.findOne({
    _id: new mongoose.Types.ObjectId(locationId),
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!location) {
    throw new Error('Location not found');
  }

  return location;
}

export async function updateLocation(
  userId: string,
  locationId: string,
  data: UpdateLocationData
): Promise<ILocation> {
  // Prevent code changes if stocks exist
  if (data.code) {
    const stockCount = await StockModel.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      locationId: new mongoose.Types.ObjectId(locationId)
    });

    if (stockCount > 0) {
      throw new Error('Cannot change location code when stock records exist');
    }

    // Check for duplicate code
    const existing = await LocationModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      code: data.code.toUpperCase(),
      _id: { $ne: new mongoose.Types.ObjectId(locationId) }
    });

    if (existing) {
      throw new Error('Location code already exists');
    }

    data.code = data.code.toUpperCase();
  }

  const location = await LocationModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(locationId),
      userId: new mongoose.Types.ObjectId(userId)
    },
    data,
    { new: true }
  );

  if (!location) {
    throw new Error('Location not found');
  }

  return location;
}

export async function deactivateLocation(userId: string, locationId: string): Promise<void> {
  // Check if location has non-zero stock
  const stocksWithQuantity = await StockModel.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    locationId: new mongoose.Types.ObjectId(locationId),
    quantity: { $gt: 0 }
  });

  if (stocksWithQuantity > 0) {
    throw new Error('Cannot deactivate location with existing stock. Please transfer or adjust stock to zero first.');
  }

  const location = await LocationModel.findOne({
    _id: new mongoose.Types.ObjectId(locationId),
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!location) {
    throw new Error('Location not found');
  }

  location.isActive = false;
  await location.save();
}

export async function activateLocation(userId: string, locationId: string): Promise<void> {
  const location = await LocationModel.findOne({
    _id: new mongoose.Types.ObjectId(locationId),
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!location) {
    throw new Error('Location not found');
  }

  location.isActive = true;
  await location.save();
}
