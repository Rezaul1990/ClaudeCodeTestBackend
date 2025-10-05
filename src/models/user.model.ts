import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';
import { User } from '../types';

interface UserDocument extends Document, Omit<User, '_id'> {}

interface UserModel extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  hashPassword(password: string): string;
  verifyPassword(password: string, hash: string): boolean;
}

const userSchema = new Schema<UserDocument>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'staff'
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email });
};

userSchema.statics.hashPassword = function(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

userSchema.statics.verifyPassword = function(password: string, hash: string): boolean {
  const [salt, storedHash] = hash.split(':');
  const derivedHash = crypto.scryptSync(password, salt, 64);
  const storedHashBuffer = Buffer.from(storedHash, 'hex');
  return crypto.timingSafeEqual(derivedHash, storedHashBuffer);
};

export const UserModel = mongoose.model<UserDocument, UserModel>('User', userSchema);