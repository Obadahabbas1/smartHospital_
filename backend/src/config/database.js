import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * Implements connection pooling and error handling
 */
export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    const options = {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      family: 4, // Force IPv4
    };




    await mongoose.connect(mongoURI, options);

    console.log('✅ MongoDB Connected Successfully');
    console.log(`   Database: ${mongoose.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB Disconnected');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB Connection Error:', error.message);
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB (useful for testing/cleanup)
 */
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB Disconnected');
  } catch (error) {
    console.error('❌ MongoDB Disconnection Error:', error.message);
  }
};

export default mongoose;
