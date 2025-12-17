// src/components/course/CourseAuthGuard.tsx
// Client-side course authorization guard component

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CourseAuthGuardProps {
  courseId: string;
  requiredRole?: 'INSTRUCTOR' | 'ADMIN';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface AuthCheckResult {
  authorized: boolean;
  role?: string;
  error?: string;
}

/**
 * Client-side guard for course access
 * Performs authorization check via API and shows fallback or redirects if unauthorized
 */
export function CourseAuthGuard({
  courseId,
  requiredRole,
  children,
  fallback,
}: CourseAuthGuardProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<{
    loading: boolean;
    authorized: boolean;
    role?: string;
  }>({
    loading: true,
    authorized: false,
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch(`/api/courses/${courseId}/auth-check`);
        const data: AuthCheckResult = await response.json();

        if (!response.ok || !data.authorized) {
          setAuthState({ loading: false, authorized: false });
          // Redirect to 403 page
          router.push('/403?reason=course_access_denied');
          return;
        }

        // Check required role
        if (requiredRole) {
          if (requiredRole === 'INSTRUCTOR' && data.role !== 'INSTRUCTOR' && data.role !== 'ADMIN') {
            setAuthState({ loading: false, authorized: false });
            router.push('/403?reason=instructor_access_required');
            return;
          }
          if (requiredRole === 'ADMIN' && data.role !== 'ADMIN') {
            setAuthState({ loading: false, authorized: false });
            router.push('/403?reason=admin_access_required');
            return;
          }
        }

        setAuthState({ loading: false, authorized: true, role: data.role });
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthState({ loading: false, authorized: false });
        router.push('/403?reason=auth_check_failed');
      }
    }

    checkAuth();
  }, [courseId, requiredRole, router]);

  if (authState.loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    );
  }

  if (!authState.authorized) {
    return null; // Redirecting
  }

  return <>{children}</>;
}

/**
 * HOC for wrapping components with course authorization
 */
export function withCourseAuth<P extends { courseId: string }>(
  Component: React.ComponentType<P>,
  requiredRole?: 'INSTRUCTOR' | 'ADMIN'
) {
  return function AuthorizedComponent(props: P) {
    return (
      <CourseAuthGuard courseId={props.courseId} requiredRole={requiredRole}>
        <Component {...props} />
      </CourseAuthGuard>
    );
  };
}
