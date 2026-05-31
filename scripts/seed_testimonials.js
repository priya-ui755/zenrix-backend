const mongoose = require('mongoose');
const Testimonial = require('../models/Testimonial');

async function seedTestimonials() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashionhub');

    console.log('Connected to MongoDB');

    // Check if testimonials already exist
    const existing = await Testimonial.countDocuments();
    if (existing > 0) {
      console.log('Testimonials already exist, skipping seed');
      return;
    }

    // Sample testimonials
    const testimonials = [
      {
        name: 'Sarah K.',
        review: 'Fashion Hub has the best selection of electronics. Fast shipping and great prices!',
        rating: 5,
        isActive: true,
      },
      {
        name: 'Mike T.',
        review: 'Love the fashion collection. Quality products and excellent customer service.',
        rating: 5,
        isActive: true,
      },
      {
        name: 'Emily R.',
        review: 'Home & Kitchen essentials at unbeatable prices. Highly recommend!',
        rating: 5,
        isActive: true,
      },
      {
        name: 'David L.',
        review: 'Amazing variety and the delivery was super quick. Will definitely shop again!',
        rating: 4,
        isActive: true,
      },
      {
        name: 'Anna M.',
        review: 'Great prices on beauty products. The packaging was excellent too.',
        rating: 5,
        isActive: true,
      }
    ];

    await Testimonial.insertMany(testimonials);
    console.log('Sample testimonials seeded successfully');

  } catch (error) {
    console.error('Error seeding testimonials:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedTestimonials();