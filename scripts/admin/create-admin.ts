// scripts/create-admin.ts
/**
 * Script to create a new admin user account
 * Usage: npx tsx scripts/create-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdminAccount() {
  try {
    console.log('=== Create Admin Account ===\n');

    // Get user details
    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');

    if (!name || !email || !password) {
      console.error('❌ All fields are required!');
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
    console.log('\n🔐 Hashing password...');
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
    console.log(`   Email: ${email}`);
    console.log(`   Password: [the password you entered]`);

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdminAccount();
