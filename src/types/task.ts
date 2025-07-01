export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RoutineType = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: number;
  parentId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  due_date?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  completedAt?: string | null;
  completed_at?: string | null;
  position: number;
  expanded: boolean;
  children?: Task[];
  tags?: Tag[];
  attachments?: Attachment[];
  comments?: Comment[];
  // Routine task fields
  isRoutine?: boolean;
  is_routine?: boolean;
  routineType?: RoutineType | null;
  routine_type?: RoutineType | null;
  lastGeneratedAt?: string | null;
  last_generated_at?: string | null;
  routineParentId?: number | null;
  routine_parent_id?: number | null;
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
  dueDate?: string | null;
  position?: number;
  expanded?: boolean;
  isRoutine?: boolean;
  routineType?: RoutineType | null;
  routineParentId?: number | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  parentId?: number | null;
  position?: number;
  expanded?: boolean;
  isRoutine?: boolean;
  routineType?: RoutineType | null;
}

export interface TaskTag {
  taskId: number;
  tagId: number;
}