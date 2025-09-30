import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

// ... (interface definitions for OptionSeed, QuestionSeed, CellData remain the same) ...
interface OptionSeed {
  text: string;
  isCorrect: boolean;
}
interface QuestionSeed {
  text: string;
  difficulty: number;
  explanation: string;
  options: OptionSeed[];
}
interface CellData {
  cellName: string;
  questions: QuestionSeed[];
}

async function main() {
  console.log('--- Start Seeding ---');

  // 1. Clean the database
  await prisma.userAnswer.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.answerOption.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.userCellMastery.deleteMany({});
  await prisma.cell.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Database Cleared');

  // 2. Create a test user
  const hashedPassword = await hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'test@test.com',
      name: 'Test User',
      password: hashedPassword,
    },
  });
  console.log(`✅ Created Test User: ${user.email}`);

  // 3. Seed Cells and Questions
  const seedDataPath = resolve(__dirname, 'seed-data.json');
  const seedData: CellData[] = JSON.parse(readFileSync(seedDataPath, 'utf-8'));

  for (const cellDatum of seedData) {
    const createdCell = await prisma.cell.create({
      data: {
        name: cellDatum.cellName,
        difficulty_b: 0.0,
        discrimination_a: 1.0,
      },
    });

    // Create UserCellMastery record for our test user for this cell
    await prisma.userCellMastery.create({
        data: {
            userId: user.id,
            cellId: createdCell.id,
        }
    });

    for (const q of cellDatum.questions) {
      await prisma.question.create({
        data: {
          text: q.text,
          cellId: createdCell.id,
          difficulty_b: q.difficulty,
          discrimination_a: 1.0,
          explanation: q.explanation,
          answerOptions: {
            create: q.options.map(option => ({
              text: option.text,
              isCorrect: option.isCorrect,
            })),
          },
        },
      });
    }
  }
  console.log(`✅ Seeded Cells, Questions, and UserCellMastery records.`);
  
  // 4. THIS IS THE MISSING STEP: Create a sample Quiz
  const sampleQuiz = await prisma.quiz.create({
    data: {
      userId: user.id,
      status: 'completed', // Mark this sample quiz as completed
    }
  });
  console.log(`✅ Created Sample Quiz with ID: ${sampleQuiz.id}`);


  console.log('--- Seeding Finished ---');
}

main()
  .catch((e) => {
    console.error('--- SEEDING FAILED ---');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });