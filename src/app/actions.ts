'use server';

import { signIn, signOut, auth } from '@/auth';
import prisma from '../lib/db'; // Import prisma
import { hash } from 'bcrypt';  // Import bcrypt
import { redirect } from 'next/navigation'; // redirect is needed

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

  // Find all available cells
  const allCells = await prisma.cell.findMany();

  // Create the new user and their initial mastery records in a single transaction
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      userCellMastery: {
        create: allCells.map(cell => ({
          cellId: cell.id,
          ability_theta: 0, // Start with neutral ability
          selection_count: 0,
          mastery_status: 0, // Not mastered
        })),
      },
    },
  });

  // Automatically sign in the user after they register
  await signIn('credentials', formData);
}

export async function startNewQuiz() {
  console.log('[ACTION] Attempting to start a new quiz...');
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[ACTION] No user session. Halting and redirecting to login.');
    return redirect('/');
  }

  const userId = session.user.id;

  // --- THIS IS THE NEW LOGIC ---
  // Before creating a new quiz, reset the mastery status for the user.
  // This makes all cells eligible for testing in the new session.
  console.log(`[ACTION] Resetting mastery status for user: ${userId}`);
  await prisma.userCellMastery.updateMany({
    where: { userId: userId },
    data: { 
      mastery_status: 0,
      selection_count: 0, // Also reset selection count for a fresh exploration start
    },
  });
  console.log(`[ACTION] Mastery status has been reset.`);
  // -----------------------------

  let newQuiz;
  
  try {
    newQuiz = await prisma.quiz.create({
      data: {
        userId: userId,
        status: 'in-progress',
      },
    });
    console.log(`[ACTION] DB write successful. New quiz ID: ${newQuiz.id}`);

  } catch (error) {
    console.error('--- DATABASE WRITE FAILED ---');
    console.error(error);
    throw new Error('Failed to create quiz record in the database. Please try again.');
  }

  redirect(`/quiz/${newQuiz.id}`);
}