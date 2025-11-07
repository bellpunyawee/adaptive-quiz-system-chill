// scripts/promote-admin.ts
/**
 * Script to promote a user to admin role
 * Usage: npx tsx scripts/promote-admin.ts <user-email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function promoteUserToAdmin(email: string) {
  try {
    console.log(`Looking for user with email: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log('✅ User is already an admin!');
      process.exit(0);
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
    });

    console.log('✅ User successfully promoted to admin!');
    console.log(`Updated role: ${updatedUser.role}`);
  } catch (error) {
    console.error('❌ Error promoting user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide user email as argument');
  console.log('Usage: npx tsx scripts/promote-admin.ts <user-email>');
  process.exit(1);
}

promoteUserToAdmin(email);
