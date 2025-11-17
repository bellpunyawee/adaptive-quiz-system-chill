/**
 * Expand Question Pool to 500+ Questions
 *
 * Generates questions with Gaussian-distributed difficulty parameters to ensure
 * fair coverage from Beginner to Advanced levels.
 *
 * Distribution Strategy:
 * - Difficulty (b): Normal distribution N(0, 1.2) covering [-3, +3]
 * - Discrimination (a): Realistic range [0.8, 2.0] with emphasis on quality items
 * - Guessing (c): Based on number of options (0.20-0.25 for MCQ)
 *
 * Usage:
 *   npx tsx src/scripts/expand-question-pool.ts [targetCount] [dryRun]
 */

import prisma from '@/lib/db';

interface QuestionTemplate {
  difficulty_b: number;      // Difficulty parameter
  discrimination_a: number;  // Discrimination parameter
  guessing_c: number;       // Guessing parameter
  difficultyLevel: 'Beginner' | 'Elementary' | 'Intermediate' | 'Advanced' | 'Expert';
  text: string;
  explanation: string;
  answerOptions: Array<{
    text: string;
    isCorrect: boolean;
  }>;
}

/**
 * Generate difficulty using Gaussian distribution
 * N(0, 1.2) covers approximately:
 * - 68% within [-1.2, +1.2] (core range)
 * - 95% within [-2.4, +2.4] (extended range)
 * - Clamped to [-3, +3]
 */
function generateGaussianDifficulty(): number {
  // Box-Muller transform for N(0, 1)
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Scale to N(0, 1.2) for wider coverage
  const difficulty = z * 1.2;

  // Clamp to [-3, +3] range
  return Math.max(-3, Math.min(3, difficulty));
}

/**
 * Generate discrimination parameter
 * Higher quality items have higher discrimination
 */
function generateDiscrimination(targetQuality: 'high' | 'medium' | 'low' = 'medium'): number {
  let a: number;

  if (targetQuality === 'high') {
    // High quality: a ~ [1.5, 2.0]
    a = 1.5 + Math.random() * 0.5;
  } else if (targetQuality === 'medium') {
    // Medium quality: a ~ [1.0, 1.5]
    a = 1.0 + Math.random() * 0.5;
  } else {
    // Lower quality: a ~ [0.8, 1.2]
    a = 0.8 + Math.random() * 0.4;
  }

  return Math.round(a * 100) / 100; // Round to 2 decimals
}

/**
 * Generate guessing parameter based on number of options
 */
function generateGuessing(numOptions: number): number {
  if (numOptions === 2) {
    return 0.50; // True/False
  } else if (numOptions === 3) {
    return 0.25 + Math.random() * 0.08; // 0.25-0.33
  } else if (numOptions === 4) {
    return 0.20 + Math.random() * 0.08; // 0.20-0.28
  } else {
    return 0.15 + Math.random() * 0.08; // 0.15-0.23 (5+ options)
  }
}

/**
 * Map difficulty to level label
 */
function getDifficultyLevel(b: number): 'Beginner' | 'Elementary' | 'Intermediate' | 'Advanced' | 'Expert' {
  if (b < -1.5) return 'Beginner';
  if (b < -0.5) return 'Elementary';
  if (b < 0.5) return 'Intermediate';
  if (b < 1.5) return 'Advanced';
  return 'Expert';
}

/**
 * Generate question templates with appropriate content
 */
