"use client"

import type * as React from "react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ExternalLink, AlertCircle, GitCommit, GitMerge, GitBranch, FileCode, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Add this CSS class for hiding scrollbars while maintaining functionality
const noScrollbarClass = "scrollbar-hide"

// Cache for commit data to avoid repeated API calls
const commitCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 1000 * 60 * 30 // 30 minutes

// Optimize the fetchCommitInfo function to be more efficient
async function fetchCommitInfo(repo: string, commitId: string) {
  // Create a cache key
  const cacheKey = `${repo}/${commitId}`

  // Check cache first
  const cachedData = commitCache.get(cacheKey)
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data
  }

  try {
    // Use a simple fetch without AbortController to avoid potential issues
    const response = await fetch(`https://api.github.com/repos/${repo}/commits/${commitId}`, {
      headers: {
        "User-Agent": "Project-Management-App",
      },
    })

    if (response.status === 403 && response.headers.get("X-RateLimit-Remaining") === "0") {
      return { error: "rate_limit", message: "GitHub API rate limit exceeded. Please try again later." }
    }

    if (response.status === 404) {
      return { error: "not_found", message: "Commit not found" }
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch commit info: ${response.status}`)
    }

    const data = await response.json()

    // Cache the result
    commitCache.set(cacheKey, { data, timestamp: Date.now() })

    return data
  } catch (error) {
    console.error("Error fetching commit info:", error)
    // Return a more specific error message
    return {
      error: "fetch_error",
      message: "Failed to fetch commit data. Please check your network connection or try again later.",
    }
  }
}

// Format date to relative time (e.g., "2 days ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`
  }

  const diffInYears = Math.floor(diffInMonths / 12)
  return `${diffInYears} year${diffInYears === 1 ? "" : "s"} ago`
}

// Determine commit type based on message
function getCommitType(message: string) {
  if (message.toLowerCase().startsWith("merge")) {
    return {
      type: "merge",
      icon: <GitMerge className="h-3.5 w-3.5 text-purple-500" />,
      label: "Merge",
    }
  }

  if (message.toLowerCase().startsWith("fix") || message.toLowerCase().includes("bug")) {
    return {
      type: "fix",
      icon: <GitCommit className="h-3.5 w-3.5 text-red-500" />,
      label: "Fix",
    }
  }

  if (message.toLowerCase().startsWith("feat") || message.toLowerCase().includes("feature")) {
    return {
      type: "feature",
      icon: <GitBranch className="h-3.5 w-3.5 text-green-500" />,
      label: "Feature",
    }
  }

  return {
    type: "commit",
    icon: <GitCommit className="h-3.5 w-3.5 text-blue-500" />,
    label: "Commit",
  }
}

// New function to fetch file content
async function fetchFileContent(repo: string, path: string, ref: string) {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`, {
      headers: {
        "User-Agent": "Project-Management-App",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.status}`)
    }

    const data = await response.json()
    return atob(data.content) // Decode base64 content
  } catch (error) {
    console.error("Error fetching file content:", error)
    return null
  }
}

