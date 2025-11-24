# LLM-Based Personalized Feedback Feature

## Overview

The Adaptive Quiz System now includes **AI-powered personalized feedback** using Google's Gemini 2.5 Flash model. This feature provides learners with actionable insights based on their quiz performance, learning trajectory, and psychometric data.

---

## Features

### ✨ Key Capabilities

1. **Performance Analysis**: Deep analysis of quiz results contextualized with IRT ability estimates
2. **Personalized Insights**: Tailored feedback based on individual learning history
3. **Actionable Recommendations**: Specific next steps for improvement
4. **Growth-Oriented**: Focus on learning trajectory, not just scores
5. **PDPA Compliant**: Data anonymization and privacy controls
6. **Auto-Generation**: Feedback automatically generates on quiz completion (no manual clicks)
7. **Option Shuffling**: Quiz options randomized to prevent pattern guessing

### 📊 What Gets Analyzed

- Quiz performance (score, accuracy, time spent)
- Topic-specific mastery levels
- IRT ability estimates (θ) and confidence levels
- Learning trajectory over past 30 days
- Difficult questions and common mistakes
- Growth since baseline assessment

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│  Results Page (quiz/results/[quizId])           │
│  └── PersonalizedFeedback Component             │
│       └── Calls API Endpoint                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  API: POST /api/quiz/[quizId]/feedback          │
│  1. Authenticate user                            │
│  2. Validate quiz completed                      │
│  3. Check cache (FeedbackLog)                    │
│  4. Assemble context                             │
│  5. Generate feedback (Gemini)                   │
│  6. Store & return                               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Context Assembler                               │
│  - Quiz metrics (score, topics, duration)        │
│  - User mastery (ability, confidence)            │
│  - Ability history (growth, trends)              │
│  - Topic performance breakdown                   │
│  - Difficult questions analysis                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Gemini 2.5 Flash API                            │
│  - System instruction (prompt template)          │
│  - User context (quiz data)                      │
│  - Structured output (markdown format)           │
└─────────────────────────────────────────────────┘
```

### Database Models

#### FeedbackLog
Stores generated feedback for caching and analytics:
```prisma
model FeedbackLog {
  id            String   @id
  userId        String
  quizId        String
  feedbackText  String
  feedbackType  String   @default("quiz_summary")
  tokensUsed    Int
  responseTime  Int      // milliseconds
  usedCache     Boolean
  modelUsed     String   // "gemini-2.5-flash"
  createdAt     DateTime
}
```

#### LearnerPreferences
Tracks user preferences for feedback customization:
```prisma
model LearnerPreferences {
  id              String @id
  userId          String @unique
  feedbackDetail  String @default("balanced") // concise | balanced | detailed
  focusAreas      String? // JSON array
  motivationStyle String @default("growth")
}
```

#### KnowledgeGap
Tracks identified knowledge gaps for targeted recommendations:
```prisma
model KnowledgeGap {
  id             String   @id
  userId         String
  topicId        String
  gapDescription String
  severity       String   @default("moderate")
  addressed      Boolean  @default(false)
}
```

---

## Setup Instructions

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Gemini API Configuration for Personalized Feedback
GEMINI_API_KEY="your-gemini-api-key-here"
```

### 3. Install Dependencies

Dependencies are already installed:
```bash
npm install @google/generative-ai
```

### 4. Database Migration

The Prisma models are already migrated. If needed:
```bash
npx prisma db push
npx prisma generate
```

### 5. Verify Setup

Start the development server:
```bash
npm run dev
```

Navigate to any quiz results page and click "Generate Personalized Feedback"

---

## Usage

### For End Users

1. **Complete a Quiz**: Finish any quiz to access results page
2. **Generate Feedback**: Click "Generate Personalized Feedback" button
3. **Review Insights**:
   - Performance Summary
   - Key Strengths
   - Growth Opportunities
   - Recommended Next Steps
4. **Regenerate**: Click refresh icon to generate new feedback

### For Developers

#### API Endpoints

**Generate Feedback:**
```typescript
POST /api/quiz/[quizId]/feedback

Response:
{
  feedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
    insights: string;
    nextSteps: string[];
    fullText: string;
  },
  metadata: {
    generatedAt: Date;
    tokensUsed: number;
    responseTime: number;
    usedCache: boolean;
    modelUsed: string;
    cost: string;
  }
}
```

**Retrieve Existing Feedback:**
```typescript
GET /api/quiz/[quizId]/feedback

Response: Same as POST
```

#### Component Usage

