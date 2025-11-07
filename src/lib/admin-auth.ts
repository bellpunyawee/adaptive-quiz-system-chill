// src/lib/admin-auth.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Check if the current user has admin role
 * @returns true if user is authenticated and has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "admin";
}

/**
 * Middleware helper to require admin role for API routes
 * Returns error response if not authenticated or not admin
 * @returns null if authorized, NextResponse with error if not
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Get the current session with admin check
 * @returns session if user is admin, throws error otherwise
 */
export async function getAdminSession() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized. Please sign in.");
  }

  if (session.user.role !== "admin") {
    throw new Error("Forbidden. Admin access required.");
  }

  return session;
}
