import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { LocationModel } from '../models/location.model';
import { StockModel } from '../models/stock.model';
import { ProductModel } from '../models/product.model';

const demoLocations = [
  {
    code: 'WH-MAIN',
    name: 'Main Warehouse',
    address: '123 Industrial Blvd, Suite 100',
    isActive: true,
    allowNegativeStock: false
  },
  {
    code: 'STORE-A',
    name: 'Retail Store A',
    address: '456 Shopping Plaza, Unit 5',
    isActive: true,
    allowNegativeStock: false
  },
  {
    code: 'STORE-B',
    name: 'Retail Store B',
    address: '789 Main Street',
    isActive: true,
    allowNegativeStock: false
  }
];

async function seedWarehouseLocations() {
  try {
    // Get userId from command line argument
    const userId = process.argv[2];

    if (!userId) {
      console.error('Error: Please provide a userId as an argument');
      console.log('Usage: npm run seed:warehouse -- <userId>');
      process.exit(1);
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Error: Invalid userId format');
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const userObjectId = new mongoose.Types.ObjectId(userId);
    let createdCount = 0;
    let skippedCount = 0;

    // Create locations
    for (const locationData of demoLocations) {
      const existingLocation = await LocationModel.findOne({
        userId: userObjectId,
        code: locationData.code
      });

      if (existingLocation) {
        console.log(`⏭️  Location ${locationData.code} already exists, skipping...`);
        skippedCount++;
        continue;
      }

      const location = new LocationModel({
        ...locationData,
        userId: userObjectId
      });

      await location.save();
      console.log(`✅ Created location: ${locationData.code} - ${locationData.name}`);
      createdCount++;

      // Create initial stock records (quantity = 0) for all existing products
      const products = await ProductModel.find({ userId: userObjectId });

      for (const product of products) {
        const existingStock = await StockModel.findOne({
          userId: userObjectId,
          productId: product._id,
          locationId: location._id
        });

        if (!existingStock) {
          await StockModel.create({
            userId: userObjectId,
            productId: product._id,
            locationId: location._id,
            quantity: 0,
            reservedQuantity: 0
          });
        }
      }

      if (products.length > 0) {
        console.log(`   📦 Created ${products.length} stock records for existing products`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${createdCount} locations`);
    console.log(`   Skipped: ${skippedCount} locations (already exist)`);
    console.log(`   User ID: ${userId}`);

    await mongoose.disconnect();
    console.log('\n✅ Seed completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding warehouse locations:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedWarehouseLocations();
