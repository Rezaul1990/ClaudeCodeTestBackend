import { Request, Response } from 'express';
import * as locationService from '../../services/warehouse/location.service';

export const createLocationHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = locationService.locationSchema.parse(req.body);
    const location = await locationService.createLocation(userId, data);

    res.status(201).json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const getLocationsHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const filters = {
      isActive: req.query.isActive === 'true',
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await locationService.getLocations(userId, filters);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const getLocationByIdHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const location = await locationService.getLocationById(userId, req.params.id);

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const updateLocationHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = locationService.updateLocationSchema.parse(req.body);
    const location = await locationService.updateLocation(userId, req.params.id, data);

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const deactivateLocationHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await locationService.deactivateLocation(userId, req.params.id);

    res.json({
      success: true,
      message: 'Location deactivated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
};
