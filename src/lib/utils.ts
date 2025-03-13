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
      return "status-todo"
    case TASK_STATUS.IN_PROGRESS:
      return "status-in-progress"
    case TASK_STATUS.RESOLVED:
      return "status-resolved"
    case TASK_STATUS.CLOSED:
      return "status-closed"
    default:
      return "status-todo"
  }
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case TASK_PRIORITY.LOW:
      return "priority-low"
    case TASK_PRIORITY.MEDIUM:
      return "priority-medium"
    case TASK_PRIORITY.HIGH:
      return "priority-high"
    case TASK_PRIORITY.CRITICAL:
      return "priority-critical"
    default:
      return "priority-low"
  }
}

export function getTypeColor(type: string) {
  switch (type) {
    case TASK_TYPE.BUG:
      return "type-bug"
    case TASK_TYPE.FEATURE:
      return "type-feature"
    case TASK_TYPE.ENHANCEMENT:
      return "type-enhancement"
    case TASK_TYPE.DOCUMENTATION:
      return "type-documentation"
    default:
      return "type-feature"
  }
}

export function getRoleColor(role: string) {
  switch (role) {
    case USER_ROLES.ADMIN:
      return "role-admin"
    case USER_ROLES.DEVELOPER:
      return "role-dev"
    case USER_ROLES.TESTER:
      return "role-tester"
    case USER_ROLES.DOCUMENT_WRITER:
      return "role-documentWriter"
    default:
      return "role-dev"
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

