require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');

const seedAdvancedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Order.deleteMany({});

    console.log('Cleared existing data');

    // Seed admin user
    const admin = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@samjubaa.com',
      password: 'admin123',
      phone: '9023040062',
      role: 'admin'
    });
    await admin.save();
    console.log('Admin user created');

    // Seed customer users
    const customers = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '9876543211',
        role: 'customer'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: 'password123',
        phone: '9876543212',
        role: 'customer'
      },
      {
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike.johnson@example.com',
        password: 'password123',
        phone: '9876543213',
        role: 'customer'
      },
      {
        firstName: 'Sarah',
        lastName: 'Wilson',
        email: 'sarah.wilson@example.com',
        password: 'password123',
        phone: '9876543214',
        role: 'customer'
      },
      {
        firstName: 'David',
        lastName: 'Brown',
        email: 'david.brown@example.com',
        password: 'password123',
        phone: '9876543215',
        role: 'customer'
      }
    ];

    const savedCustomers = [];
    for (const customerData of customers) {
      const customer = new User(customerData);
      await customer.save();
      savedCustomers.push(customer);
    }
    console.log('Customer users created');

    // Seed categories
    const categories = [
      { 
        name: 'Clothing',
        slug: 'clothing',
        description: 'Fashionable clothing for all occasions', 
        subcategories: [
          { name: 'Shirts', slug: 'shirts', description: 'Casual and formal shirts' },
          { name: 'Pants', slug: 'pants', description: 'Trousers and jeans' },
          { name: 'Dresses', slug: 'dresses', description: 'Beautiful dresses' }
        ], 
        isActive: true 
      },
      { 
        name: 'Accessories',
        slug: 'accessories',
        description: 'Fashion accessories to complete your look', 
        subcategories: [
          { name: 'Watches', slug: 'watches', description: 'Stylish timepieces' },
          { name: 'Bags', slug: 'bags', description: 'Handbags and backpacks' },
          { name: 'Jewelry', slug: 'jewelry', description: 'Beautiful jewelry pieces' }
        ], 
        isActive: true 
      },
      { 
        name: 'Electronics',
        slug: 'electronics',
        description: 'Latest electronic gadgets', 
        subcategories: [
          { name: 'Phones', slug: 'phones', description: 'Smartphones and accessories' },
          { name: 'Laptops', slug: 'laptops', description: 'Laptops and computers' }
        ], 
        isActive: true 
      }
    ];
    const savedCategories = await Category.insertMany(categories);
    console.log('Categories created');

    // Seed products
    const products = [
      {
        name: 'Premium Cotton Shirt',
        description: 'High-quality cotton shirt perfect for both casual and formal occasions',
        price: 1299,
        originalPrice: 1599,
        category: savedCategories[0]._id,
        subcategory: 'Shirts',
        material: 'Cotton',
        colors: ['Blue', 'White', 'Black'],
        sizes: ['S', 'M', 'L', 'XL'],
        images: ['https://via.placeholder.com/400x400/4A90E2/FFFFFF?text=Cotton+Shirt'],
        stock: 50,
        inStock: true,
        isFeatured: true,
        isNew: true,
        tags: ['cotton', 'shirt', 'casual', 'formal']
      },
      {
        name: 'Denim Jeans',
        description: 'Comfortable and stylish denim jeans for everyday wear',
        price: 2499,
        originalPrice: 2999,
        category: savedCategories[0]._id,
        subcategory: 'Pants',
        material: 'Denim',
        colors: ['Blue', 'Black'],
        sizes: ['28', '30', '32', '34', '36'],
        images: ['https://via.placeholder.com/400x400/2C3E50/FFFFFF?text=Denim+Jeans'],
        stock: 30,
        inStock: true,
        isFeatured: true,
        tags: ['denim', 'jeans', 'casual']
      },
      {
        name: 'Elegant Watch',
        description: 'Sophisticated timepiece with premium leather strap',
        price: 4999,
        originalPrice: 6999,
        category: savedCategories[1]._id,
        subcategory: 'Watches',
        material: 'Stainless Steel',
        colors: ['Silver', 'Gold', 'Black'],
        sizes: ['One Size'],
        images: ['https://via.placeholder.com/400x400/F39C12/FFFFFF?text=Elegant+Watch'],
        stock: 25,
        inStock: true,
        isFeatured: true,
        tags: ['watch', 'elegant', 'leather', 'timepiece']
      },
      {
        name: 'Designer Handbag',
        description: 'Stylish handbag perfect for any occasion',
        price: 3499,
        originalPrice: 4499,
        category: savedCategories[1]._id,
        subcategory: 'Bags',
        material: 'Leather',
        colors: ['Brown', 'Black', 'Tan'],
        sizes: ['One Size'],
        images: ['https://via.placeholder.com/400x400/8E44AD/FFFFFF?text=Designer+Bag'],
        stock: 20,
        inStock: true,
        isFeatured: false,
        tags: ['handbag', 'designer', 'leather']
      },
      {
        name: 'Summer Dress',
        description: 'Light and comfortable dress perfect for summer',
        price: 1899,
        originalPrice: 2299,
        category: savedCategories[0]._id,
        subcategory: 'Dresses',
        material: 'Cotton Blend',
        colors: ['Floral', 'Solid Blue', 'Solid Pink'],
        sizes: ['XS', 'S', 'M', 'L'],
        images: ['https://via.placeholder.com/400x400/E74C3C/FFFFFF?text=Summer+Dress'],
        stock: 35,
        inStock: true,
        isFeatured: false,
        isNew: true,
        tags: ['dress', 'summer', 'cotton', 'casual']
      },
      {
        name: 'Smartphone Case',
        description: 'Protective case for your smartphone',
        price: 599,
        originalPrice: 799,
        category: savedCategories[2]._id,
        subcategory: 'Phones',
        material: 'Silicone',
        colors: ['Clear', 'Black', 'Blue', 'Red'],
        sizes: ['iPhone 14', 'iPhone 15', 'Samsung S23'],
        images: ['https://via.placeholder.com/400x400/27AE60/FFFFFF?text=Phone+Case'],
        stock: 100,
        inStock: true,
        isFeatured: false,
        tags: ['phone', 'case', 'protection', 'silicone']
      }
    ];

    const savedProducts = await Product.insertMany(products);
    console.log('Products created');

    // Generate sample orders
    const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const orders = [];

    for (let i = 0; i < 15; i++) {
      const customer = savedCustomers[Math.floor(Math.random() * savedCustomers.length)];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
      const orderItems = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const product = savedProducts[Math.floor(Math.random() * savedProducts.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
        const price = product.price;
        
        orderItems.push({
          productId: product._id,
          name: product.name,
          quantity: quantity,
          price: price,
          originalPrice: product.originalPrice,
          selectedSize: product.sizes[0],
          selectedColor: product.colors[0],
          image: product.images[0]
        });

        subtotal += price * quantity;
      }

      const tax = Math.round(subtotal * 0.18); // 18% tax
      const shipping = subtotal > 1000 ? 0 : 100; // Free shipping above 1000
      const total = subtotal + tax + shipping;

      // Create order with random date in the last 30 days
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));

      // Generate short order ID (8 characters)
      const orderId = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      const order = {
        orderId: orderId,
        userId: customer._id,
        items: orderItems,
        shippingAddress: {
          fullName: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone,
          address: `${Math.floor(Math.random() * 999) + 1} Main Street`,
          city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'][Math.floor(Math.random() * 5)],
          state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal'][Math.floor(Math.random() * 5)],
          pincode: `${Math.floor(Math.random() * 900000) + 100000}`,
          country: 'India'
        },
        billingAddress: {
          fullName: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone,
          address: `${Math.floor(Math.random() * 999) + 1} Main Street`,
          city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'][Math.floor(Math.random() * 5)],
          state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal'][Math.floor(Math.random() * 5)],
          pincode: `${Math.floor(Math.random() * 900000) + 100000}`,
          country: 'India'
        },
        paymentMethod: Math.random() > 0.5 ? 'razorpay' : 'cod',
        paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending',
        orderStatus: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        total: total,
        createdAt: createdAt,
        updatedAt: createdAt
      };

      orders.push(order);
    }

    await Order.insertMany(orders);
    console.log('Sample orders created');

    console.log('\n🎉 Advanced database seeding completed successfully!');
    console.log(`Created:
    - 1 Admin user
    - ${savedCustomers.length} Customer users
    - ${savedCategories.length} Categories
    - ${savedProducts.length} Products
    - ${orders.length} Orders`);

    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding error:', error);
    mongoose.connection.close();
  }
};

if (require.main === module) {
  seedAdvancedData();
}

module.exports = seedAdvancedData;