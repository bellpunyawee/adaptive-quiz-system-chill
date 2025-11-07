// src/app/admin/layout.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { handleSignOut } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user?.id) {
    redirect("/");
  }

  // Check if user has admin role
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <AdminSidebar user={session.user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Admin Panel
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Welcome back, {session.user.name}
              </p>
            </div>
            <form action={handleSignOut}>
              <Button variant="outline" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
