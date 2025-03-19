import * as XLSX from "xlsx"
import type { Task } from "@/types"
import { database } from "@/lib/firebase"
import { get, ref, set, push } from "firebase/database"

// Function to convert tasks to Excel format
export const tasksToExcel = (tasks: Task[]): Blob => {
  // Prepare data for Excel
  const worksheet = XLSX.utils.json_to_sheet(
    tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo ? task.assignedTo.join(",") : "",
      createdBy: task.createdBy,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      dueDate: task.dueDate || "",
      percentDone: task.percentDone,
      estimatedTime: task.estimatedTime || "",
      parentTaskId: task.parentTaskId || "",
      tags: task.tags ? task.tags.join(",") : "",
    })),
  )

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // id
    { wch: 30 }, // title
    { wch: 40 }, // description
    { wch: 15 }, // type
    { wch: 15 }, // status
    { wch: 15 }, // priority
    { wch: 30 }, // assignedTo
    { wch: 20 }, // createdBy
    { wch: 20 }, // createdAt
    { wch: 20 }, // updatedAt
    { wch: 15 }, // dueDate
    { wch: 10 }, // percentDone
    { wch: 15 }, // estimatedTime
    { wch: 20 }, // parentTaskId
    { wch: 30 }, // tags
  ]
  worksheet["!cols"] = columnWidths

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks")

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}

// Function to parse Excel file and return tasks
export const excelToTasks = async (
  file: File,
  projectId: string,
): Promise<{
  tasks: Task[]
  duplicates: string[]
  errors: string[]
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const tasks: Task[] = []
    const duplicates: string[] = []
    const errors: string[] = []

    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          throw new Error("Failed to read file")
        }

        const data = new Uint8Array(e.target.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          throw new Error("Excel file contains no sheets")
        }

        const worksheet = workbook.Sheets[firstSheetName]
        if (!worksheet) {
          throw new Error("Could not read worksheet")
        }

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        console.log("Parsed Excel data:", jsonData.length, "rows")

        // Check for existing tasks to avoid duplicates
        const tasksRef = ref(database, "tasks")
        const tasksSnapshot = await get(tasksRef)
        const existingTasks: Record<string, any> = tasksSnapshot.exists() ? tasksSnapshot.val() : {}

        // Process each row
        for (const row of jsonData) {
          const rowData = row as any

          // Validate required fields
          if (!rowData.title || !rowData.type || !rowData.status || !rowData.priority) {
            const errorMsg = `Row with title "${rowData.title || "Unknown"}" is missing required fields`
            console.error(errorMsg, rowData)
            errors.push(errorMsg)
            continue
          }

          // Check for duplicate ID if provided
          if (rowData.id && existingTasks[rowData.id]) {
            duplicates.push(rowData.id)
            continue
          }

          // Create task object
          const task: Task = {
            id: rowData.id || "", // Will be generated if not provided
            projectId: projectId,
            title: rowData.title,
            description: rowData.description || "",
            type: rowData.type,
            status: rowData.status,
            priority: rowData.priority,
            assignedTo: rowData.assignedTo ? String(rowData.assignedTo).split(",") : [],
            createdBy: rowData.createdBy || "",
            createdAt: rowData.createdAt || new Date().toISOString(),
            updatedAt: rowData.updatedAt || new Date().toISOString(),
            dueDate: rowData.dueDate || null,
            percentDone: rowData.percentDone !== undefined ? Number(rowData.percentDone) : 0,
            estimatedTime: rowData.estimatedTime ? Number(rowData.estimatedTime) : null,
            parentTaskId: rowData.parentTaskId || null,
            tags: rowData.tags ? String(rowData.tags).split(",") : [],
          }

          tasks.push(task)
        }

        resolve({ tasks, duplicates, errors })
      } catch (error) {
        console.error("Excel parsing error:", error)
        reject(error)
      }
    }

    reader.onerror = (error) => {
      console.error("FileReader error:", error)
      reject(error)
    }

    reader.readAsArrayBuffer(file)
  })
}

// Function to save import history
export const saveImportHistory = async (
  userId: string,
  projectId: string,
  fileName: string,
  totalCount: number,
  successCount: number,
  duplicateCount: number,
  errorCount: number,
  errors: string[],
) => {
  try {
    const importHistoryRef = ref(database, "importHistory")
    const newImportRef = push(importHistoryRef)

    await set(newImportRef, {
      id: newImportRef.key,
      userId,
      projectId,
      fileName,
      importDate: new Date().toISOString(),
      totalCount,
      successCount,
      duplicateCount,
      errorCount,
      errors,
    })

    return newImportRef.key
  } catch (error) {
    console.error("Error saving import history:", error)
    throw error
  }
}

// Function to get import history for a project
export const getImportHistory = async (projectId: string) => {
  try {
    const importHistoryRef = ref(database, "importHistory")
    const snapshot = await get(importHistoryRef)

    if (!snapshot.exists()) {
      return []
    }

    const allHistory = snapshot.val()
    const projectHistory = Object.values(allHistory).filter((history: any) => history.projectId === projectId)

    return projectHistory.sort((a: any, b: any) => new Date(b.importDate).getTime() - new Date(a.importDate).getTime())
  } catch (error) {
    console.error("Error fetching import history:", error)
    return []
  }
}

