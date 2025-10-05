import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixProductIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    // Get all indexes
    const indexes = await productsCollection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Drop the problematic sku_1 index if it exists
    const skuIndex = indexes.find(idx => idx.name === 'sku_1');
    if (skuIndex) {
      console.log('Dropping sku_1 index...');
      await productsCollection.dropIndex('sku_1');
      console.log('✅ Successfully dropped sku_1 index');
    } else {
      console.log('No sku_1 index found');
    }

    // List remaining indexes
    const remainingIndexes = await productsCollection.indexes();
    console.log('Remaining indexes:', JSON.stringify(remainingIndexes, null, 2));

    console.log('✅ Index fix completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  }
}

fixProductIndexes();
