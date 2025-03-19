"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { tasksToExcel } from "@/lib/excel-utils"
import type { Task } from "@/types"
import { Download, FileSpreadsheet, FileText, History, Upload } from 'lucide-react'
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
        description: "There was an error exporting tasks to Excel",
        variant: "destructive",
      })
    }
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("projectId", projectId)
      formData.append("userId", userId)

      console.log("Sending import request for file:", file.name)

      const response = await fetch("/api/import-tasks", {
        method: "POST",
        body: formData,
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error("Import API error:", responseData)
        throw new Error(responseData.error || "Import failed")
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
      toast({
        title: "Import failed",
        description: `There was an error importing tasks: ${(error as Error).message}`,
        variant: "destructive",
      })
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

        <Button
          variant="outline"
          size="sm"
          className="rounded-lg shadow-sm"
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Export Excel</span>
          <span className="sm:hidden">Export</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="rounded-lg shadow-sm"
          onClick={() => setShowHistory(true)}
        >
          <History className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Import History</span>
          <span className="sm:hidden">History</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="rounded-lg shadow-sm"
          onClick={() => setShowTemplate(true)}
        >
          <FileText className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Template</span>
          <span className="sm:hidden">Template</span>
        </Button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
      </div>

      <ImportHistoryDialog
        projectId={projectId}
        open={showHistory}
        onOpenChange={setShowHistory}
      />

      <ExcelTemplateDialog
        open={showTemplate}
        onOpenChange={setShowTemplate}
      />
    </>
  )
}
