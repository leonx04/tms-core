"use client"

import type React from "react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { Task } from "@/types"
import { tasksToExcel } from "@/utils/excel-utils"
import { AlertCircle, Download, FileSpreadsheet, FileText, History, Info, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { ExcelTemplateDialog } from "./excel-template-dialog"
import { ImportHistoryDialog } from "./import-history-dialog"

interface ImportExportToolbarProps {
  projectId: string
  tasks: Task[]
  userId: string
  onImportComplete: () => void
}

export function ImportExportToolbar({ projectId, tasks, userId, onImportComplete }: ImportExportToolbarProps) {
  const [importing, setImporting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [showOfflineWarning, setShowOfflineWarning] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = () => {
    try {
      if (tasks.length === 0) {
        toast({
          title: "No tasks to export",
          description: "There are no tasks available to export",
          variant: "destructive",
        })
        return
      }

      const blob = tasksToExcel(tasks)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `project-${projectId}-tasks.xlsx`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Export successful",
        description: `Exported ${tasks.length} tasks to Excel`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export failed",
        description: `There was an error exporting tasks: ${(error as Error).message}`,
        variant: "destructive",
      })
    }
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "" // Clear previous selection
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportError(null)

    try {
      // Validate file type
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        throw new Error("Invalid file type. Only .xlsx and .xls files are supported.")
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File is too large. Maximum size is 10MB.")
      }

      const formData = new FormData()
      formData.append("file", file)
      formData.append("projectId", projectId)
      formData.append("userId", userId)

      console.log("Sending import request for file:", file.name, "size:", file.size)

      const response = await fetch("/api/import-tasks", {
        method: "POST",
        body: formData,
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error("Import API error:", responseData)

        // Check for database connection error
        if (
          responseData.error === "Database connection error" ||
          (responseData.details && responseData.details.includes("database"))
        ) {
          setShowOfflineWarning(true)
          throw new Error("Database connection error. Using offline mode.")
        }

        throw new Error(responseData.error || responseData.details || "Import failed")
      }

      console.log("Import response:", responseData)

      toast({
        title: "Import completed",
        description: `Imported ${responseData.importedTasks} tasks. ${responseData.duplicateTasks} duplicates skipped. ${responseData.errors} errors.`,
      })

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Refresh tasks list
      onImportComplete()
    } catch (error) {
      console.error("Import error:", error)
      const errorMessage = (error as Error).message || "Unknown error occurred"

      // Don't show error dialog for offline mode warning
      if (!errorMessage.includes("Using offline mode")) {
        setImportError(errorMessage)
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg shadow-sm"
          onClick={handleImportClick}
          disabled={importing}
        >
          {importing ? (
            <>
              <FileSpreadsheet className="h-4 w-4 mr-2 animate-pulse" />
              <span className="hidden sm:inline">Importing...</span>
              <span className="sm:hidden">Import...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Import Excel</span>
              <span className="sm:hidden">Import</span>
            </>
          )}
        </Button>

        <Button variant="outline" size="sm" className="rounded-lg shadow-sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Export Excel</span>
          <span className="sm:hidden">Export</span>
        </Button>

        <Button variant="outline" size="sm" className="rounded-lg shadow-sm" onClick={() => setShowHistory(true)}>
          <History className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Import History</span>
          <span className="sm:hidden">History</span>
        </Button>

        <Button variant="outline" size="sm" className="rounded-lg shadow-sm" onClick={() => setShowTemplate(true)}>
          <FileText className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Template</span>
          <span className="sm:hidden">Template</span>
        </Button>

        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
      </div>

      <ImportHistoryDialog projectId={projectId} open={showHistory} onOpenChange={setShowHistory} />

      <ExcelTemplateDialog open={showTemplate} onOpenChange={setShowTemplate} />

      <AlertDialog open={!!importError} onOpenChange={() => setImportError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Import Failed
            </AlertDialogTitle>
            <AlertDialogDescription className="text-destructive-foreground">{importError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setImportError(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showOfflineWarning} onOpenChange={setShowOfflineWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-500" />
              Offline Mode
            </AlertDialogTitle>
            <AlertDialogDescription>
              The application is currently running in offline mode due to a database connection issue. Your data will be
              stored locally and will not be synchronized with the server until the connection is restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowOfflineWarning(false)}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

