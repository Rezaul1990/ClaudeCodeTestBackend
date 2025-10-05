import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createApplication, getApplications, getApplicationById, deleteApplication, createApplicationSchema } from '../services/app.service';

const getUserFromToken = (req: Request): string | null => {
  const token = req.cookies.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded.id;
  } catch {
    return null;
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = createApplicationSchema.parse(req.body);
    const application = await createApplication(data, userId);
    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const applications = await getApplications(userId, limit, offset);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const detail = async (req: Request, res: Response) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const application = await getApplicationById(req.params.id, userId);
    if (!application) return res.status(404).json({ error: 'Not found' });

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const deleted = await deleteApplication(req.params.id, userId);
    if (!deleted) return res.status(404).json({ error: 'Not found' });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};