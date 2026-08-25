require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { getDefaultUserId } = require('./utils/defaultUser');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    const defaultUserId = await getDefaultUserId();
    console.log(`Default user ready: ${defaultUserId}`);

    app.listen(PORT, () => {
      console.log(`StoryApp API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