function generateQuestionTemplates(count: number): QuestionTemplate[] {
  const templates: QuestionTemplate[] = [];

  // Python programming topics (primary focus)
  const pythonTopics = [
    'Variables and Data Types',
    'Control Flow',
    'Functions',
    'Data Structures',
    'Object-Oriented Programming',
    'File Handling',
    'Exception Handling',
    'Modules and Packages',
    'List Comprehensions',
    'Decorators',
    'Generators',
    'Lambda Functions',
    'Context Managers',
    'Regular Expressions',
    'Iterators',
  ];

  for (let i = 0; i < count; i++) {
    const b = generateGaussianDifficulty();
    const level = getDifficultyLevel(b);
    const topic = pythonTopics[i % pythonTopics.length];

    // Vary quality: 60% medium, 30% high, 10% low
    const qualityRand = Math.random();
    const quality = qualityRand < 0.3 ? 'high' : qualityRand < 0.9 ? 'medium' : 'low';

    const a = generateDiscrimination(quality);

    // Vary number of options: mostly 4-5 options
    const numOptions = Math.random() < 0.7 ? 4 : 5;
    const c = generateGuessing(numOptions);

    // Generate question text based on difficulty level
    const questionText = generateQuestionText(topic, level, i);
    const explanation = generateExplanation(topic, level);
    const answerOptions = generateAnswerOptions(topic, level, numOptions);

    templates.push({
      difficulty_b: Math.round(b * 100) / 100,
      discrimination_a: a,
      guessing_c: Math.round(c * 1000) / 1000,
      difficultyLevel: level,
      text: questionText,
      explanation: explanation,
      answerOptions: answerOptions,
    });
  }

  return templates;
}

/**
 * Generate question text based on topic and difficulty
 */
function generateQuestionText(topic: string, level: string, index: number): string {
  const templates: Record<string, Record<string, string[]>> = {
    'Variables and Data Types': {
      'Beginner': [
        'Which keyword is used to create a variable in Python?',
        'What is the output of: print(type(5))?',
        'Which of the following is a valid variable name?',
      ],
      'Elementary': [
        'What will be the output of: x = 5; y = x; x = 10; print(y)?',
        'Which data type is used to store True or False values?',
        'What is the result of: str(123) + str(456)?',
      ],
      'Intermediate': [
        'What is the difference between == and is operators?',
        'How do you convert a string "3.14" to a float?',
        'What happens when you try to modify a tuple?',
      ],
      'Advanced': [
        'What is the memory overhead of Python integers compared to C?',
        'How does Python handle integer overflow?',
        'What is the difference between shallow and deep copy?',
      ],
      'Expert': [
        'Explain the memory management and reference counting in Python.',
        'How does Python implement duck typing at the interpreter level?',
        'What are the implications of interning in Python strings?',
      ],
    },
    'Control Flow': {
      'Beginner': [
        'Which keyword is used for conditional statements in Python?',
        'What is the syntax for a for loop in Python?',
        'How do you exit a loop prematurely?',
      ],
      'Elementary': [
        'What is the output of a for loop over range(3)?',
        'What does the continue statement do in a loop?',
        'How do you write an if-else statement in Python?',
      ],
      'Intermediate': [
        'What is the difference between break and continue?',
        'How do you iterate over a dictionary?',
        'What is a list comprehension?',
      ],
      'Advanced': [
        'How do you implement a switch-case equivalent in Python?',
        'What is the walrus operator and when would you use it?',
        'How does Python handle the else clause in loops?',
      ],
      'Expert': [
        'Explain the performance implications of list comprehensions vs generator expressions.',
        'How does Python optimize conditional expressions at bytecode level?',
        'What are the trade-offs between recursion and iteration in Python?',
      ],
    },
  };

  const topicTemplates = templates[topic] || templates['Variables and Data Types'];
  const levelTemplates = topicTemplates[level] || topicTemplates['Intermediate'];
  const templateIndex = index % levelTemplates.length;

  return `[${level}] ${topic}: ${levelTemplates[templateIndex]}`;
}

/**
 * Generate explanation based on topic and level
 */
function generateExplanation(topic: string, level: string): string {
  return `This ${level.toLowerCase()}-level question tests understanding of ${topic}. ` +
         `Review the relevant documentation and practice similar problems to master this concept.`;
}

/**
 * Generate answer options based on topic and level
 */
