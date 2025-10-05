import mongoose, { Schema, Document } from 'mongoose';

export interface Application {
  _id: string;
  title: string;
  company: string;
  location: string;
  seniority?: string;
  description: string;
  userId: string;
  createdAt: Date;
}

interface ApplicationDocument extends Document, Omit<Application, '_id'> {}

const applicationSchema = new Schema<ApplicationDocument>({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  seniority: { type: String },
  description: { type: String, required: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const ApplicationModel = mongoose.model<ApplicationDocument>('Application', applicationSchema);