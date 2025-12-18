// src/components/instructor/InstructorSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  PlusCircle,
  GraduationCap,
  Menu,
  X,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface InstructorSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/instructor',
    icon: LayoutDashboard,
  },
  {
    name: 'My Courses',
    href: '/instructor',
    icon: BookOpen,
  },
  {
    name: 'Create Course',
    href: '/instructor/courses/new',
    icon: PlusCircle,
  },
  {
    name: 'Student Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'View student interface',
  },
];

export function InstructorSidebar({ user }: InstructorSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 dark:bg-slate-950 transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo / Brand */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold text-white">Instructor</h1>
              <p className="text-xs text-slate-400">Course Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  {item.description && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user.name?.[0]?.toUpperCase() || 'I'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-900/50 text-blue-300 border border-blue-800">
              <GraduationCap className="h-3 w-3" />
              Instructor
            </span>
            {user.role === 'admin' && (
              <Link href="/admin">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-900/50 text-purple-300 border border-purple-800 hover:bg-purple-800 transition-colors cursor-pointer">
                  Admin
                </span>
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