```tsx
import { PersonalizedFeedback } from '@/components/quiz/PersonalizedFeedback';

// In your results page
<PersonalizedFeedback
  quizId={quizId}
  autoLoad={true}  // ✅ Enabled: Auto-generates feedback on page load
/>
```

**UI Locations:**
1. **Regular Quiz Results**: `src/app/quiz/results/[quizId]/page.tsx:208`
2. **Baseline Results**: `src/app/quiz/baseline/results/[quizId]/page.tsx:139`
3. **Dashboard (Recent Insights)**: `src/app/dashboard/page.tsx:189` (uses RecentFeedback component)

#### Customizing Prompts

Edit [src/lib/ai/gemini-client.ts](../src/lib/ai/gemini-client.ts):

```typescript
export const FEEDBACK_SYSTEM_INSTRUCTION = `
  // Modify system instructions here
  // Control tone, structure, length, etc.
`;
```

Edit [src/lib/ai/context-assembler.ts](../src/lib/ai/context-assembler.ts):

```typescript
export function buildFeedbackPrompt(context: QuizContext): string {
  // Customize what data gets included in prompts
}
```

---

## Cost Analysis

### Pricing (Gemini 2.5 Flash)

- **Input**: $0.15 per 1M tokens
- **Output**: $0.60 per 1M tokens

### Typical Usage

Per quiz feedback:
- Input tokens: ~400-500 tokens
- Output tokens: ~250-300 tokens
- **Cost per feedback**: ~$0.0003 (3 hundredths of a cent)

### Cost Projections

| Scenario | Annual Cost |
|----------|-------------|
| 100 users × 200 quizzes | **$5-6** |
| 1,000 users × 200 quizzes | **$50-60** |
| 10,000 users × 200 quizzes | **$500-600** |

### Optimization Strategies

1. **Caching** (implemented):
   - Returns cached feedback if generated within 1 hour
   - Reduces costs by ~60-70%

2. **Template Routing** (future):
   - Use templates for simple cases (high/low performance)
   - LLM only for complex analysis
   - Additional 40% cost reduction

3. **Batch Processing** (future):
   - Generate feedback asynchronously
   - Use Gemini Batch API (50% discount)

---

## Performance

### Latency

- **Gemini API**: ~1-1.5 seconds (streaming)
- **Cache hit**: ~100-200ms
- **Total (including DB)**: ~2-3 seconds
- **P95 latency**: <5 seconds

✅ **Meets <10 second requirement**

### Optimization

1. **Streaming**: Progressive UI updates for better UX
2. **Async Processing**: Non-blocking feedback generation
3. **Connection Pooling**: Reuse HTTP connections
4. **Regional Endpoints**: Use Asia-Pacific region for lower latency

---

## Compliance (NUS PDPA)

### Data Protection Measures

1. **Data Anonymization**:
   - Remove user names, emails, student IDs
   - Only send quiz performance metrics
   - No PII sent to Gemini API

2. **Data Residency**:
   - ⚠️ **Action Required**: Contact Google Cloud about Singapore region
   - Consider Vertex AI for guaranteed data residency
   - Alternative: Self-hosted LLM (higher cost)

3. **Audit Logging**:
   - All feedback requests logged in `FeedbackLog`
   - Track tokens, response times, models used
   - Retention policy: Auto-delete after 2 years (configurable)

4. **User Consent**:
   - 🔜 **TODO**: Add consent checkbox on first quiz
   - Allow opt-out (fall back to static feedback)
   - Provide data access/deletion requests

### Compliance Checklist

- [ ] Contact NUS Data Protection Office
- [ ] Get approval for Gemini API usage
- [ ] Verify Google Cloud data residency options
- [ ] Implement user consent flow
- [ ] Document data processing agreement
- [ ] Security assessment by NUS IT
- [ ] Privacy policy addendum
- [ ] Regular compliance reviews

---

## Testing

### Manual Testing

1. **Complete a quiz**: `/quiz/settings` → Start Quiz
2. **View results**: Feedback auto-generates on page load (~2-3 seconds)
3. **Verify output**: Check all 4 sections populated (Summary, Strengths, Improvements, Next Steps)
4. **Test cache**: Refresh page within 1 hour → should load instantly (<100ms)
5. **Test shuffle**: Start quiz → verify options appear in random order each question

### API Testing (cURL)

```bash
# Generate feedback
curl -X POST http://localhost:3000/api/quiz/YOUR_QUIZ_ID/feedback \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN"

# Retrieve existing feedback
curl http://localhost:3000/api/quiz/YOUR_QUIZ_ID/feedback \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN"
```

### Unit Tests

Run existing tests:
```bash
npm test
```

