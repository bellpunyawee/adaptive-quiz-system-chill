import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

interface QuestionSeed {
  text: string;
  moduleId: string;
  difficulty: number;
  explanation: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
}

async function main() {
  console.log('Start seeding...');

  // Read the JSON file
  const seedDataPath = resolve(__dirname, 'seed-data.json');
  const seedData: QuestionSeed[] = JSON.parse(readFileSync(seedDataPath, 'utf-8'));

  for (const q of seedData) {
    // Create the question and its options in a single transaction
    await prisma.question.create({
      data: {
        text: q.text,
        moduleId: q.moduleId,
        difficulty: q.difficulty,
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

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });