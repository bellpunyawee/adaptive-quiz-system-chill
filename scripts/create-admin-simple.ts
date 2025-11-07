// scripts/create-admin-simple.ts
/**
 * Script to create a new admin user account
 * Usage: npx tsx scripts/create-admin-simple.ts <name> <email> <password>
 * Example: npx tsx scripts/create-admin-simple.ts "Admin User" admin@example.com SecurePass123
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminAccount(name: string, email: string, password: string) {
  try {
    console.log('=== Creating Admin Account ===\n');

    // Validate inputs
    if (!name || !email || !password) {
      console.error('❌ All fields are required!');
      console.log('\nUsage: npx tsx scripts/create-admin-simple.ts <name> <email> <password>');
      console.log('Example: npx tsx scripts/create-admin-simple.ts "Admin User" admin@example.com SecurePass123');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.error(`❌ User with email ${email} already exists!`);
      console.log('\nTo promote existing user to admin, use:');
      console.log(`npx tsx scripts/promote-admin.ts ${email}`);
      process.exit(1);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await hash(password, 10);

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('\n✅ Admin account created successfully!');
    console.log('\n📋 Account Details:');
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser.id}`);
    console.log('\n🎉 You can now sign in with these credentials!');
    console.log(`\n   Login at: http://localhost:3000`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get details from command line arguments
const name = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

if (!name || !email || !password) {
  console.error('❌ Missing required arguments!');
  console.log('\nUsage: npx tsx scripts/create-admin-simple.ts <name> <email> <password>');
  console.log('Example: npx tsx scripts/create-admin-simple.ts "Admin User" admin@example.com SecurePass123');
  process.exit(1);
}

createAdminAccount(name, email, password);
