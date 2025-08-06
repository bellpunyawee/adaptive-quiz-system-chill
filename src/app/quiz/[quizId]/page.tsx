import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // We will add this component next
import { Label } from "@/components/ui/label"; // And this one too

// Placeholder data - In reality, this will be fetched from your API
const questionData = {
    questionNumber: 3,
    totalQuestions: 10,
    questionText: "Vestibulum placerat dolor in porta bibendum. Fusce ut mi efficitur, dapibus arcu a, consequat ex. Vivamus sem justo, consectetur at sem vitae, fermentum pharetra justo.",
    options: [
        { id: "A", text: "Tempor commodo ullamcorper a lacus vestibulum sed." },
        { id: "B", text: "Turpis massa sed elementum tempus egestas sed sed risus." },
        { id: "C", text: "Ac tortor dignissim convallis aenean et tortor." },
        { id: "D", text: "Urna et pharetra pharetra massa massa ultricies." },
    ]
};

export default function QuizPage({ params }: { params: { quizId: string } }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
             <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Adaptive Quiz - Attempt 1</h2>
                        <div className="text-sm text-muted-foreground">Time: 09:31 mins</div>
                    </div>
                    {/* Progress Bar Placeholder */}
                    <div className="w-full bg-secondary h-2 rounded-full mb-4">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${(questionData.questionNumber / questionData.totalQuestions) * 100}%` }}></div>
                    </div>
                    <CardTitle>Question {questionData.questionNumber}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-6 text-lg">{questionData.questionText}</p>
                    
                    <RadioGroup defaultValue={questionData.options[0].id}>
                        {questionData.options.map((option) => (
                            <div key={option.id} className="flex items-center space-x-2 p-4 border rounded-md has-[:checked]:bg-secondary">
                                <RadioGroupItem value={option.id} id={option.id} />
                                <Label htmlFor={option.id} className="flex-1 cursor-pointer">{option.text}</Label>
                            </div>
                        ))}
                    </RadioGroup>

                    <div className="mt-6 flex justify-end">
                        <Button size="lg">Submit Answer</Button>
                    </div>
                </CardContent>
             </Card>
        </div>
    )
}