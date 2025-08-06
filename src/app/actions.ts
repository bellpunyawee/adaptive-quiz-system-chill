// src/app/actions.ts
'use server';

import { signIn, signOut } from '@/auth';

export async function handleSignIn(formData: FormData) {
  await signIn('credentials', formData);
}

export async function handleSignOut() {
  await signOut();
}