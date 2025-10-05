import mongoose, { Schema, Document } from 'mongoose';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT'
}

export interface IInventoryMovement extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  locationId?: mongoose.Types.ObjectId;
  fromLocationId?: mongoose.Types.ObjectId;
  toLocationId?: mongoose.Types.ObjectId;
  movementType: MovementType;
  quantity: number;
  reason: string;
  reference?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location' },
    fromLocationId: { type: Schema.Types.ObjectId, ref: 'Location' },
    toLocationId: { type: Schema.Types.ObjectId, ref: 'Location' },
    movementType: {
      type: String,
      enum: Object.values(MovementType),
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500
    },
    reference: {
      type: String,
      trim: true
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Indexes for querying
inventoryMovementSchema.index({ userId: 1, productId: 1, createdAt: -1 });
inventoryMovementSchema.index({ userId: 1, locationId: 1, createdAt: -1 });
inventoryMovementSchema.index({ userId: 1, movementType: 1, createdAt: -1 });

// Validation: ensure proper location fields based on movement type
inventoryMovementSchema.pre('save', function (next) {
  if (this.movementType === MovementType.TRANSFER) {
    if (!this.fromLocationId || !this.toLocationId) {
      return next(new Error('Transfer requires both fromLocationId and toLocationId'));
    }
    if (this.locationId) {
      return next(new Error('Transfer should not have locationId'));
    }
  } else {
    // IN, OUT, ADJUSTMENT
    if (!this.locationId) {
      return next(new Error(`${this.movementType} requires locationId`));
    }
    if (this.fromLocationId || this.toLocationId) {
      return next(new Error(`${this.movementType} should not have fromLocationId or toLocationId`));
    }
  }
  next();
});

// Static methods
inventoryMovementSchema.statics.createMovement = function (data: Partial<IInventoryMovement>) {
  return this.create(data);
};

inventoryMovementSchema.statics.getHistory = function (
  userId: string,
  filters: {
    productId?: string;
    locationId?: string;
    fromLocationId?: string;
    toLocationId?: string;
    movementType?: MovementType;
    fromDate?: Date;
    toDate?: Date;
  }
) {
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

  return this.find(query)
    .populate('productId', 'name sku')
    .populate('locationId', 'code name')
    .populate('fromLocationId', 'code name')
    .populate('toLocationId', 'code name')
    .populate('createdBy', 'email')
    .sort({ createdAt: -1 });
};

export const InventoryMovementModel = mongoose.model<IInventoryMovement>(
  'InventoryMovement',
  inventoryMovementSchema
);
