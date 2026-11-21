import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './src/models/Hospital.js';

dotenv.config();

const checkCount = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Hospital.countDocuments();
    console.log(`--- DB CHECK ---`);
    console.log(`Total Hospitals found: ${count}`);
    await mongoose.connection.close();
  } catch (err) {
    console.error('Check failed:', err);
  }
};

checkCount();
