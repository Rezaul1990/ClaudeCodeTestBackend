import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  allowNegativeStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
      match: /^[A-Z0-9_-]+$/
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    allowNegativeStock: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Compound unique index: same code can exist for different users
locationSchema.index({ userId: 1, code: 1 }, { unique: true });

// Index for querying active locations
locationSchema.index({ userId: 1, isActive: 1 });

// Static methods
locationSchema.statics.findActiveByUser = function (userId: string) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true
  }).sort({ name: 1 });
};

locationSchema.statics.findByCode = function (userId: string, code: string) {
  return this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    code: code.toUpperCase()
  });
};

// Instance methods
locationSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

locationSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

export const LocationModel = mongoose.model<ILocation>('Location', locationSchema);
