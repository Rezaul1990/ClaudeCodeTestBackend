import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2U1ZTdlYiIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';

const productSchema = new Schema<IProduct>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: PLACEHOLDER_IMAGE },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, required: true }
  },
  { timestamps: true }
);

productSchema.index({ userId: 1, name: 1 }, { unique: true });

export const ProductModel = mongoose.model<IProduct>('Product', productSchema);
