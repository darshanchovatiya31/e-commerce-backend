/**
 * Migration script to remove old email index from newsletters collection
 * Run this once after changing from email to mobileNumber
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/samjubaa';

async function migrateNewsletterIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('newsletters');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Drop the old email index if it exists
    try {
      await collection.dropIndex('email_1');
      console.log('✅ Successfully dropped email_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  email_1 index does not exist (already removed)');
      } else {
        throw error;
      }
    }

    // Also try dropping email index if it exists with different name
    try {
      await collection.dropIndex('email');
      console.log('✅ Successfully dropped email index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  email index does not exist');
      } else {
        throw error;
      }
    }

    // Verify mobileNumber index exists, create if not
    const mobileNumberIndexExists = indexes.some(idx => 
      idx.key && idx.key.mobileNumber
    );

    if (!mobileNumberIndexExists) {
      await collection.createIndex({ mobileNumber: 1 }, { unique: true });
      console.log('✅ Created mobileNumber_1 index');
    } else {
      console.log('ℹ️  mobileNumber_1 index already exists');
    }

    // Show final indexes
    const finalIndexes = await collection.indexes();
    console.log('\nFinal indexes:', finalIndexes.map(idx => ({
      name: idx.name,
      key: idx.key
    })));

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run migration
migrateNewsletterIndex();

