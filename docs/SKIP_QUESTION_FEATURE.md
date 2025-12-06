# "I Don't Know" Button Feature

## Overview

Implemented a user-friendly skip functionality that allows students to skip questions they're unsure about without penalty, promoting learner autonomy and reducing test anxiety.

## User Requirements

✅ **No skip limit** - Students have full autonomy to skip as many questions as needed
✅ **Confirmation dialog** - Only for "I Don't Know" button (not for submit)
✅ **No additional penalty** - Skips treated as incorrect (isCorrect = false), no worse
✅ **Grey color scheme** - Neutral, non-judgmental visual indicator
✅ **Database safety** - Backup created before migration

## Implementation

### Database Changes

**Schema Updates** ([prisma/schema.prisma](../prisma/schema.prisma:153))
```prisma
model UserAnswer {
  selectedOptionId String?  // Made nullable for skips
  wasSkipped       Boolean  @default(false)
  skipReason       String?  @default("dont_know")
  // ... other fields
}
```

### API Endpoint

**Updated** [src/app/api/quiz/[quizId]/route.ts](../src/app/api/quiz/[quizId]/route.ts)
- Accepts `wasSkipped` parameter
- Handles null `selectedOptionId` when skipped
- Returns skip indicator in feedback response
- Creates UserAnswer with skip tracking fields

### UI Components

**Updated** [src/app/quiz/[quizId]/page.tsx](../src/app/quiz/[quizId]/page.tsx)
- Added "I Don't Know" button with grey outline styling
- Implemented confirmation dialog (AlertDialog component)
- Updated feedback display with grey color scheme for skips
- Added skip icon (⊘) and "No worries!" message

**Button Layout:**
```
[Submit Answer]  [I Don't Know]
```

**Confirmation Dialog:**
> **Skip this question?**
> You can skip this question if you're unsure. This will be recorded as an incorrect answer for your progress tracking, but there's no additional penalty.
>
> [Go Back] [Yes, Skip Question]

### Analytics Tracking

**Updated** [src/lib/adaptive-engine/monitoring.ts](../src/lib/adaptive-engine/monitoring.ts)
- Added `question_skipped` event type
- New method: `trackQuestionSkipped()`
- Logs skip events with difficulty, ability, and response time

**Updated** [src/lib/adaptive-engine/engine-enhanced.ts](../src/lib/adaptive-engine/engine-enhanced.ts)
- Modified `processUserAnswer()` to accept `wasSkipped` parameter
- Tracks skip events in monitoring system
- Treats skips as incorrect in IRT calculations

## IRT Treatment

Skipped questions are treated as **incorrect responses** in ability estimation:
- `isCorrect = false`
- Processed through standard IRT algorithms (EAP/MLE)
- No additional penalty beyond incorrect marking
- Standard CAT practice

## Testing

**Test Suite:** [src/app/api/quiz/[quizId]/__tests__/skip-question.test.ts](../src/app/api/quiz/[quizId]/__tests__/skip-question.test.ts)

Tests cover:
- Skip request handling with null selectedOptionId
- Database record creation with skip flags
- Feedback response format
- IRT processing (treated as incorrect)
- Duplicate skip submissions
- Response time tracking
- Regular answer flow (not affected)

## Visual Design

### Skip Feedback Card (Grey Theme)
- Background: `bg-muted`
- Border: `border-muted-foreground/20`
- Icon: ⊘ (null set symbol)
- Message: "No worries! Here's the correct answer:"
- Explanation shown with neutral grey border

### Correct/Incorrect Feedback (Unchanged)
- Correct: Green theme with ✓ icon
- Incorrect: Red theme with ✗ icon

## Files Changed

1. `prisma/schema.prisma` - Added skip tracking fields
2. `src/app/api/quiz/[quizId]/route.ts` - Handle skip requests
3. `src/app/quiz/[quizId]/page.tsx` - UI with confirmation dialog
4. `src/lib/adaptive-engine/monitoring.ts` - Skip analytics
5. `src/lib/adaptive-engine/engine-enhanced.ts` - IRT processing
6. `src/app/api/quiz/[quizId]/__tests__/skip-question.test.ts` - Test suite

## User Experience

### Before Skip:
1. Student reads question
2. Uncertain about answer
3. Previously: Forced to guess (anxiety-inducing)

### After Skip:
1. Student reads question
2. Clicks "I Don't Know" button
3. Confirmation dialog appears
4. Can go back to attempt or confirm skip
5. Sees grey feedback card with explanation
6. Moves to next question without penalty

## Benefits

1. **Reduces Test Anxiety** - Students don't feel forced to guess
2. **Promotes Honesty** - Encourages authentic self-assessment
3. **Better Data Quality** - Distinguishes between wrong answers and unknown concepts
4. **Learner Autonomy** - Gives students control over their learning pace
5. **Analytics Insight** - Tracks knowledge gaps more accurately

## Migration

Database backup created at: `prisma/dev.db.backup.2025-11-24`

Schema changes applied via `npx prisma db push`

## Implementation Date

November 24, 2025
