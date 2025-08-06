import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";

// This is a placeholder. You'll fetch real data later.
const performanceData = {
  overallScore: 80,
  modules: [
    { id: '01', score: 60 },
    { id: '02', score: 85 },
    { id: '03', score: 70 },
  ]
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, Loki</h1>
          <p className="text-muted-foreground">Here is an overview of your progress and performance.</p>
        </div>
        <Button asChild>
            <Link href="/quiz/start">Start New Quiz</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Performance Activity</CardTitle>
            <CardDescription>Your scores across different modules.</CardDescription>
          </CardHeader>
          <CardContent>
             {/* You would render a bar chart component here */}
            <div className="h-60 bg-secondary rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Performance Chart Placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
             {/* You would render a progress ring component here */}
            <div className="w-40 h-40 bg-secondary rounded-full flex items-center justify-center text-4xl font-bold mb-4">
              {performanceData.overallScore}%
            </div>
            <h3 className="text-xl font-semibold">Keep it going!</h3>
            <p className="text-muted-foreground">You are doing great.</p>
            <Button variant="outline" className="mt-4">Continue Learning</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}