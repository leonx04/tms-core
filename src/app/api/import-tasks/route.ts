import { type NextRequest, NextResponse } from "next/server"
import { database } from "@/lib/firebase"
import { ref, set, push } from "firebase/database"
import { excelToTasks, saveImportHistory } from "@/lib/excel-utils"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const projectId = formData.get("projectId") as string
    const userId = formData.get("userId") as string

    if (!file || !projectId || !userId) {
      console.error("Missing required fields:", {
        hasFile: !!file,
        hasProjectId: !!projectId,
        hasUserId: !!userId,
      })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      console.error("Invalid file type:", file.name)
      return NextResponse.json(
        { error: "Invalid file type. Only .xlsx and .xls files are supported." },
        { status: 400 },
      )
    }

    console.log("Processing file:", file.name, "for project:", projectId)

    // Parse Excel file
    const { tasks, duplicates, errors } = await excelToTasks(file, projectId)

    console.log("Parsed tasks:", tasks.length, "duplicates:", duplicates.length, "errors:", errors.length)

    // Save valid tasks to database
    let successCount = 0

    for (const task of tasks) {
      try {
        // Generate ID if not provided
        if (!task.id) {
          const tasksRef = ref(database, "tasks")
          const newTaskRef = push(tasksRef)
          task.id = newTaskRef.key as string
          await set(newTaskRef, task)
        } else {
          // Use provided ID
          const taskRef = ref(database, `tasks/${task.id}`)
          await set(taskRef, task)
        }
        successCount++
      } catch (error) {
        console.error("Error saving task:", error)
        errors.push(`Failed to save task: ${task.title}`)
      }
    }

    // Save import history
    const historyId = await saveImportHistory(
      userId,
      projectId,
      file.name,
      tasks.length + duplicates.length + errors.length,
      successCount,
      duplicates.length,
      errors.length,
      errors,
    )

    return NextResponse.json({
      success: true,
      totalTasks: tasks.length + duplicates.length + errors.length,
      importedTasks: successCount,
      duplicateTasks: duplicates.length,
      errors: errors.length,
      historyId,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to import tasks", details: (error as Error).message }, { status: 500 })
  }
}

