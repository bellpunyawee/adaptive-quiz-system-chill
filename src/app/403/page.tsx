// src/app/403/page.tsx
// 403 Forbidden error page

import Link from 'next/link';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';

interface PageProps {
  searchParams: { reason?: string };
}

const reasonMessages: Record<string, { title: string; description: string }> = {
  course_access_denied: {
    title: 'Course Access Denied',
    description: 'You do not have permission to access this course. Please contact your instructor if you believe this is an error.',
  },
  instructor_access_required: {
    title: 'Instructor Access Required',
    description: 'This page is only accessible to course instructors. If you are a student, you do not have permission to view this content.',
  },
  admin_access_required: {
    title: 'Administrator Access Required',
    description: 'This page is restricted to system administrators only.',
  },
  auth_check_failed: {
    title: 'Authorization Check Failed',
    description: 'We were unable to verify your access permissions. Please try again or contact support.',
  },
  default: {
    title: 'Access Forbidden',
    description: 'You do not have permission to access this resource.',
  },
};

export default function ForbiddenPage({ searchParams }: PageProps) {
  const reason = searchParams.reason || 'default';
  const message = reasonMessages[reason] || reasonMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-red-100 p-6">
            <ShieldX className="h-16 w-16 text-red-600" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold text-gray-900 mb-4">403</h1>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          {message.title}
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          {message.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Need help?</strong> If you believe you should have access to this content,
            please contact your course instructor or system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
