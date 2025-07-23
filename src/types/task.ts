export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RoutineType = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: number;
  parentId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  position: number;
  expanded: boolean;
  children?: Task[];
  tags?: Tag[];
  tagIds?: number[];
  attachments?: Attachment[];
  comments?: Comment[];
  // Routine task fields
  isRoutine?: boolean;
  routineType?: RoutineType | null;
  lastGeneratedAt?: string | null;
  routineParentId?: number | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  textColor?: string;
  createdAt: Date;
}

export interface Attachment {
  id: number;
  taskId: number;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: Date;
}

export interface Comment {
  id: number;
  taskId: number;
  content: string;
  createdAt: Date;
}

export interface CreateTaskInput {
  parentId?: number | null;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  position?: number;
  expanded?: boolean;
  isRoutine?: boolean;
  routineType?: RoutineType | null;
  routineParentId?: number | null;
  tagIds?: number[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  parentId?: number | null;
  position?: number;
  expanded?: boolean;
  isRoutine?: boolean;
  routineType?: RoutineType | null;
  tagIds?: number[];
}

export interface TaskTag {
  taskId: number;
  tagId: number;
}