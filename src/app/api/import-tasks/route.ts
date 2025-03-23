import { excelToTasks, saveImportHistory, saveTasks } from "@/utils/excel-utils"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("Import API route called")

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const projectId = formData.get("projectId") as string
    const userId = formData.get("userId") as string

    console.log("Received import request:", {
      fileName: file?.name,
      fileSize: file?.size,
      projectId,
      userId,
    })

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
    const { tasks, duplicates, errors: parseErrors } = await excelToTasks(file, projectId)

    console.log("Parsed tasks:", tasks.length, "duplicates:", duplicates.length, "errors:", parseErrors.length)

    if (tasks.length === 0 && parseErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Failed to parse Excel file",
          details: parseErrors.join(", "),
        },
        { status: 400 },
      )
    }

    // Save tasks
    const saveResult = await saveTasks(tasks)
    const successCount = saveResult.success
    const saveErrors = saveResult.errors

    // Combine all errors
    const allErrors = [...parseErrors, ...saveErrors]

    // Save import history
    let historyId
    try {
      historyId = await saveImportHistory(
        userId,
        projectId,
        file.name,
        tasks.length + duplicates.length + parseErrors.length,
        successCount,
        duplicates.length,
        allErrors.length,
        allErrors,
      )
      console.log("Import history saved with ID:", historyId)
    } catch (historyError) {
      console.error("Error saving import history:", historyError)
      // Continue even if history saving fails
    }

    console.log("Import completed successfully:", {
      totalTasks: tasks.length + duplicates.length + allErrors.length,
      importedTasks: successCount,
      duplicateTasks: duplicates.length,
      errors: allErrors.length,
    })

    return NextResponse.json({
      success: true,
      totalTasks: tasks.length + duplicates.length + allErrors.length,
      importedTasks: successCount,
      duplicateTasks: duplicates.length,
      errors: allErrors.length,
      historyId,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      {
        error: "Failed to import tasks",
        details: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 },
    )
  }
}