function generateAnswerOptions(
  topic: string,
  level: string,
  numOptions: number
): Array<{ text: string; isCorrect: boolean }> {
  const options: Array<{ text: string; isCorrect: boolean }> = [];

  // First option is correct
  options.push({
    text: `Correct answer for ${topic} (${level} level)`,
    isCorrect: true,
  });

  // Generate distractors
  for (let i = 1; i < numOptions; i++) {
    options.push({
      text: `Distractor ${i} - plausible but incorrect`,
      isCorrect: false,
    });
  }

  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

/**
 * Analyze distribution of generated questions
 */
function analyzeDistribution(templates: QuestionTemplate[]): void {
  console.log('\n📊 Distribution Analysis');
  console.log('='.repeat(70));

  // Difficulty distribution
  const difficultyRanges = {
    'Very Easy (b < -2)': templates.filter(t => t.difficulty_b < -2).length,
    'Easy (-2 ≤ b < -1)': templates.filter(t => t.difficulty_b >= -2 && t.difficulty_b < -1).length,
    'Below Average (-1 ≤ b < 0)': templates.filter(t => t.difficulty_b >= -1 && t.difficulty_b < 0).length,
    'Above Average (0 ≤ b < 1)': templates.filter(t => t.difficulty_b >= 0 && t.difficulty_b < 1).length,
    'Hard (1 ≤ b < 2)': templates.filter(t => t.difficulty_b >= 1 && t.difficulty_b < 2).length,
    'Very Hard (b ≥ 2)': templates.filter(t => t.difficulty_b >= 2).length,
  };

  console.log('\n🎯 Difficulty Distribution (b parameter):');
  for (const [range, count] of Object.entries(difficultyRanges)) {
    const percent = (count / templates.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / templates.length * 50));
    console.log(`  ${range.padEnd(30)} ${count.toString().padStart(3)} (${percent.padStart(5)}%) ${bar}`);
  }

  // Level distribution
  const levelCounts = {
    'Beginner': templates.filter(t => t.difficultyLevel === 'Beginner').length,
    'Elementary': templates.filter(t => t.difficultyLevel === 'Elementary').length,
    'Intermediate': templates.filter(t => t.difficultyLevel === 'Intermediate').length,
    'Advanced': templates.filter(t => t.difficultyLevel === 'Advanced').length,
    'Expert': templates.filter(t => t.difficultyLevel === 'Expert').length,
  };

  console.log('\n📚 Level Distribution:');
  for (const [level, count] of Object.entries(levelCounts)) {
    const percent = (count / templates.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / templates.length * 50));
    console.log(`  ${level.padEnd(15)} ${count.toString().padStart(3)} (${percent.padStart(5)}%) ${bar}`);
  }

  // Discrimination distribution
  const avgDiscrimination = templates.reduce((sum, t) => sum + t.discrimination_a, 0) / templates.length;
  const minDiscrimination = Math.min(...templates.map(t => t.discrimination_a));
  const maxDiscrimination = Math.max(...templates.map(t => t.discrimination_a));

  console.log('\n⚡ Discrimination Distribution (a parameter):');
  console.log(`  Average: ${avgDiscrimination.toFixed(3)}`);
  console.log(`  Range:   [${minDiscrimination.toFixed(3)}, ${maxDiscrimination.toFixed(3)}]`);
  console.log(`  High quality (a ≥ 1.5):    ${templates.filter(t => t.discrimination_a >= 1.5).length} (${(templates.filter(t => t.discrimination_a >= 1.5).length / templates.length * 100).toFixed(1)}%)`);
  console.log(`  Medium quality (1.0-1.5):  ${templates.filter(t => t.discrimination_a >= 1.0 && t.discrimination_a < 1.5).length} (${(templates.filter(t => t.discrimination_a >= 1.0 && t.discrimination_a < 1.5).length / templates.length * 100).toFixed(1)}%)`);
  console.log(`  Lower quality (< 1.0):     ${templates.filter(t => t.discrimination_a < 1.0).length} (${(templates.filter(t => t.discrimination_a < 1.0).length / templates.length * 100).toFixed(1)}%)`);

  // Guessing distribution
  const avgGuessing = templates.reduce((sum, t) => sum + t.guessing_c, 0) / templates.length;

  console.log('\n🎲 Guessing Distribution (c parameter):');
  console.log(`  Average: ${avgGuessing.toFixed(3)}`);
  console.log(`  4 options (c ≈ 0.20-0.28): ${templates.filter(t => t.guessing_c >= 0.20 && t.guessing_c < 0.30).length}`);
  console.log(`  5 options (c ≈ 0.15-0.23): ${templates.filter(t => t.guessing_c >= 0.15 && t.guessing_c < 0.23).length}`);

  console.log('\n' + '='.repeat(70));
}

