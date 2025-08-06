'use server';

import { signIn, signOut } from '@/auth';
import prisma from '../lib/db'; // Import prisma
import { hash } from 'bcrypt';  // Import bcrypt

export async function handleSignIn(formData: FormData) {
  await signIn('credentials', formData);
}

export async function handleSignOut() {
  await signOut();
}

// New function for handling user registration
export async function handleSignUp(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    throw new Error('Please provide all required fields.');
  }

  // Hash the password before storing it
  const hashedPassword = await hash(password, 10);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  // Create the new user in the database
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  // Automatically sign in the user after they register
  await signIn('credentials', formData);
}