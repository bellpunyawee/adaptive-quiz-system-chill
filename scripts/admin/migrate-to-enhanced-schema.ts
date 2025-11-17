// scripts/migrate-to-enhanced-schema.ts
// Run with: npx ts-node scripts/migrate-to-enhanced-schema.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToEnhancedSchema() {
  console.log('Starting migration to enhanced schema...\n');

  try {
    // Step 1: Update existing questions with default values for new fields
    console.log('Step 1: Updating existing questions...');
    const questions = await prisma.question.findMany();
    
    let updatedQuestions = 0;
    for (const question of questions) {
      await prisma.question.update({
        where: { id: question.id },
        data: {
          exposureCount: 0,
          maxExposure: 10,
          isActive: true,
          responseCount: 0,
          lastUsed: null,
          retiredAt: null,
          retirementReason: null,
          correctRate: null,
          lastCalibrated: null
        }
      });
      updatedQuestions++;
    }
    console.log(`✓ Updated ${updatedQuestions} questions\n`);

    // Step 2: Calculate initial response counts and correct rates
    console.log('Step 2: Calculating question statistics...');
    for (const question of questions) {
      const answers = await prisma.userAnswer.findMany({
        where: { questionId: question.id }
      });

      const responseCount = answers.length;
      const correctCount = answers.filter(a => a.isCorrect).length;
      const correctRate = responseCount > 0 ? correctCount / responseCount : null;

      await prisma.question.update({
        where: { id: question.id },
        data: {
          responseCount,
          correctRate
        }
      });
    }
    console.log(`✓ Calculated statistics for ${questions.length} questions\n`);

    // Step 3: Update existing UserCellMastery records with new fields
    console.log('Step 3: Updating user cell mastery records...');
    const masteries = await prisma.userCellMastery.findMany();
    
    let updatedMasteries = 0;
    for (const mastery of masteries) {
      // Get response count for this user-cell combination
      const responses = await prisma.userAnswer.findMany({
        where: {
          userId: mastery.userId,
          question: { cellId: mastery.cellId }
        }
      });

      await prisma.userCellMastery.update({
        where: { id: mastery.id },
        data: {
          sem: null,
          confidence: responses.length > 0 ? Math.min(1, responses.length / 10) : 0,
          lastEstimated: null,
          responseCount: responses.length
        }
      });
      updatedMasteries++;
    }
    console.log(`✓ Updated ${updatedMasteries} mastery records\n`);

    // Step 4: Update existing UserAnswer records with new fields
    console.log('Step 4: Updating user answers...');
    const answers = await prisma.userAnswer.findMany({
      include: {
        user: {
          include: {
            userCellMastery: true
          }
        },
        question: true
      }
    });

    let updatedAnswers = 0;
    for (const answer of answers) {
      // Find the mastery record for this answer's cell
      const mastery = answer.user.userCellMastery.find(
        m => m.cellId === answer.question.cellId
      );

      await prisma.userAnswer.update({
        where: { id: answer.id },
        data: {
          responseTime: null,
          abilityAtTime: mastery?.ability_theta ?? 0
        }
      });
      updatedAnswers++;
    }
    console.log(`✓ Updated ${updatedAnswers} user answers\n`);

    // Step 5: Generate migration summary
    console.log('Migration Summary:');
    console.log('=================');
    console.log(`Questions updated: ${updatedQuestions}`);
    console.log(`Mastery records updated: ${updatedMasteries}`);
    console.log(`User answers updated: ${updatedAnswers}`);
    
    const activeQuestions = await prisma.question.count({ where: { isActive: true } });
    const avgResponseCount = await prisma.question.aggregate({
      _avg: { responseCount: true }
    });
    
    console.log(`\nActive questions: ${activeQuestions}`);
    console.log(`Average responses per question: ${avgResponseCount._avg.responseCount?.toFixed(1) ?? 0}`);
    
    console.log('\n✓ Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateToEnhancedSchema()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });