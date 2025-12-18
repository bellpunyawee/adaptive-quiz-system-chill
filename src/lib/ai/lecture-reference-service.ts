/**
 * Lecture Reference Service
 *
 * RAG-Ready service for linking feedback to relevant lecture materials.
 * This is a placeholder implementation designed for future RAG integration.
 *
 * Current Implementation:
 * - Simple database lookup by topic IDs
 * - Returns materials mapped to weak topics
 *
 * Future RAG Enhancement:
 * - Semantic search using vector embeddings
 * - Chunk-level retrieval for specific concepts
 * - Contextual ranking based on error patterns
 */

import { PrismaClient } from '@prisma/client';
import type { ConceptError } from './context-assembler';

const prisma = new PrismaClient();

export interface LectureReference {
  id: string;
  title: string;
  type: 'lecture' | 'reading' | 'video' | 'slides' | 'notes';
  url?: string | null;
  description?: string | null;
  topicName: string;
  topicId: string;
  relevanceScore: number;
}

export interface LectureReferenceService {
  /**
   * Fetch lecture materials by topic IDs (current implementation)
   */
  fetchByTopics(topicIds: string[]): Promise<LectureReference[]>;

  /**
   * Future RAG: Semantic search based on error context
   */
  searchRelevantMaterials(query: string, topicIds: string[]): Promise<LectureReference[]>;

  /**
   * Future RAG: Get specific chunks for feedback context
   */
  getRelevantChunks(materialId: string, conceptError: ConceptError): Promise<string[]>;
}

/**
 * Get lecture references for weak topics
 * Current: Simple lookup by topic
 * Future: Will use vector similarity search when RAG is implemented
 */
export async function getLectureReferences(
  weakTopicIds: string[],
  courseId?: string
): Promise<LectureReference[]> {
  if (weakTopicIds.length === 0) {
    return [];
  }

  try {
    // Query CellMaterialMapping for materials linked to weak topics
    const mappings = await prisma.cellMaterialMapping.findMany({
      where: {
        cellId: { in: weakTopicIds },
        material: courseId ? { courseId } : undefined,
      },
      include: {
        cell: {
          select: {
            id: true,
            name: true,
          },
        },
        material: {
          select: {
            id: true,
            title: true,
            type: true,
            url: true,
            description: true,
          },
        },
      },
      orderBy: {
        relevanceScore: 'desc',
      },
    });

    // Transform to LectureReference format
    const references: LectureReference[] = mappings.map((mapping) => ({
      id: mapping.material.id,
      title: mapping.material.title,
      type: mapping.material.type as LectureReference['type'],
      url: mapping.material.url,
      description: mapping.material.description,
      topicName: mapping.cell.name,
      topicId: mapping.cell.id,
      relevanceScore: mapping.relevanceScore,
    }));

    // Deduplicate by material ID (a material may be linked to multiple topics)
    const uniqueRefs = new Map<string, LectureReference>();
    for (const ref of references) {
      if (!uniqueRefs.has(ref.id) || ref.relevanceScore > uniqueRefs.get(ref.id)!.relevanceScore) {
        uniqueRefs.set(ref.id, ref);
      }
    }

    return Array.from(uniqueRefs.values()).slice(0, 5); // Limit to top 5
  } catch (error) {
    console.error('[LectureReference] Error fetching references:', error);
    return [];
  }
}

/**
 * Format lecture references for feedback prompt
 */
export function formatReferencesForPrompt(references: LectureReference[]): string {
  if (references.length === 0) {
    return 'Study material recommendations will be available when lecture content is indexed.';
  }

  return references
    .map((ref) => `- ${ref.topicName}: "${ref.title}" (${ref.type})${ref.url ? ` - ${ref.url}` : ''}`)
    .join('\n');
}

// ============================================================================
// Future RAG Implementation Notes
// ============================================================================
//
// When implementing full RAG support:
//
// 1. Embedding Pipeline:
//    - Use a vector database (Pinecone, Weaviate, or pgvector)
//    - Chunk lecture materials by section/paragraph
//    - Embed using compatible model (text-embedding-ada-002 or Gemini embeddings)
//
// 2. Indexing:
//    - On material upload: extract text, chunk, embed, store vectors
//    - Update isIndexed, indexedAt, chunkCount, embeddingModel fields
//    - Store chunk IDs in CellMaterialMapping.relevantChunks
//
// 3. Retrieval:
//    - Embed error context (topic name + incorrect question summary)
//    - Vector similarity search against indexed chunks
//    - Rank by relevance score + recency + topic alignment
//
// 4. Context Injection:
//    - Include top-k relevant chunks in feedback prompt
//    - Format as: "Related content from [Material Title]: [chunk excerpt]"
//
// Example future implementation:
//
// async function searchRelevantMaterials(query: string, topicIds: string[]): Promise<LectureReference[]> {
//   const embedding = await embedText(query);
//   const results = await vectorDb.search({
//     vector: embedding,
//     filter: { topicId: { $in: topicIds } },
//     topK: 5,
//   });
//   return results.map(r => ({
//     ...r.metadata,
//     relevanceScore: r.score,
//   }));
// }
