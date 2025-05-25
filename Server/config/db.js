const mongoose = require('mongoose');
const dotenv = require('dotenv')
dotenv.config({ path: '../.env' });

const Connection = async () => {
  try {

    const mongoURI = process.env.mongo_URL;
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoURI);

    console.log('Connected to MongoDB');

    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  
    process.exit(1);
  }
};

module.exports = {Connection};

