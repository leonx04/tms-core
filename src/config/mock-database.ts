import type { Task, ImportHistory } from "@/types"

// In-memory storage
const storage: {
  tasks: Record<string, Task>
  importHistory: Record<string, ImportHistory>
} = {
  tasks: {},
  importHistory: {},
}

// Generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 15)

// Mock database functions
export const mockDatabase = {
  // Tasks
  getTasks: async (projectId: string) => {
    return Object.values(storage.tasks).filter((task) => task.projectId === projectId)
  },

  saveTask: async (task: Task) => {
    const id = task.id || generateId()
    storage.tasks[id] = { ...task, id }
    return id
  },

  // Import history
  getImportHistory: async (projectId: string) => {
    return Object.values(storage.importHistory)
      .filter((history) => history.projectId === projectId)
      .sort((a, b) => new Date(b.importDate).getTime() - new Date(a.importDate).getTime())
  },

  saveImportHistory: async (history: Omit<ImportHistory, "id">) => {
    const id = generateId()
    storage.importHistory[id] = { ...history, id }
    return id
  },
}

