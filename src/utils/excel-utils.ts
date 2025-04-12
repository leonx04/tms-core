import { database } from "@/config/firebase"
import { mockDatabase } from "@/config/mock-database"
import type { Task } from "@/types"
import { get, push, query, ref, set, orderByChild, equalTo } from "firebase/database"
import * as XLSX from "xlsx"

// Flag to track if we're using the mock database
let usingMockDatabase = false

// Function to check database connection
const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const testRef = ref(database, "connectionTest")
    await set(testRef, { timestamp: new Date().toISOString() })
    return true
  } catch (error) {
    console.error("Database connection error:", error)
    usingMockDatabase = true
    return false
  }
}

// Function to convert tasks to Excel format
export const tasksToExcel = (tasks: Task[]): Blob => {
  try {
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
  } catch (error) {
    console.error("Error generating Excel file:", error)
    throw new Error(`Failed to generate Excel file: ${(error as Error).message}`)
  }
}

// Function to parse Excel file and return tasks
import * as fs from "fs/promises";

export const excelToTasks = async (
  file: File,
  projectId: string
): Promise<{
  tasks: Task[];
  duplicates: string[];
  errors: string[];
}> => {
  const tasks: Task[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  try {
    // Read file as buffer
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Check if file is empty
    if (data.length === 0) {
      throw new Error("File is empty");
    }

    let workbook;
    try {
      workbook = XLSX.read(data, { type: "array" });
    } catch (xlsxError) {
      console.error("XLSX parsing error:", xlsxError);
      throw new Error(`Failed to parse Excel file: ${(xlsxError as Error).message}`);
    }

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("Excel file contains no sheets");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new Error("Could not read worksheet");
    }

    // Convert to JSON
    let jsonData;
    try {
      jsonData = XLSX.utils.sheet_to_json(worksheet);
      console.log("Parsed Excel data:", jsonData.length, "rows");
    } catch (jsonError) {
      console.error("JSON conversion error:", jsonError);
      throw new Error(`Failed to convert Excel to JSON: ${(jsonError as Error).message}`);
    }

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error("No data found in Excel file or invalid format");
    }

    // Fetch existing tasks for the project
    let existingTasks: Record<string, any> = {};

    try {
      const dbConnected = await checkDatabaseConnection();

      if (dbConnected) {
        const tasksRef = ref(database, "tasks");
        const tasksQuery = query(tasksRef, orderByChild("projectId"), equalTo(projectId));
        const tasksSnapshot = await get(tasksQuery);
        existingTasks = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
      } else {
        const mockTasks = await mockDatabase.getTasks(projectId);
        mockTasks.forEach((task) => {
          if (task.id) {
            existingTasks[task.id] = task;
          }
        });
      }
    } catch (dbError) {
      console.error("Database error when fetching existing tasks:", dbError);
      errors.push(`Warning: Could not check for duplicates: ${(dbError as Error).message}`);
    }

    // Process each row
    for (const row of jsonData) {
      const rowData = row as any;

      // Validate required fields
      if (!rowData.title) {
        errors.push(`Row is missing required field: title`);
        continue;
      }

      if (!rowData.type) {
        errors.push(`Row with title \"${rowData.title}\" is missing required field: type`);
        continue;
      }

      if (!rowData.status) {
        errors.push(`Row with title \"${rowData.title}\" is missing required field: status`);
        continue;
      }

      if (!rowData.priority) {
        errors.push(`Row with title \"${rowData.title}\" is missing required field: priority`);
        continue;
      }

      // Check for duplicate ID if provided
      if (rowData.id && existingTasks[rowData.id]) {
        // Check if the task is marked as deleted
        if (existingTasks[rowData.id].deleted) {
          console.log(`Task with ID ${rowData.id} is marked as deleted. Creating a new task with the same data.`);
          rowData.id = ""; // Clear the ID to create a new task
        } else {
          duplicates.push(rowData.id);
          continue;
        }
      }
      // Ensure a new ID is generated for tasks without an ID
      if (!rowData.id) {
        rowData.id = ""; // Force the system to generate a new ID
      }

      // Create task object
      try {
        const task: Task = {
          id: rowData.id || "", // Will be generated if not provided
          projectId: projectId,
          title: String(rowData.title),
          description: rowData.description ? String(rowData.description) : "",
          type: String(rowData.type),
          status: String(rowData.status),
          priority: String(rowData.priority),
          assignedTo: rowData.assignedTo ? String(rowData.assignedTo).split(",") : [],
          createdBy: rowData.createdBy ? String(rowData.createdBy) : "",
          createdAt: rowData.createdAt ? String(rowData.createdAt) : new Date().toISOString(),
          updatedAt: rowData.updatedAt ? String(rowData.updatedAt) : new Date().toISOString(),
          dueDate: rowData.dueDate ? String(rowData.dueDate) : null,
          percentDone: rowData.percentDone !== undefined ? Number(rowData.percentDone) : 0,
          estimatedTime: rowData.estimatedTime ? Number(rowData.estimatedTime) : null,
          parentTaskId: rowData.parentTaskId ? String(rowData.parentTaskId) : null,
          tags: rowData.tags ? String(rowData.tags).split(",") : [],
        };

        tasks.push(task);
      } catch (taskError) {
        errors.push(`Error creating task from row with title \"${rowData.title}\": ${(taskError as Error).message}`);
      }
    }

    return { tasks, duplicates, errors };
  } catch (error) {
    console.error("Excel parsing error:", error);
    throw error;
  }
};

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
    // Check if we can use Firebase
    const dbConnected = await checkDatabaseConnection()

    if (dbConnected) {
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
    } else {
      // Use mock database
      return await mockDatabase.saveImportHistory({
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
    }
  } catch (error) {
    console.error("Error saving import history:", error)
    throw new Error(`Failed to save import history: ${(error as Error).message}`)
  }
}

