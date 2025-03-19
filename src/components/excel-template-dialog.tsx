"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import * as XLSX from "xlsx"
import { TASK_STATUS, TASK_PRIORITY, TASK_TYPE } from "@/types"

interface ExcelTemplateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ExcelTemplateDialog({ open, onOpenChange }: ExcelTemplateDialogProps) {
    const downloadTemplate = () => {
        // Create sample data
        const sampleData = [
            {
                id: "", // Leave empty for new tasks
                title: "Sample Task 1",
                description: "This is a sample task description",
                type: TASK_TYPE.BUG,
                status: TASK_STATUS.TODO,
                priority: TASK_PRIORITY.MEDIUM,
                assignedTo: "", // Comma-separated user IDs
                createdBy: "", // Will be filled by the system
                createdAt: "", // Will be filled by the system
                updatedAt: "", // Will be filled by the system
                dueDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
                percentDone: 0,
                estimatedTime: 8, // In hours
                parentTaskId: "", // ID of parent task if this is a subtask
                tags: "bug,frontend,ui", // Comma-separated tags
            },
            {
                id: "",
                title: "Sample Task 2",
                description: "Another sample task description",
                type: TASK_TYPE.FEATURE,
                status: TASK_STATUS.IN_PROGRESS,
                priority: TASK_PRIORITY.HIGH,
                assignedTo: "",
                createdBy: "",
                createdAt: "",
                updatedAt: "",
                dueDate: "",
                percentDone: 50,
                estimatedTime: 16,
                parentTaskId: "",
                tags: "feature,backend",
            },
        ]

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(sampleData)

        // Add column descriptions as a comment in cell A1
        const columnDescriptions = [
            "id: Leave empty for new tasks, or provide an ID to update existing tasks",
            "title: Task title (required)",
            "description: Detailed description of the task",
            "type: Task type (required) - bug, feature, enhancement, documentation",
            "status: Task status (required) - todo, in_progress, resolved, closed",
            "priority: Task priority (required) - low, medium, high, critical",
            "assignedTo: Comma-separated list of user IDs",
            "createdBy: User ID of creator (will be filled automatically if empty)",
            "createdAt: Creation timestamp (will be filled automatically if empty)",
            "updatedAt: Last update timestamp (will be filled automatically if empty)",
            "dueDate: Due date in YYYY-MM-DD format",
            "percentDone: Completion percentage (0-100)",
            "estimatedTime: Estimated hours to complete",
            "parentTaskId: ID of parent task if this is a subtask",
            "tags: Comma-separated list of tags",
        ].join("\n")

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

        // Add a new sheet with instructions
        const instructionsData = [
            { field: "Field", description: "Description", required: "Required", values: "Allowed Values" },
            { field: "id", description: "Task ID", required: "No", values: "Leave empty for new tasks" },
            { field: "title", description: "Task title", required: "Yes", values: "Any text" },
            { field: "description", description: "Task description", required: "No", values: "Any text" },
            { field: "type", description: "Task type", required: "Yes", values: "bug, feature, enhancement, documentation" },
            { field: "status", description: "Task status", required: "Yes", values: "todo, in_progress, resolved, closed" },
            { field: "priority", description: "Task priority", required: "Yes", values: "low, medium, high, critical" },
            { field: "assignedTo", description: "Assigned users", required: "No", values: "Comma-separated user IDs" },
            { field: "dueDate", description: "Due date", required: "No", values: "YYYY-MM-DD format" },
            { field: "percentDone", description: "Completion %", required: "No", values: "0-100" },
            { field: "tags", description: "Tags", required: "No", values: "Comma-separated tags" },
        ]
        const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData)
        instructionsSheet["!cols"] = [
            { wch: 15 }, // field
            { wch: 30 }, // description
            { wch: 10 }, // required
            { wch: 40 }, // values
        ]
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions")

        // Generate Excel file
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
        const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

        // Download file
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "task-import-template.xlsx"
        document.body.appendChild(a)
        a.click()
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Excel Import Template</DialogTitle>
                    <DialogDescription>
                        Download a template Excel file to see the expected format for importing tasks
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <p className="text-sm">The template includes:</p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                        <li>Sample data to show the expected format</li>
                        <li>Instructions sheet with field descriptions</li>
                        <li>Required fields: title, type, status, priority</li>
                        <li>Leave the ID field empty to create new tasks</li>
                    </ul>

                    <Button onClick={downloadTemplate} className="w-full">
                        <FileDown className="mr-2 h-4 w-4" />
                        Download Template
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

