'use server';

import { signIn, signOut, auth } from '@/auth';
import prisma from '../lib/db';
import { hash } from 'bcrypt';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';

export async function handleSignIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          throw new Error('Invalid credentials');
        default:
          throw new Error('Something went wrong');
      }
    }
    throw error;
  }
}

export async function handleSignOut() {
  await signOut();
}

/**
 * Handle user registration
 */
export async function handleSignUp(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    throw new Error('Please provide all required fields.');
  }

  const hashedPassword = await hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  const allCells = await prisma.cell.findMany();

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      userCellMastery: {
        create: allCells.map(cell => ({
          cellId: cell.id,
          ability_theta: 0,
          selection_count: 0,
          mastery_status: 0,
        })),
      },
    },
  });

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          throw new Error('Invalid credentials');
        default:
          throw new Error('Something went wrong');
      }
    }
    throw error;
  }
}

/**
 * Start a new quiz with default settings (Quick Start)
 */
export async function startNewQuiz() {
  console.log('[ACTION] Attempting to start a new quiz...');
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[ACTION] No user session. Redirecting to login.');
    redirect('/');
  }

  const userId = session.user.id;
  console.log(`[ACTION] User ID from session: ${userId}`);

  try {
    // Validate user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!userExists) {
      console.error(`[ACTION] User ${userId} not found in database!`);
      console.error('[ACTION] Signing out and redirecting...');
      await signOut();
      redirect('/');
    }

    console.log(`[ACTION] User validated: ${userExists.email}`);

    // Reset mastery status
    console.log(`[ACTION] Resetting mastery status for user: ${userId}`);
    const resetResult = await prisma.userCellMastery.updateMany({
      where: { userId },
      data: { 
        mastery_status: 0,
        selection_count: 0,
      },
    });
    console.log(`[ACTION] Reset ${resetResult.count} mastery records`);

    // Create new quiz with default settings
    // Defaults: No timer, 5 questions, balanced exploration (0.5)
    console.log('[ACTION] Creating new quiz...');
    const newQuiz = await prisma.quiz.create({
      data: {
        userId,
        status: 'in-progress',
        startedAt: new Date(),
        explorationParam: 0.5,  // Balanced exploration
        timerMinutes: null,      // No timer (unlimited time)
        maxQuestions: 5,         // 5 questions
        topicSelection: 'system',
        selectedCells: null,
      },
    });
    
    console.log(`[ACTION] ✅ Quiz created successfully! ID: ${newQuiz.id}`);

    // Redirect to the new quiz
    // NOTE: This will throw a NEXT_REDIRECT "error" which is intentional
    redirect(`/quiz/${newQuiz.id}`);

  } catch (error) {
    // ===== DON'T CATCH NEXT.JS REDIRECTS =====
    // Check if this is a Next.js redirect (not an actual error)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      // This is expected behavior - let it propagate
      throw error;
    }

    // Only handle actual errors
    console.error('[ACTION] ❌ DATABASE OPERATION FAILED');
    console.error('[ACTION] Error details:', error);
    
    if (error instanceof Error) {
      console.error('[ACTION] Error name:', error.name);
      console.error('[ACTION] Error message:', error.message);
      
      // Check for specific Prisma errors
      if ('code' in error) {
        const prismaError = error as any;
        console.error('[ACTION] Prisma error code:', prismaError.code);
        
        if (prismaError.code === 'P2003') {
          console.error('[ACTION] Foreign key constraint violation!');
          await signOut();
          throw new Error('Your session is invalid. Please sign in again.');
        }
      }
    }
    
    throw new Error('Failed to create quiz. Please try again or sign out and back in.');
  }
}