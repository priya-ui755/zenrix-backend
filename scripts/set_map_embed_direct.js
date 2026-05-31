const mongoose = require('mongoose');
const Page = require('../models/Page');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fashionhub';

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { autoIndex: true });
    const page = await Page.findOne({ slug: 'contact' });
    if (!page) {
      console.error('Contact page not found');
      process.exit(1);
    }
    page.meta = page.meta || {};
    page.meta.mapEmbed = 'https://www.google.com/maps?q=123+Commerce+St+New+York+NY+10001&output=embed';
    await page.save();
    console.log('Updated page.meta:', page.meta);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();