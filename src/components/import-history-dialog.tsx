"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { getImportHistory } from "@/lib/excel-utils"
import { formatDate } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useAuth } from "@/contexts/auth-context"
import { useMediaQuery } from "@/hooks/use-media-query"

interface ImportHistoryDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportHistoryDialog({ projectId, open, onOpenChange }: ImportHistoryDialogProps) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const isMobile = useMediaQuery("(max-width: 640px)")

  useEffect(() => {
    if (open && projectId) {
      loadHistory()
    }
  }, [open, projectId])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const historyData = await getImportHistory(projectId)
      setHistory(historyData)
    } catch (error) {
      console.error("Error loading import history:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import History</DialogTitle>
          <DialogDescription>View the history of Excel imports for this project</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No import history found for this project</div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-background">
                  <tr className="bg-muted/50">
                    <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">File</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Total</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Success</th>
                    {!isMobile && (
                      <>
                        <th className="px-4 py-2 text-left text-sm font-medium">Duplicates</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Errors</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-sm">{formatDate(item.importDate)}</td>
                      <td className="px-4 py-2 text-sm truncate max-w-[120px]">{item.fileName}</td>
                      <td className="px-4 py-2 text-sm">{item.totalCount}</td>
                      <td className="px-4 py-2 text-sm text-green-600">{item.successCount}</td>
                      {!isMobile && (
                        <>
                          <td className="px-4 py-2 text-sm text-amber-600">{item.duplicateCount}</td>
                          <td className="px-4 py-2 text-sm text-red-600">{item.errorCount}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