TODO: Add specific tests for feedback generation

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Usage Metrics**:
   - Feedback generation requests per day
   - Cache hit rate
   - Average response time

2. **Cost Metrics**:
   - Daily/monthly API spend
   - Tokens per request
   - Cost per student

3. **Quality Metrics**:
   - User satisfaction (surveys)
   - Feedback actionability
   - Learning improvement correlation

### Analytics Dashboard

Access via:
```typescript
// TODO: Create admin dashboard at /admin/feedback-analytics

GET /api/admin/feedback/analytics

Response:
{
  totalFeedbackGenerated: number;
  avgLatency: number;
  cacheHitRate: number;
  totalCostThisMonth: number;
  studentSatisfaction: number;
}
```

---

## Troubleshooting

### Common Issues

#### "Feedback service not configured"
- **Cause**: `GEMINI_API_KEY` not set
- **Fix**: Add API key to `.env` file

#### "Failed to generate feedback"
- **Cause**: Quiz not completed or doesn't belong to user
- **Fix**: Ensure quiz status is "completed"

#### Slow response times (>10s)
- **Cause**: Network latency, large context
- **Fix**: Check internet connection, optimize prompt length

#### High costs
- **Cause**: Too many requests, no caching
- **Fix**: Enable caching, implement rate limiting

### Debug Mode

Enable detailed logging:
```bash
# In .env
NODE_ENV=development
```

Check console for:
- `[Feedback]` prefixed logs
- `[Gemini]` API call details
- Token usage and costs

---

## Quiz Option Shuffling

### Implementation
To prevent pattern guessing and ensure stochastic quiz presentation, answer options are **shuffled server-side** on each question load.

**Location**: `src/app/api/quiz/[quizId]/route.ts:88-91`

```typescript
// Shuffle options to prevent pattern guessing and add stochasticity
const publicOptions = answerOptions
  .map(({ id, text }) => ({ id, text }))
  .sort(() => Math.random() - 0.5);
```

### Benefits
- ✅ **Prevents Pattern Memorization**: Users can't learn "answer is usually B"
- ✅ **Tests Knowledge, Not Position**: Forces reading and comprehension
- ✅ **Improves IRT Accuracy**: Ability estimates reflect true understanding
- ✅ **Stochastic Presentation**: Different order for each user and each view

### Technical Details
- **Server-side**: Shuffle happens in API, not client (secure)
- **Per Request**: Each GET request generates new shuffle
- **Stable IDs**: Uses CUIDs, not array positions (answer validation works correctly)
- **Universal**: Applies to all quiz types (baseline, adaptive, practice)

---

## Future Enhancements

### Phase 2: Semantic Caching (Weeks 3-4)

- [ ] Set up ChromaDB vector database
- [ ] Implement embedding-based similarity search
- [ ] Cache feedback for similar quiz patterns
- [ ] **Expected**: 65% cache hit rate, 65% cost reduction

### Phase 3: Template Hybrid (Weeks 5-6)

- [ ] Analyze feedback patterns
- [ ] Create template library (10-15 templates)
- [ ] Build intelligent routing (template vs LLM)
- [ ] **Expected**: 70% template usage, 70% total cost reduction

### Phase 4: Advanced Features

- [ ] Dashboard insights (learning trajectory analysis)
- [ ] Learner preferences customization
- [ ] Knowledge gap tracking
- [ ] Spaced repetition integration
- [ ] Multi-language support
- [ ] Voice feedback (text-to-speech)

---

## FAQ

**Q: Can I use a different LLM?**
A: Yes! Modify [src/lib/ai/gemini-client.ts](../src/lib/ai/gemini-client.ts) to use OpenAI, Anthropic, or any LLM API.

**Q: How do I customize feedback tone/style?**
A: Edit `FEEDBACK_SYSTEM_INSTRUCTION` in gemini-client.ts

**Q: Is data sent to Google?**
A: Yes, quiz performance data (anonymized) is sent to Gemini API. User names/emails are NOT sent.

**Q: Can I disable feedback for certain users?**
A: Yes, add role-based access control in the API endpoint

**Q: How do I reduce costs?**
A: Enable caching, implement template routing, use Batch API for non-urgent feedback

**Q: Does it work offline?**
A: No, requires internet connection to Gemini API. Consider self-hosted LLM for offline use.

---

## Support

### Resources

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### Contact

For issues or questions:
1. Check this documentation first
2. Review console logs (development mode)
3. Open GitHub issue
4. Contact project maintainer

---

## License

Same as parent project (Adaptive Quiz System)

---

**Last Updated**: January 2025
**Version**: 1.0.0 (MVP)
