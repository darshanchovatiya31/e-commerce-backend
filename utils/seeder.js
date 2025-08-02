const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});

    // Seed admin user
    const admin = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@samjubaa.com',
      password: 'admin123',
      phone: '1234567890',
      role: 'admin'
    });
    await admin.save();

    // Seed categories
    const categories = [
      { name: 'Clothing', description: 'Fashionable clothing', subcategories: ['Shirts', 'Pants'], isActive: true },
      { name: 'Accessories', description: 'Fashion accessories', subcategories: ['Watches', 'Bags'], isActive: true }
    ];
    const savedCategories = await Category.insertMany(categories);

    // Seed products
    const products = [
      {
        name: 'Casual Shirt',
        description: 'Comfortable cotton shirt',
        price: 999,
        originalPrice: 1299,
        category: savedCategories[0]._id,
        subcategory: 'Shirts',
        material: 'Cotton',
        colors: ['Blue', 'White'],
        sizes: ['M', 'L'],
        images: ['https://via.placeholder.com/150'],
        inStock: true,
        featured: true
      }
    ];
    await Product.insertMany(products);

    console.log('Database seeded successfully');
    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding error:', error);
    mongoose.connection.close();
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;