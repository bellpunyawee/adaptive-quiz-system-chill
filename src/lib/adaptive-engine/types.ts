import { Cell, Question, UserCellMastery } from "@prisma/client";

// A reusable type for the core IRT parameters for any item.
export interface IRTParams {
  difficulty_b: number;    // Corresponds to the 'b' parameter
  discrimination_a: number; // Corresponds to the 'a' parameter
}

// Composite types that combine Prisma models with our IRT parameters.
// This is useful for functions that operate on items with these properties.
export type QuestionWithIRT = Question & IRTParams;
export type CellWithIRT = Cell & IRTParams;

// Represents the full mastery record for a user on a specific cell.
export type MasteryWithIRT = UserCellMastery & {
  cell: CellWithIRT;
};