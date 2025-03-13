import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { TASK_STATUS, TASK_PRIORITY, TASK_TYPE, USER_ROLES, PACKAGE_LIMITS } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function truncateText(text: string, length: number) {
  if (text.length <= length) return text
  return text.slice(0, length) + "..."
}

export function getStatusColor(status: string) {
  switch (status) {
    case TASK_STATUS.TODO:
      return 'bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground"oreground'
    case TASK_STATUS.IN_PROGRESS:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    case TASK_STATUS.RESOLVED:
      return "bg-success/10 text-success dark:bg-success/20 dark:text-success"
    case TASK_STATUS.CLOSED:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    default:
      return "bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground"
  }
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case TASK_PRIORITY.LOW:
      return "bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground"
    case TASK_PRIORITY.MEDIUM:
      return "bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning"
    case TASK_PRIORITY.HIGH:
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    case TASK_PRIORITY.CRITICAL:
      return "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive"
    default:
      return "bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground"
  }
}

export function getTypeColor(type: string) {
  switch (type) {
    case TASK_TYPE.BUG:
      return "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive"
    case TASK_TYPE.FEATURE:
      return "bg-success/10 text-success dark:bg-success/20 dark:text-success"
    case TASK_TYPE.ENHANCEMENT:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    case TASK_TYPE.DOCUMENTATION:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    default:
      return "bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground"
  }
}

export function getRoleColor(role: string) {
  switch (role) {
    case USER_ROLES.ADMIN:
      return "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground"
    case USER_ROLES.DEVELOPER:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    case USER_ROLES.TESTER:
      return "bg-success/10 text-success dark:bg-success/20 dark:text-success"
    case USER_ROLES.DOCUMENT_WRITER:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    default:
      return "bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground"
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case TASK_STATUS.TODO:
      return "To Do"
    case TASK_STATUS.IN_PROGRESS:
      return "In Progress"
    case TASK_STATUS.RESOLVED:
      return "Resolved"
    case TASK_STATUS.CLOSED:
      return "Closed"
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

export function getRoleLabel(role: string) {
  switch (role) {
    case USER_ROLES.ADMIN:
      return "Admin"
    case USER_ROLES.DEVELOPER:
      return "Developer"
    case USER_ROLES.TESTER:
      return "Tester"
    case USER_ROLES.DOCUMENT_WRITER:
      return "Document Writer"
    default:
      return role.charAt(0).toUpperCase() + role.slice(1)
  }
}

export function calculateTimeLeft(date: string | Date) {
  const difference = new Date(date).getTime() - new Date().getTime()

  if (difference <= 0) {
    return "Expired"
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24))
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""}`
  }

  return `${hours} hour${hours > 1 ? "s" : ""}`
}

export { TASK_STATUS, TASK_PRIORITY, TASK_TYPE, USER_ROLES, PACKAGE_LIMITS }

