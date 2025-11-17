// scripts/verify-admin.ts
/**
 * Script to verify admin accounts
 * Usage: npx tsx scripts/verify-admin.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAdminAccounts() {
  try {
    console.log('=== Admin Accounts ===\n');

    // Find all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (admins.length === 0) {
      console.log('❌ No admin accounts found!');
      console.log('\nTo create an admin account, run:');
      console.log('npx tsx scripts/create-admin-simple.ts "Admin Name" admin@example.com password123');
    } else {
      console.log(`✅ Found ${admins.length} admin account(s):\n`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Created: ${admin.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

    // Show total user count
    const totalUsers = await prisma.user.count();
    const regularUsers = totalUsers - admins.length;

    console.log('📊 User Statistics:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Admin Users: ${admins.length}`);
    console.log(`   Regular Users: ${regularUsers}`);

  } catch (error) {
    console.error('❌ Error verifying admin accounts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdminAccounts();
