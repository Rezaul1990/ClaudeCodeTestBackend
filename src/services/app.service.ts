import { z } from 'zod';
import { ApplicationModel } from '../models/application.model';

export const createApplicationSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  seniority: z.string().optional(),
  description: z.string().min(1)
});

export type CreateApplicationData = z.infer<typeof createApplicationSchema>;

export const createApplication = async (data: CreateApplicationData, userId: string) => {
  const application = new ApplicationModel({
    ...data,
    userId
  });
  await application.save();
  return {
    id: String(application._id),
    title: application.title,
    company: application.company,
    location: application.location,
    seniority: application.seniority,
    createdAt: application.createdAt
  };
};

export const getApplications = async (userId: string, limit = 20, offset = 0) => {
  const applications = await ApplicationModel
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .select('title company location seniority createdAt');

  return applications.map(app => ({
    id: String(app._id),
    title: app.title,
    company: app.company,
    location: app.location,
    seniority: app.seniority,
    createdAt: app.createdAt
  }));
};

export const getApplicationById = async (id: string, userId: string) => {
  const application = await ApplicationModel.findOne({ _id: id, userId });
  if (!application) return null;

  return {
    id: String(application._id),
    title: application.title,
    company: application.company,
    location: application.location,
    seniority: application.seniority,
    description: application.description,
    createdAt: application.createdAt
  };
};

export const deleteApplication = async (id: string, userId: string) => {
  const result = await ApplicationModel.deleteOne({ _id: id, userId });
  return result.deletedCount > 0;
};