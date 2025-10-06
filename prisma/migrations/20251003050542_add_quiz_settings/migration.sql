-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "password" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cell" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "difficulty_b" REAL NOT NULL DEFAULT 0,
    "discrimination_a" REAL NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "cellId" TEXT NOT NULL,
    "difficulty_b" REAL NOT NULL DEFAULT 0,
    "discrimination_a" REAL NOT NULL DEFAULT 1,
    "exposureCount" INTEGER NOT NULL DEFAULT 0,
    "maxExposure" INTEGER NOT NULL DEFAULT 10,
    "lastUsed" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retiredAt" DATETIME,
    "retirementReason" TEXT,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "correctRate" REAL,
    "lastCalibrated" DATETIME,
    CONSTRAINT "Question_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "questionId" TEXT NOT NULL,
    CONSTRAINT "AnswerOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in-progress',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "explorationParam" REAL DEFAULT 0.5,
    "timerMinutes" INTEGER DEFAULT 30,
    "maxQuestions" INTEGER DEFAULT 10,
    "selectedCells" TEXT,
    "topicSelection" TEXT DEFAULT 'system',
    CONSTRAINT "Quiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserCellMastery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "ability_theta" REAL NOT NULL DEFAULT 0,
    "selection_count" INTEGER NOT NULL DEFAULT 0,
    "mastery_status" INTEGER NOT NULL DEFAULT 0,
    "sem" REAL,
    "confidence" REAL,
    "lastEstimated" DATETIME,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCellMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCellMastery_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "responseTime" INTEGER,
    "abilityAtTime" REAL,
    CONSTRAINT "UserAnswer_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EngineLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EngineLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EngineLog_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IRTParameterHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "difficulty_b" REAL NOT NULL,
    "discrimination_a" REAL NOT NULL,
    "reason" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AbilityHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "ability_theta" REAL NOT NULL,
    "confidence" REAL,
    "quizId" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbilityHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AbilityHistory_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Question_cellId_isActive_idx" ON "Question"("cellId", "isActive");

-- CreateIndex
CREATE INDEX "Question_exposureCount_idx" ON "Question"("exposureCount");

-- CreateIndex
CREATE INDEX "Question_lastUsed_idx" ON "Question"("lastUsed");

-- CreateIndex
CREATE UNIQUE INDEX "UserCellMastery_userId_cellId_key" ON "UserCellMastery"("userId", "cellId");

-- CreateIndex
CREATE INDEX "EngineLog_userId_quizId_idx" ON "EngineLog"("userId", "quizId");

-- CreateIndex
CREATE INDEX "EngineLog_eventType_idx" ON "EngineLog"("eventType");

-- CreateIndex
CREATE INDEX "EngineLog_createdAt_idx" ON "EngineLog"("createdAt");

-- CreateIndex
CREATE INDEX "IRTParameterHistory_entityType_entityId_idx" ON "IRTParameterHistory"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "IRTParameterHistory_updatedAt_idx" ON "IRTParameterHistory"("updatedAt");

-- CreateIndex
CREATE INDEX "AbilityHistory_userId_cellId_idx" ON "AbilityHistory"("userId", "cellId");

-- CreateIndex
CREATE INDEX "AbilityHistory_updatedAt_idx" ON "AbilityHistory"("updatedAt");
