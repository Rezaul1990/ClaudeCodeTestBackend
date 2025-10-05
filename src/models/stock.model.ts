import mongoose, { Schema, Document } from 'mongoose';

export interface IStock extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  locationId: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number; // Virtual field
  createdAt: Date;
  updatedAt: Date;
  adjustQuantity(delta: number): Promise<IStock>;
  reserve(amount: number): Promise<IStock>;
  unreserve(amount: number): Promise<IStock>;
}

const stockSchema = new Schema<IStock>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    reservedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound unique index: one stock record per product per location per user
stockSchema.index({ productId: 1, locationId: 1, userId: 1 }, { unique: true });

// Index for querying all stocks at a location
stockSchema.index({ userId: 1, locationId: 1 });

// Index for querying all locations for a product
stockSchema.index({ userId: 1, productId: 1 });

// Virtual field for available quantity
stockSchema.virtual('availableQuantity').get(function () {
  return this.quantity - this.reservedQuantity;
});

// Validation: reserved cannot exceed quantity
stockSchema.pre('save', function (next) {
  if (this.reservedQuantity > this.quantity) {
    return next(new Error('Reserved quantity cannot exceed total quantity'));
  }
  next();
});

// Static methods
stockSchema.statics.findByLocation = function (userId: string, locationId: string) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    locationId: new mongoose.Types.ObjectId(locationId)
  })
    .populate('productId', 'name sku')
    .populate('locationId', 'code name')
    .sort({ 'productId.name': 1 });
};

stockSchema.statics.findByProduct = function (userId: string, productId: string) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    productId: new mongoose.Types.ObjectId(productId)
  })
    .populate('productId', 'name sku')
    .populate('locationId', 'code name')
    .sort({ 'locationId.name': 1 });
};

// Instance methods
stockSchema.methods.adjustQuantity = async function (delta: number) {
  this.quantity += delta;
  if (this.quantity < 0) {
    throw new Error('Quantity cannot be negative');
  }
  return await this.save();
};

stockSchema.methods.reserve = async function (amount: number) {
  const newReserved = this.reservedQuantity + amount;
  if (newReserved > this.quantity) {
    throw new Error('Cannot reserve more than available quantity');
  }
  this.reservedQuantity = newReserved;
  return await this.save();
};

stockSchema.methods.unreserve = async function (amount: number) {
  this.reservedQuantity = Math.max(0, this.reservedQuantity - amount);
  return await this.save();
};

export const StockModel = mongoose.model<IStock>('Stock', stockSchema);
