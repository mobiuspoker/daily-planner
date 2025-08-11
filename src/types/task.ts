export type TaskList = "TODAY" | "FUTURE";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  list: TaskList;
  sortIndex: number;
  hasTime: boolean;
  scheduledAt?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskHistory {
  id: string;
  sourceList: TaskList;
  title: string;
  completedAt?: string;
  clearedOn: string;
  createdAt: string;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  list: TaskList;
  scheduledAt?: string;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string;
  list?: TaskList;
  scheduledAt?: string;
  completed?: boolean;
}