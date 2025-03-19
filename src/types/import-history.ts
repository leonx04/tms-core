export type ImportHistory = {
    id: string
    userId: string
    projectId: string
    fileName: string
    importDate: string
    totalCount: number
    successCount: number
    duplicateCount: number
    errorCount: number
    errors: string[]
  }
  
  