export function CommitLink({ url }: { url: string }) {
  const [commitInfo, setCommitInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const hasTriggeredFetch = useRef(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [shouldFetch, setShouldFetch] = useState(false)
  const [showCodeDialog, setShowCodeDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [fileContent, setFileContent] = useState<{ before: string | null; after: string | null }>({
    before: null,
    after: null,
  })
  const [loadingFileContent, setLoadingFileContent] = useState(false)

  // Extract commit information from URL
  const match = url.match(/github\.com\/([^/]+\/[^/]+)\/commit\/([a-f0-9]{7,40})/)

  // If URL doesn't match GitHub commit pattern, just render a regular link
  if (!match) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline flex items-center gap-1"
      >
        {url}
        <ExternalLink className="h-3 w-3" />
      </a>
    )
  }

  const [, repo, commitId] = match

  const handleTooltipOpen = () => {
    setIsOpen(true)
    // Start fetching immediately if needed
    if (!commitInfo && !isLoading && !hasTriggeredFetch.current) {
      setShouldFetch(true)
    }
  }

  useEffect(() => {
    let didCancel = false
    let fetchDataRunning = false

    const fetchData = async () => {
      if (fetchDataRunning) return
      fetchDataRunning = true

      setIsLoading(true)
      hasTriggeredFetch.current = true

      try {
        const info = await fetchCommitInfo(repo, commitId)

        if (!didCancel) {
          if (info.error) {
            setError(info.message)
            setCommitInfo(null)
          } else {
            setCommitInfo(info)
            setError(null)
          }
        }
      } catch (err) {
        if (!didCancel) {
          setError("Failed to load commit data")
          console.error(err)
        }
      } finally {
        if (!didCancel) {
          setIsLoading(false)
          setShouldFetch(false)
          fetchDataRunning = false
        }
      }
    }

    if (shouldFetch) {
      fetchData()
    }

    return () => {
      didCancel = true
    }
  }, [shouldFetch, repo, commitId])

  const handleRetry = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Clear cache for this commit to force a fresh fetch
      commitCache.delete(`${repo}/${commitId}`)

      const info = await fetchCommitInfo(repo, commitId)

      if (info.error) {
        setError(info.message)
        setCommitInfo(null)
      } else {
        setCommitInfo(info)
        setError(null)
      }
    } catch (err) {
      setError("Failed to load commit data")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle click for mobile devices
  const handleClick = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault()
      handleTooltipOpen()
    }
  }

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node) && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Function to view file changes
  const handleViewFile = async (file: any) => {
    setSelectedFile(file)
    setShowCodeDialog(true)
    setLoadingFileContent(true)
    setFileContent({ before: null, after: null })

    try {
      // Get the parent commit to fetch the "before" version
      const parentSha = commitInfo.parents[0]?.sha

      if (parentSha && file.filename) {
        // Fetch the file content before the change
        const beforeContent = await fetchFileContent(repo, file.filename, parentSha)

        // Fetch the file content after the change (current commit)
        let afterContent = null
        if (file.status !== "removed") {
          afterContent = await fetchFileContent(repo, file.filename, commitId)
        }

        setFileContent({
          before: beforeContent,
          after: afterContent,
        })
      }
    } catch (error) {
      console.error("Error fetching file content:", error)
    } finally {
      setLoadingFileContent(false)
    }
  }

  // Optimize the tooltip rendering to show content faster
  return (
    <>
      <TooltipProvider delayDuration={100}>
        <Tooltip open={isOpen} onOpenChange={setIsOpen}>
          <TooltipTrigger asChild onMouseEnter={!isMobile ? handleTooltipOpen : undefined}>
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono flex items-center gap-1"
              onClick={handleClick}
              aria-label={`GitHub commit: ${commitId.slice(0, 7)}`}
              title={`Full commit: ${commitId}`}
            >
              <GitCommit className="h-3.5 w-3.5" />
              <span className="truncate max-w-[80px] inline-block align-bottom">{commitId.slice(0, 7)}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </Link>
          </TooltipTrigger>
          <TooltipContent
            ref={tooltipRef}
            side="bottom"
            align="start"
            className="max-w-sm bg-background border border-border p-4 shadow-lg rounded-md z-50"
            sideOffset={5}
            avoidCollisions={true}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2 py-2">
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : error ? (
              <div className="space-y-2">
                <div className="flex items-center text-destructive gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleRetry} className="w-full mt-2">
                  Retry
                </Button>
              </div>
            ) : commitInfo ? (
              <div className="space-y-3">
                {/* Commit type badge and full SHA */}
                <div className="flex items-center justify-between">
                  {commitInfo.commit.message && (
                    <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5">
                      {getCommitType(commitInfo.commit.message).icon}
                      {getCommitType(commitInfo.commit.message).label}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">{commitId}</span>
                </div>

                {/* Commit message */}
                <div
                  className="font-medium text-foreground text-sm break-words line-clamp-2"
                  title={commitInfo.commit.message.split("\n")[0]}
                >
                  {commitInfo.commit.message.split("\n")[0]}
                </div>

                {/* Additional commit message details if present */}
                {commitInfo.commit.message.includes("\n\n") && (
                  <div
                    className="text-xs text-muted-foreground mt-1 border-l-2 border-muted pl-2 line-clamp-2"
                    title={commitInfo.commit.message.split("\n\n")[1]}
                  >
                    {commitInfo.commit.message.split("\n\n")[1]}
                  </div>
                )}

                {/* Author information */}
                <div className="flex items-center gap-2 text-sm">
                  {commitInfo.author?.avatar_url && (
                    <img
                      src={commitInfo.author.avatar_url || "/placeholder.svg"}
                      alt={`${commitInfo.commit.author.name}'s avatar`}
                      className="h-5 w-5 rounded-full"
                      onError={(e) => {
                        ; (e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  )}
                  <div>
                    <span className="font-medium truncate max-w-[120px] inline-block">
                      {commitInfo.commit.author.name}
                    </span>
                    {commitInfo.author?.login && (
                      <span className="text-muted-foreground text-xs ml-1">(@{commitInfo.author.login})</span>
                    )}
                  </div>
                </div>

                {/* Commit date */}
                <div className="text-xs text-muted-foreground">
                  Committed {formatRelativeTime(commitInfo.commit.author.date)}
                </div>

                {/* Stats */}
                {commitInfo.stats && (
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground border-t border-border pt-2">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>+{commitInfo.stats.additions || "0"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>-{commitInfo.stats.deletions || "0"}
                    </span>
                    <span className="flex items-center gap-1">Files changed: {commitInfo.files?.length || "0"}</span>
                  </div>
                )}

                {/* View changed files button */}
                {commitInfo.files && commitInfo.files.length > 0 && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-8 flex items-center justify-center gap-1"
                      onClick={() => setShowCodeDialog(true)}
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      View Changed Files
                    </Button>
                  </div>
                )}

                {/* View on GitHub button */}
                <div className="pt-2">
                  <Button size="sm" variant="outline" className="w-full text-xs h-8" asChild>
                    <a
                      href={commitInfo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1"
                    >
                      View on GitHub
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">Commit data not available</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Code diff dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] h-[90vh] w-[95vw] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedFile ? (
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileCode className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{selectedFile.filename}</span>
                  <Badge variant="outline" className="ml-auto flex-shrink-0">
                    {selectedFile.status}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <GitCommit className="h-5 w-5" />
                  <span>Changed Files</span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedFile ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="diff" className="flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto scrollbar-hide">
                  <TabsList className="mx-auto">
                    <TabsTrigger value="diff">Diff View</TabsTrigger>
                    <TabsTrigger value="before">Before</TabsTrigger>
                    <TabsTrigger value="after">After</TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex-1 overflow-auto mt-4">
                  {loadingFileContent ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <p className="ml-2 text-sm text-muted-foreground">Loading file content...</p>
                    </div>
                  ) : (
                    <>
                      <TabsContent value="diff" className="h-full">
                        <div className="border rounded-md overflow-auto h-full">
                          <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                            {selectedFile.patch || "No diff available for this file."}
                          </pre>
                        </div>
                      </TabsContent>
                      <TabsContent value="before" className="h-full">
                        <div className="border rounded-md overflow-auto h-full">
                          <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                            {fileContent.before || "File content not available."}
                          </pre>
                        </div>
                      </TabsContent>
                      <TabsContent value="after" className="h-full">
                        <div className="border rounded-md overflow-auto h-full">
                          <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                            {fileContent.after || "File content not available."}
                          </pre>
                        </div>
                      </TabsContent>
                    </>
                  )}
                </div>
              </Tabs>
              <div className="flex justify-between mt-4 flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                  Back to Files
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://github.com/${repo}/blob/${commitId}/${selectedFile.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    View on GitHub
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {commitInfo && commitInfo.files ? (
                <div className="space-y-2">
                  {commitInfo.files.map((file: any, index: number) => (
                    <div
                      key={index}
                      className="border rounded-md p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleViewFile(file)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileCode className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate text-sm font-medium">{file.filename}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            file.status === "added"
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30"
                              : file.status === "removed"
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30"
                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30"
                          }
                        >
                          {file.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>+{file.additions || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>-{file.deletions || 0}
                        </span>
                        <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 py-0">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No files available</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

