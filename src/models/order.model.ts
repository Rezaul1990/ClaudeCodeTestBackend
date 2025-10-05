import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface ICustomerInfo {
  fullName: string;
  address: string;
  contactNumber: string;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  total: number;
  customerInfo: ICustomerInfo;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String, required: true }
}, { _id: false });

const customerInfoSchema = new Schema<ICustomerInfo>({
  fullName: { type: String, required: true },
  address: { type: String, required: true },
  contactNumber: { type: String, required: true }
}, { _id: false });

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    customerInfo: { type: customerInfoSchema, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered'], default: 'pending' }
  },
  { timestamps: true }
);

export const OrderModel = mongoose.model<IOrder>('Order', orderSchema);
