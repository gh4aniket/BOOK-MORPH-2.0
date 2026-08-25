const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/storyapp';

  try {
    await mongoose.connect(uri, {
      // Mongoose 7+ no longer needs useNewUrlParser/useUnifiedTopology,
      // kept connection lean on purpose.
    });

    isConnected = true;
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB initial connection failed:', error.message);
    // Don't crash the whole process on boot failure in dev; surface clearly instead.
    throw error;
  }
};

module.exports = connectDB;
