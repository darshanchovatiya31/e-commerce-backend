require('dotenv').config();
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


    // Seed products with proper details and images
    // const products = [
    //   // SAREES COLLECTION
    //   {
    //     name: 'Royal Banarasi Silk Saree',
    //     description: 'Exquisite handwoven Banarasi silk saree with intricate gold zari work and traditional motifs. Perfect for weddings and special occasions.',
    //     price: 8999,
    //     originalPrice: 12999,
    //     category: savedCategories.find(cat => cat.name === 'Sarees')._id,
    //     subcategory: 'Banarasi Sarees',
    //     material: 'Pure Banarasi Silk',
    //     colors: ['Deep Red', 'Royal Blue', 'Emerald Green', 'Golden Yellow'],
    //     sizes: ['Free Size'],
    //     images: [
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['wedding', 'traditional', 'silk', 'banarasi', 'zari'],
    //     stock: 15,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: true
    //   },
    //   {
    //     name: 'Elegant Cotton Handloom Saree',
    //     description: 'Comfortable handloom cotton saree with beautiful block prints and natural dyes. Ideal for daily wear and office.',
    //     price: 2499,
    //     originalPrice: 3499,
    //     category: savedCategories.find(cat => cat.name === 'Sarees')._id,
    //     subcategory: 'Cotton Sarees',
    //     material: 'Handloom Cotton',
    //     colors: ['Indigo Blue', 'Mustard Yellow', 'Maroon', 'Forest Green'],
    //     sizes: ['Free Size'],
    //     images: [
    //       'https://images.unsplash.com/photo-1583391733981-3cc25c4e0c5f?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['cotton', 'handloom', 'daily wear', 'comfortable', 'block print'],
    //     stock: 25,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: false
    //   },
    //   {
    //     name: 'Designer Georgette Saree',
    //     description: 'Lightweight georgette saree with contemporary embroidery and sequin work. Perfect for parties and celebrations.',
    //     price: 4999,
    //     originalPrice: 6999,
    //     category: savedCategories.find(cat => cat.name === 'Sarees')._id,
    //     subcategory: 'Georgette Sarees',
    //     material: 'Georgette',
    //     colors: ['Wine Red', 'Navy Blue', 'Black', 'Teal'],
    //     sizes: ['Free Size'],
    //     images: [
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['georgette', 'party wear', 'embroidery', 'sequin', 'lightweight'],
    //     stock: 20,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: true
    //   },

    //   // LEHENGAS COLLECTION
    //   {
    //     name: 'Bridal Heavy Embroidered Lehenga',
    //     description: 'Stunning bridal lehenga with heavy zardozi embroidery, mirror work, and stone embellishments. Comes with matching dupatta and blouse.',
    //     price: 25999,
    //     originalPrice: 35999,
    //     category: savedCategories.find(cat => cat.name === 'Lehengas')._id,
    //     subcategory: 'Bridal Lehengas',
    //     material: 'Velvet & Net',
    //     colors: ['Deep Maroon', 'Royal Red', 'Golden Beige', 'Burgundy'],
    //     sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['bridal', 'wedding', 'heavy work', 'zardozi', 'mirror work'],
    //     stock: 8,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: true
    //   },
    //   {
    //     name: 'Party Wear Net Lehenga',
    //     description: 'Glamorous party wear lehenga with sequin work and modern cut. Perfect for cocktail parties and receptions.',
    //     price: 12999,
    //     originalPrice: 16999,
    //     category: savedCategories.find(cat => cat.name === 'Lehengas')._id,
    //     subcategory: 'Party Lehengas',
    //     material: 'Net & Satin',
    //     colors: ['Midnight Blue', 'Emerald Green', 'Rose Gold', 'Wine Red'],
    //     sizes: ['S', 'M', 'L', 'XL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['party wear', 'cocktail', 'sequin', 'glamorous', 'reception'],
    //     stock: 12,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: false
    //   },
    //   {
    //     name: 'Sangeet Special Lehenga',
    //     description: 'Vibrant and colorful lehenga perfect for sangeet ceremonies. Features mirror work and comfortable fit for dancing.',
    //     price: 8999,
    //     originalPrice: 11999,
    //     category: savedCategories.find(cat => cat.name === 'Lehengas')._id,
    //     subcategory: 'Sangeet Lehengas',
    //     material: 'Georgette & Silk',
    //     colors: ['Hot Pink', 'Orange', 'Yellow', 'Purple'],
    //     sizes: ['S', 'M', 'L', 'XL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['sangeet', 'dance', 'colorful', 'mirror work', 'comfortable'],
    //     stock: 18,
    //     inStock: true,
    //     isFeatured: false,
    //     isNew: true
    //   },

    //   // KURTIS & SUITS COLLECTION
    //   {
    //     name: 'Elegant Anarkali Suit Set',
    //     description: 'Beautiful Anarkali suit with intricate embroidery and flowing silhouette. Comes with matching churidar and dupatta.',
    //     price: 4999,
    //     originalPrice: 6999,
    //     category: savedCategories.find(cat => cat.name === 'Kurtis & Suits')._id,
    //     subcategory: 'Anarkali Suits',
    //     material: 'Georgette & Cotton',
    //     colors: ['Peach', 'Mint Green', 'Lavender', 'Cream'],
    //     sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1583391733981-3cc25c4e0c5f?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['anarkali', 'embroidery', 'elegant', 'flowing', 'traditional'],
    //     stock: 22,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: false
    //   },
    //   {
    //     name: 'Trendy Palazzo Suit Set',
    //     description: 'Modern palazzo suit set with contemporary prints and comfortable fit. Perfect for casual outings and office wear.',
    //     price: 2499,
    //     originalPrice: 3499,
    //     category: savedCategories.find(cat => cat.name === 'Kurtis & Suits')._id,
    //     subcategory: 'Palazzo Sets',
    //     material: 'Rayon & Cotton',
    //     colors: ['Coral Pink', 'Sky Blue', 'Mint Green', 'Mustard'],
    //     sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1583391733981-3cc25c4e0c5f?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['palazzo', 'casual', 'office wear', 'comfortable', 'modern'],
    //     stock: 30,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: true
    //   },
    //   {
    //     name: 'Designer Sharara Set',
    //     description: 'Elegant sharara set with beautiful embroidery and flared pants. Perfect for festivals and special occasions.',
    //     price: 5999,
    //     originalPrice: 7999,
    //     category: savedCategories.find(cat => cat.name === 'Kurtis & Suits')._id,
    //     subcategory: 'Sharara Sets',
    //     material: 'Georgette & Silk',
    //     colors: ['Royal Blue', 'Deep Purple', 'Maroon', 'Golden'],
    //     sizes: ['S', 'M', 'L', 'XL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1583391733981-3cc25c4e0c5f?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['sharara', 'festival', 'embroidery', 'flared', 'elegant'],
    //     stock: 16,
    //     inStock: true,
    //     isFeatured: false,
    //     isNew: true
    //   },
    //   {
    //     name: 'Cotton Kurti with Palazzo',
    //     description: 'Comfortable cotton kurti with matching palazzo pants. Perfect for daily wear with beautiful block prints.',
    //     price: 1799,
    //     originalPrice: 2499,
    //     category: savedCategories.find(cat => cat.name === 'Kurtis & Suits')._id,
    //     subcategory: 'Kurtis',
    //     material: 'Pure Cotton',
    //     colors: ['White', 'Pink', 'Yellow', 'Light Blue'],
    //     sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1583391733981-3cc25c4e0c5f?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['cotton', 'daily wear', 'comfortable', 'block print', 'casual'],
    //     stock: 35,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: false
    //   },

    //   // INDO-WESTERN COLLECTION
    //   {
    //     name: 'Fusion Crop Top Lehenga',
    //     description: 'Modern Indo-Western crop top with flared skirt. Perfect blend of traditional and contemporary style.',
    //     price: 6999,
    //     originalPrice: 8999,
    //     category: savedCategories.find(cat => cat.name === 'Indo-Western')._id,
    //     subcategory: 'Crop Top Sets',
    //     material: 'Georgette & Net',
    //     colors: ['Black', 'Navy Blue', 'Wine Red', 'Emerald'],
    //     sizes: ['S', 'M', 'L', 'XL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['indo-western', 'crop top', 'modern', 'fusion', 'contemporary'],
    //     stock: 14,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: true
    //   },
    //   {
    //     name: 'Designer Jacket Lehenga',
    //     description: 'Stylish jacket style lehenga with contemporary embroidery. Perfect for cocktail parties and modern celebrations.',
    //     price: 9999,
    //     originalPrice: 12999,
    //     category: savedCategories.find(cat => cat.name === 'Indo-Western')._id,
    //     subcategory: 'Jacket Sets',
    //     material: 'Silk & Net',
    //     colors: ['Dusty Pink', 'Mint Green', 'Peach', 'Lavender'],
    //     sizes: ['S', 'M', 'L', 'XL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['jacket style', 'cocktail', 'modern', 'embroidery', 'stylish'],
    //     stock: 10,
    //     inStock: true,
    //     isFeatured: false,
    //     isNew: true
    //   },

    //   // ACCESSORIES COLLECTION
    //   {
    //     name: 'Kundan Jewelry Set',
    //     description: 'Exquisite kundan jewelry set with necklace, earrings, and maang tikka. Perfect for weddings and special occasions.',
    //     price: 4999,
    //     originalPrice: 6999,
    //     category: savedCategories.find(cat => cat.name === 'Accessories')._id,
    //     subcategory: 'Jewelry',
    //     material: 'Kundan & Gold Plated',
    //     colors: ['Gold', 'Rose Gold', 'Silver'],
    //     sizes: ['Free Size'],
    //     images: [
    //       'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=400&fit=crop'
    //     ],
    //     tags: ['kundan', 'wedding jewelry', 'traditional', 'necklace', 'earrings'],
    //     stock: 20,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: false
    //   },
    //   {
    //     name: 'Embroidered Potli Bag',
    //     description: 'Beautiful handcrafted potli bag with intricate embroidery and beadwork. Perfect accessory for ethnic wear.',
    //     price: 1299,
    //     originalPrice: 1799,
    //     category: savedCategories.find(cat => cat.name === 'Accessories')._id,
    //     subcategory: 'Bags',
    //     material: 'Silk & Velvet',
    //     colors: ['Gold', 'Silver', 'Maroon', 'Royal Blue'],
    //     sizes: ['Free Size'],
    //     images: [
    //       'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=400&fit=crop'
    //     ],
    //     tags: ['potli bag', 'embroidery', 'beadwork', 'ethnic', 'handcrafted'],
    //     stock: 25,
    //     inStock: true,
    //     isFeatured: false,
    //     isNew: true
    //   },
    //   {
    //     name: 'Traditional Kolhapuri Chappals',
    //     description: 'Authentic Kolhapuri leather chappals with traditional craftsmanship. Comfortable and durable for daily wear.',
    //     price: 1999,
    //     originalPrice: 2799,
    //     category: savedCategories.find(cat => cat.name === 'Accessories')._id,
    //     subcategory: 'Footwear',
    //     material: 'Genuine Leather',
    //     colors: ['Brown', 'Black', 'Tan', 'Natural'],
    //     sizes: ['5', '6', '7', '8', '9', '10'],
    //     images: [
    //       'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=400&fit=crop'
    //     ],
    //     tags: ['kolhapuri', 'leather', 'traditional', 'comfortable', 'authentic'],
    //     stock: 30,
    //     inStock: true,
    //     isFeatured: false,
    //     isNew: false
    //   },
    //   {
    //     name: 'Silk Dupatta with Gota Work',
    //     description: 'Elegant silk dupatta with beautiful gota patti work and tassels. Perfect to pair with any ethnic outfit.',
    //     price: 899,
    //     originalPrice: 1299,
    //     category: savedCategories.find(cat => cat.name === 'Accessories')._id,
    //     subcategory: 'Dupattas',
    //     material: 'Pure Silk',
    //     colors: ['Pink', 'Yellow', 'Green', 'Orange', 'Blue'],
    //     sizes: ['Free Size'],
    //     images: [
    //       'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=400&fit=crop'
    //     ],
    //     tags: ['dupatta', 'silk', 'gota work', 'tassels', 'elegant'],
    //     stock: 40,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: true
    //   },

    //   // FESTIVE WEAR COLLECTION
    //   {
    //     name: 'Diwali Special Silk Saree',
    //     description: 'Luxurious silk saree with gold zari work, specially curated for Diwali celebrations. Comes with matching blouse piece.',
    //     price: 7999,
    //     originalPrice: 10999,
    //     category: savedCategories.find(cat => cat.name === 'Festive Wear')._id,
    //     subcategory: 'Diwali Special',
    //     material: 'Pure Silk',
    //     colors: ['Deep Red', 'Golden Yellow', 'Royal Blue', 'Emerald Green'],
    //     sizes: ['Free Size'],
    //     images: [
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['diwali', 'festival', 'silk', 'zari work', 'special occasion'],
    //     stock: 12,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: true
    //   },
    //   {
    //     name: 'Wedding Guest Lehenga',
    //     description: 'Elegant lehenga perfect for wedding guests. Features subtle embroidery and comfortable fit for long celebrations.',
    //     price: 11999,
    //     originalPrice: 15999,
    //     category: savedCategories.find(cat => cat.name === 'Festive Wear')._id,
    //     subcategory: 'Wedding Guest',
    //     material: 'Georgette & Net',
    //     colors: ['Dusty Rose', 'Sage Green', 'Powder Blue', 'Champagne'],
    //     sizes: ['S', 'M', 'L', 'XL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['wedding guest', 'elegant', 'comfortable', 'subtle embroidery', 'celebration'],
    //     stock: 15,
    //     inStock: true,
    //     isFeatured: true,
    //     isNew: false
    //   },
    //   {
    //     name: 'Navratri Chaniya Choli',
    //     description: 'Vibrant chaniya choli set perfect for Navratri celebrations. Features mirror work and comfortable fit for dancing.',
    //     price: 3999,
    //     originalPrice: 5499,
    //     category: savedCategories.find(cat => cat.name === 'Festive Wear')._id,
    //     subcategory: 'Navratri Collection',
    //     material: 'Cotton & Mirror Work',
    //     colors: ['Bright Pink', 'Yellow', 'Green', 'Orange', 'Purple'],
    //     sizes: ['S', 'M', 'L', 'XL'],
    //     images: [
    //       'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop',
    //       'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop'
    //     ],
    //     tags: ['navratri', 'chaniya choli', 'dance', 'mirror work', 'vibrant'],
    //     stock: 20,
    //     inStock: true,
    //     isFeatured: false,
    //     isNew: true
    //   }
    // ];
    // await Product.insertMany(products);

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