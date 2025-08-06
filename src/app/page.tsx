import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Welcome to the Adaptive Quiz System</CardTitle>
          <CardDescription>
            Log in to track your progress and start a new quiz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
             {/* This will eventually be replaced by dynamic logic after login */}
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button variant="outline">Login</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}