const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config();

const categories = [
  {
    name: 'Sarees',
    description: 'Traditional Indian sarees in various fabrics and designs. Perfect for weddings, festivals, and special occasions.',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500&h=500&fit=crop',
    subcategories: [
      {
        name: 'Silk Sarees',
        slug: 'silk-sarees',
        description: 'Premium silk sarees including Banarasi, Kanjivaram, and Tussar silk'
      },
      {
        name: 'Cotton Sarees',
        slug: 'cotton-sarees',
        description: 'Comfortable cotton sarees for daily wear and casual occasions'
      },
      {
        name: 'Designer Sarees',
        slug: 'designer-sarees',
        description: 'Contemporary designer sarees with modern patterns and embellishments'
      },
      {
        name: 'Wedding Sarees',
        slug: 'wedding-sarees',
        description: 'Luxurious sarees perfect for bridal wear and wedding ceremonies'
      }
    ],
    featured: true,
    sortOrder: 1
  },
  {
    name: 'Lehengas',
    description: 'Elegant lehengas and ghagras for weddings, festivals, and special celebrations.',
    image: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=500&h=500&fit=crop',
    subcategories: [
      {
        name: 'Bridal Lehengas',
        slug: 'bridal-lehengas',
        description: 'Stunning bridal lehengas with heavy embroidery and embellishments'
      },
      {
        name: 'Party Lehengas',
        slug: 'party-lehengas',
        description: 'Stylish lehengas perfect for parties and celebrations'
      },
      {
        name: 'Designer Lehengas',
        slug: 'designer-lehengas',
        description: 'Contemporary designer lehengas with modern cuts and styles'
      },
      {
        name: 'Traditional Lehengas',
        slug: 'traditional-lehengas',
        description: 'Classic traditional lehengas with authentic Indian craftsmanship'
      }
    ],
    featured: true,
    sortOrder: 2
  },
  {
    name: 'Kurtis & Suits',
    description: 'Comfortable and stylish kurtis, salwar suits, and ethnic wear for everyday fashion.',
    image: 'https://images.unsplash.com/photo-1583391733981-3cc22c4e0e3e?w=500&h=500&fit=crop',
    subcategories: [
      {
        name: 'Anarkali Suits',
        slug: 'anarkali-suits',
        description: 'Flowing Anarkali suits with elegant silhouettes'
      },
      {
        name: 'Straight Suits',
        slug: 'straight-suits',
        description: 'Classic straight-cut salwar suits for comfort and style'
      },
      {
        name: 'Palazzo Sets',
        slug: 'palazzo-sets',
        description: 'Trendy kurti and palazzo combinations'
      },
      {
        name: 'Cotton Kurtis',
        slug: 'cotton-kurtis',
        description: 'Comfortable cotton kurtis for daily wear'
      }
    ],
    featured: true,
    sortOrder: 3
  },
  {
    name: 'Accessories',
    description: 'Complete your ethnic look with traditional jewelry, bags, and accessories.',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=500&fit=crop',
    subcategories: [
      {
        name: 'Jewelry',
        slug: 'jewelry',
        description: 'Traditional and contemporary jewelry pieces'
      },
      {
        name: 'Bags & Clutches',
        slug: 'bags-clutches',
        description: 'Ethnic bags, potlis, and clutches'
      },
      {
        name: 'Footwear',
        slug: 'footwear',
        description: 'Traditional footwear including juttis and mojaris'
      },
      {
        name: 'Dupattas',
        slug: 'dupattas',
        description: 'Beautiful dupattas and stoles to complement your outfit'
      }
    ],
    featured: false,
    sortOrder: 4
  }
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert new categories one by one to trigger pre-save hooks
    const createdCategories = [];
    for (const categoryData of categories) {
      const category = new Category(categoryData);
      await category.save();
      createdCategories.push(category);
    }
    
    console.log(`Created ${createdCategories.length} categories:`);
    
    createdCategories.forEach(category => {
      console.log(`- ${category.name} (${category.slug})`);
    });

    console.log('\n✅ Categories seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

// Run the seeder
seedCategories();