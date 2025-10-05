import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import * as locationController from '../../controllers/warehouse/location.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List locations (all roles)
router.get('/', locationController.getLocationsHandler);

// Create location (admin/manager only)
router.post('/', requireRole(['admin', 'manager']), locationController.createLocationHandler);

// Get location by ID (all roles)
router.get('/:id', locationController.getLocationByIdHandler);

// Update location (admin/manager only)
router.put('/:id', requireRole(['admin', 'manager']), locationController.updateLocationHandler);

// Deactivate location (admin/manager only)
router.delete('/:id', requireRole(['admin', 'manager']), locationController.deactivateLocationHandler);

export { router as locationRoutes };
