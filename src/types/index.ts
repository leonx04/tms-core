// User related types
export type UserData = {
  id: string
  email: string
  displayName: string
  photoURL?: string
  packageId: string
  packageExpiry: string
  lastActive: string
  subscriptionId?: string
  subscriptionStatus?: string
  billingCycle?: "monthly" | "yearly"
  cancelAtPeriodEnd?: boolean
  lastPayment?: string
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

// Media attachment type for Cloudinary uploads
export type MediaAttachment = {
  publicId: string
  url: string
  resourceType: string
  format: string
  width?: number
  height?: number
  duration?: number
  bytes?: number
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
  gitCommitId?: string | null
  tags?: string[]
  mediaAttachments?: MediaAttachment[] // Added for Cloudinary media attachments
}

// Comment related types
export type Comment = {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt?: string
  mediaAttachments?: any[];
  mediaUrl?: string | null
  attachments?: {
    id: string
    url: string
    type: string
    name: string
    size: number
  }[]
}
// export interface Comment {
//   id: string
//   taskId: string
//   userId: string
//   content: string
//   createdAt: string
//   updatedAt?: string
//   mediaUrl?: string
// }

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
  webhookEnabled?: boolean
  webhookUrl?: string
}

// Webhook configuration type
export type WebhookConfig = {
  id: string
  projectId: string
  webhookUrl: string
  webhookType: string
  webhookSecret?: string
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
  data?: {
    type?: string
    event?: string
    resourceType?: string
    publicId?: string
    url?: string
  }
}

// User type
export type User = {
  id: string
  email: string
  displayName: string
  photoURL?: string
  [key: string]: any
}

// Subscription plan type
export type SubscriptionPlan = {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  popular: boolean
}

// Payment history type
export type PaymentHistory = {
  packageId: string
  billingCycle: "monthly" | "yearly"
  amount: number
  currency: string
  status: string
  timestamp: string
  sessionId?: string
  subscriptionId?: string
  invoiceId?: string
}

// Import history type
export type ImportHistory = {
  id: string
  userId: string
  projectId: string
  fileName: string
  importDate: string
  totalCount: number
  successCount: number
  duplicateCount: number
  errorCount: number
  errors: string[]
}

// Cloudinary upload result type
export type CloudinaryUploadResult = {
  url: string
  publicId: string
  resourceType: string
  format: string
  width?: number
  height?: number
  duration?: number
  bytes?: number
}

// Constants
export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  CLOSED: "closed",
  REOPENED: "reopened",
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
  CLOUDINARY_EVENT: "CLOUDINARY_EVENT",
}

