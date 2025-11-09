// src/components/admin/QuickActions.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Settings, UserPlus, Download } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
        <CardDescription>Common administrative tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Link href="/admin/health" className="block">
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            View System Health
          </Button>
        </Link>
        <Link href="/admin/maintenance" className="block">
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Run Maintenance
          </Button>
        </Link>
        <Link href="/admin/users" className="block">
          <Button variant="outline" className="w-full justify-start" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Manage Users
          </Button>
        </Link>
        <Button
          variant="outline"
          className="w-full justify-start"
          size="sm"
          disabled
        >
          <Download className="h-4 w-4 mr-2" />
          Export Data (Soon)
        </Button>
      </CardContent>
    </Card>
  );
}
