// User related types
export type UserData = {
  id: string
  email: string
  displayName: string
  photoURL?: string
  packageId: string
  packageExpiry: string
  lastActive: string
  preferences: {
    darkMode?: boolean
    emailNotifications: boolean
    inAppNotifications: boolean
  }
}

// Project related types
export type Project = {
  id: string
  name: string
  description: string
  createdAt: string
  createdBy: string
  ownerId: string
  githubRepo?: string
  members: Record<
    string,
    {
      roles: string[]
      addedAt: string
      addedBy: string
    }
  >
}

// Task related types
export type Task = {
  id: string
  projectId: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  assignedTo: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  dueDate?: string | null
  percentDone: number
  estimatedTime?: number | null
  parentTaskId?: string | null
  gitCommitId?: string
  tags?: string[]
}

// Comment related types
export type Comment = {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt?: string
  attachments?: {
    id: string
    url: string
    type: string
    name: string
    size: number
  }[]
}

// Task history related types
export type TaskHistory = {
  id: string
  taskId: string
  userId: string
  timestamp: string
  changes: {
    field: string
    oldValue: any
    newValue: any
  }[]
  comment?: string
}

// Cloudinary configuration type
export type CloudinaryConfig = {
  id: string
  projectId: string
  cloudName: string
  apiKey: string
  apiSecret: string
  folderName: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

// Webhook configuration type
export type WebhookConfig = {
  id: string
  projectId: string
  webhookUrl: string
  webhookType: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

// Notification type
export type Notification = {
  id: string
  userId: string
  eventType: string
  referenceId: string
  message: string
  status: string
  createdAt: string
  readAt?: string
}

// User type
export type User = {
  id: string
  email: string
  displayName: string
  photoURL?: string
  [key: string]: any
}

// Constants
export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  CLOSED: "closed",
}

export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
}

export const TASK_TYPE = {
  BUG: "bug",
  FEATURE: "feature",
  ENHANCEMENT: "enhancement",
  DOCUMENTATION: "documentation",
}

export const USER_ROLES = {
  ADMIN: "admin",
  DEVELOPER: "dev",
  TESTER: "tester",
  DOCUMENT_WRITER: "documentWriter",
}

export const PACKAGE_LIMITS = {
  basic: 3,
  plus: 10,
  premium: Number.POSITIVE_INFINITY,
}

export const NOTIFICATION_TYPES = {
  CREATE_TASK: "CREATE_TASK",
  UPDATE_TASK: "UPDATE_TASK",
  ADD_COMMENT: "ADD_COMMENT",
  INVITE_MEMBER: "INVITE_MEMBER",
  REMOVE_MEMBER: "REMOVE_MEMBER",
  UPDATE_ROLE: "UPDATE_ROLE",
  WEBHOOK_EVENT: "WEBHOOK_EVENT",
}

