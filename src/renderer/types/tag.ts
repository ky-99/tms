/**
 * Tag-related type definitions
 */

export interface Tag {
  id: number;
  name: string;
  color: string;
  textColor?: string;
  createdAt?: Date;
  // Legacy support
  text_color?: string;
}

export interface CreateTagPayload {
  name: string;
  color: string;
  textColor?: string;
}

export interface UpdateTagPayload extends Partial<CreateTagPayload> {
  id: number;
}

export interface TagFilter {
  tagIds: number[];
  isActive: boolean;
}