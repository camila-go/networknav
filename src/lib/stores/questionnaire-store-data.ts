/**
 * In-memory questionnaire response store (replace with database in production)
 */

export interface StoredQuestionnaireResponse {
  userId: string;
  responses: Record<string, unknown>;
  completionPercentage: number;
  completedAt?: Date;
  lastUpdated: Date;
}

export const questionnaireResponses = new Map<string, StoredQuestionnaireResponse>();

