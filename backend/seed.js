import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './src/models/Hospital.js';
import hospitalSeedData from './hospital-seed-data.js';

dotenv.config();
console.log('--- SEEDING SCRIPT STARTED ---');

const seedHospitals = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log(`Connecting to database...`);
    
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✓ Successfully connected to MongoDB Atlas!');

    // Clear existing hospitals
    await Hospital.deleteMany({});
    console.log('Cleared existing hospitals');

    console.log('Inserting seed data into database...');
    const hospitals = await Hospital.insertMany(hospitalSeedData);
    console.log(`✓ SUCCESS: ${hospitals.length} hospitals inserted successfully!`);

    // Verify 2dsphere index
    await Hospital.collection.createIndex({ 'location.coordinates': '2dsphere' });
    console.log('✓ Ensured 2dsphere index on location.coordinates');

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedHospitals();
