/**
 * In-memory user store (replace with database in production)
 */

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  position: string;
  title: string;
  company?: string;
  photoUrl?: string;
  location?: string;
  questionnaireCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const users = new Map<string, StoredUser>();