// Function to get import history for a project
export const getImportHistory = async (projectId: string) => {
  try {
    // Check if we can use Firebase
    const dbConnected = await checkDatabaseConnection()

    if (dbConnected) {
      const importHistoryRef = ref(database, "importHistory")
      const snapshot = await get(importHistoryRef)

      if (!snapshot.exists()) {
        return []
      }

      const allHistory = snapshot.val()
      const projectHistory = Object.values(allHistory).filter((history: any) => history.projectId === projectId)

      return projectHistory.sort(
        (a: any, b: any) => new Date(b.importDate).getTime() - new Date(a.importDate).getTime(),
      )
    } else {
      // Use mock database
      return await mockDatabase.getImportHistory(projectId)
    }
  } catch (error) {
    console.error("Error fetching import history:", error)
    return []
  }
}

// Function to save tasks
export const saveTasks = async (tasks: Task[]) => {
  const results = {
    success: 0,
    errors: [] as string[],
  }

  try {
    // Check if we can use Firebase
    const dbConnected = await checkDatabaseConnection()

    for (const task of tasks) {
      try {
        if (dbConnected) {
          // Use Firebase
          if (!task.id) {
            const tasksRef = ref(database, "tasks")
            const newTaskRef = push(tasksRef)
            task.id = newTaskRef.key as string
            await set(newTaskRef, task)
          } else {
            const taskRef = ref(database, `tasks/${task.id}`)
            await set(taskRef, task)
          }
        } else {
          // Use mock database
          await mockDatabase.saveTask(task)
        }
        results.success++
      } catch (error) {
        console.error("Error saving task:", error)
        results.errors.push(`Failed to save task: ${task.title} - ${(error as Error).message}`)
      }
    }

    return results
  } catch (error) {
    console.error("Error in saveTasks:", error)
    throw new Error(`Failed to save tasks: ${(error as Error).message}`)
  }
}

