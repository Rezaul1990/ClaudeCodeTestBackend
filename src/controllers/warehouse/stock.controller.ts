import { Request, Response } from 'express';
import * as stockService from '../../services/warehouse/stock.service';
import * as movementService from '../../services/warehouse/inventory-movement.service';
import { MovementType } from '../../models/inventory-movement.model';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

export const getStocksHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const filters = {
      productId: req.query.productId as string,
      locationId: req.query.locationId as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50
    };

    const result = await stockService.getStocks(userId, filters);

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

export const getStocksByProductHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const stocks = await stockService.getStocksByProduct(userId, req.params.productId);

    res.json({
      success: true,
      data: stocks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const adjustStockHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = stockService.adjustStockSchema.parse(req.body);
    const stock = await stockService.adjustStock(userId, data);

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const transferStockHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = stockService.transferStockSchema.parse(req.body);
    const result = await stockService.transferStock(userId, data);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const reserveStockHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = stockService.reserveStockSchema.parse(req.body);
    const stock = await stockService.reserveStock(userId, data);

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const unreserveStockHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = stockService.reserveStockSchema.parse(req.body);
    const stock = await stockService.unreserveStock(userId, data);

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const importStocksFromCSVHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const userId = req.user!.id;
    const csvData: any[] = [];

    // Parse CSV from buffer
    const stream = Readable.from(req.file.buffer.toString());

    stream
      .pipe(csvParser())
      .on('data', (row) => csvData.push(row))
      .on('end', async () => {
        try {
          const result = await stockService.bulkImportStocksFromCSV(userId, csvData);

          res.json({
            success: true,
            data: result
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: (error as Error).message
          });
        }
      })
      .on('error', (error) => {
        res.status(400).json({
          success: false,
          error: 'Failed to parse CSV: ' + error.message
        });
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const exportStocksToCSVHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const filters = {
      productId: req.query.productId as string,
      locationId: req.query.locationId as string
    };

    const csv = await stockService.exportStocksToCSV(userId, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=stocks-export.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const getInventoryMovementsHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const filters = {
      productId: req.query.productId as string,
      locationId: req.query.locationId as string,
      fromLocationId: req.query.fromLocationId as string,
      toLocationId: req.query.toLocationId as string,
      movementType: req.query.movementType as MovementType,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50
    };

    const result = await movementService.getMovements(userId, filters);

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