/**
 * Save questions to database
 */
async function saveQuestions(
  templates: QuestionTemplate[],
  cellId: string,
  dryRun: boolean = false
): Promise<void> {
  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be saved to database\n');
    return;
  }

  console.log('\n💾 Saving questions to database...\n');

  let created = 0;
  let failed = 0;

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];

    try {
      // Create question
      const question = await prisma.question.create({
        data: {
          text: template.text,
          explanation: template.explanation,
          cellId: cellId,
          difficulty_b: template.difficulty_b,
          discrimination_a: template.discrimination_a,
          guessing_c: template.guessing_c,
          irtModel: '3PL',
          isActive: true,
          responseCount: 0,
        },
      });

      // Create answer options
      for (const option of template.answerOptions) {
        await prisma.answerOption.create({
          data: {
            text: option.text,
            isCorrect: option.isCorrect,
            questionId: question.id,
          },
        });
      }

      created++;

      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${templates.length} questions created...`);
      }
    } catch (error) {
      failed++;
      console.error(`  ❌ Failed to create question ${i + 1}: ${error}`);
    }
  }

  console.log(`\n✅ Successfully created ${created} questions`);
  if (failed > 0) {
    console.log(`⚠️  Failed to create ${failed} questions`);
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const targetCount = parseInt(args[0]) || 500;
  const dryRun = args[1] === 'dry-run' || args[1] === 'true';

  console.log('🚀 Question Pool Expansion\n');
  console.log(`Configuration:`);
  console.log(`  - Target questions: ${targetCount}`);
  console.log(`  - Distribution: Gaussian N(0, 1.2)`);
  console.log(`  - Difficulty range: [-3, +3]`);
  console.log(`  - Discrimination: [0.8, 2.0] (quality-weighted)`);
  console.log(`  - Dry run: ${dryRun ? 'Yes' : 'No'}\n`);

  // Get existing question count
  const existingCount = await prisma.question.count({
    where: { isActive: true },
  });

  console.log(`📊 Current question pool: ${existingCount} questions`);

  if (!dryRun && existingCount > 0) {
    console.log(`\n⚠️  WARNING: This will add ${targetCount} new questions to the existing ${existingCount}.`);
    console.log(`   Total after expansion: ${existingCount + targetCount} questions\n`);
  }

  // Get a cell to assign questions to
  const cells = await prisma.cell.findMany({ take: 1 });

  if (cells.length === 0) {
    console.error('❌ No cells found in database. Please create a cell first.');
    process.exit(1);
  }

  const cellId = cells[0].id;
  console.log(`✅ Using cell: ${cells[0].name || cellId}\n`);

  // Generate questions
  console.log('🎲 Generating questions with Gaussian distribution...');
  const templates = generateQuestionTemplates(targetCount);
  console.log(`✅ Generated ${templates.length} question templates\n`);

  // Analyze distribution
  analyzeDistribution(templates);

  // Save to database
  await saveQuestions(templates, cellId, dryRun);

  console.log('\n✅ Question pool expansion complete!\n');

  if (!dryRun) {
    const newCount = await prisma.question.count({
      where: { isActive: true },
    });
    console.log(`📊 New question pool size: ${newCount} questions\n`);
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { generateQuestionTemplates, generateGaussianDifficulty, analyzeDistribution };
