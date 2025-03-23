"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileCode, ExternalLink, Copy, Check, Download } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"

// Add this CSS class for hiding scrollbars while maintaining functionality
const noScrollbarClass = "scrollbar-hide"

interface CodeDiffViewerProps {
  filename: string
  status: string
  patch?: string
  beforeContent?: string | null
  afterContent?: string | null
  githubUrl?: string
}

// Function to parse the diff and return highlighted HTML
function parseDiff(diff: string) {
  if (!diff) return []

  const lines = diff.split("\n")
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let type = "normal"
    let content = line

    if (line.startsWith("+")) {
      type = "addition"
      content = line
    } else if (line.startsWith("-")) {
      type = "deletion"
      content = line
    } else if (line.startsWith("@@")) {
      type = "info"
      content = line
    }

    result.push({ type, content })
  }

  return result
}

// Function to get file extension
function getFileExtension(filename: string) {
  return filename.split(".").pop() || ""
}

// Function to determine if the file is a text file
function isTextFile(filename: string) {
  const extension = getFileExtension(filename).toLowerCase()
  const textExtensions = [
    "txt",
    "md",
    "js",
    "jsx",
    "ts",
    "tsx",
    "css",
    "scss",
    "html",
    "json",
    "yml",
    "yaml",
    "xml",
    "svg",
    "sh",
    "bash",
    "py",
    "rb",
    "java",
    "c",
    "cpp",
    "h",
    "cs",
    "go",
    "php",
    "sql",
  ]
  return textExtensions.includes(extension)
}

// Function to get line class based on type
function getLineClass(type: string) {
  switch (type) {
    case "addition":
      return "bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-300"
    case "deletion":
      return "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-300"
    case "info":
      return "bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300"
    default:
      return ""
  }
}

export function CodeDiffViewer({
  filename,
  status,
  patch,
  beforeContent,
  afterContent,
  githubUrl,
}: CodeDiffViewerProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const isMobile = useMediaQuery("(max-width: 640px)")
  const [parsedDiff, setParsedDiff] = useState<Array<{ type: string; content: string }>>([])
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    if (patch) {
      setParsedDiff(parseDiff(patch))
    }

    // Check if dark mode is enabled
    const isDark = document.documentElement.classList.contains("dark")
    setIsDarkMode(isDark)

    // Add listener for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark")
          setIsDarkMode(isDark)
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })

    return () => {
      observer.disconnect()
    }
  }, [patch])

  const handleCopy = (text: string | null | undefined, type: string) => {
    if (!text) return

    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "added":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30"
      case "removed":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30"
      case "modified":
      case "changed":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30"
      default:
        return ""
    }
  }

  const handleDownload = (content: string | null | undefined, type: string) => {
    if (!content) return

    const element = document.createElement("a")
    const file = new Blob([content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${filename}${type === "diff" ? ".diff" : type === "before" ? ".before" : ".after"}`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const isImage = () => {
    const ext = getFileExtension(filename).toLowerCase()
    return ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext)
  }

  const isBinary = () => {
    const ext = getFileExtension(filename).toLowerCase()
    return ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "exe", "dll", "bin"].includes(ext)
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-hidden max-w-full">
          <FileCode className="h-5 w-5 flex-shrink-0" />
          <span className="truncate font-medium">{filename}</span>
        </div>
        <Badge variant="outline" className={getStatusColor(status)}>
          {status}
        </Badge>
      </div>

      <Tabs defaultValue="diff" className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="mx-auto mb-4 w-auto inline-flex">
            <TabsTrigger value="diff">Diff View</TabsTrigger>
            <TabsTrigger value="before" disabled={!beforeContent}>
              Before
            </TabsTrigger>
            <TabsTrigger value="after" disabled={!afterContent}>
              After
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-auto mt-2 relative">
          <TabsContent value="diff" className="h-full">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
              >
                <span className="text-xs font-mono">{showLineNumbers ? "123" : "abc"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleDownload(patch, "diff")}
                aria-label="Download diff"
                title="Download diff"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopy(patch, "diff")}
                aria-label="Copy diff"
                title="Copy diff"
              >
                {copied === "diff" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div
              className={`border rounded-md overflow-auto h-full ${isImage() || isBinary() ? "flex items-center justify-center" : ""}`}
            >
              {isImage() ? (
                <div className="text-center p-8">
                  <p className="text-muted-foreground mb-4">Image files cannot be displayed in diff view.</p>
                  {githubUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center"
                      >
                        View on GitHub
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              ) : isBinary() ? (
                <div className="text-center p-8">
                  <p className="text-muted-foreground mb-4">Binary files cannot be displayed in diff view.</p>
                  {githubUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center"
                      >
                        View on GitHub
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              ) : parsedDiff.length > 0 ? (
                <div className={`font-mono text-xs ${isDarkMode ? "bg-zinc-900" : "bg-white"}`}>
                  <table className="w-full border-collapse">
                    <tbody>
                      {parsedDiff.map((line, index) => (
                        <tr key={index} className={`${getLineClass(line.type)} hover:bg-muted/50`}>
                          {showLineNumbers && (
                            <td className="select-none text-right pr-2 pl-3 text-muted-foreground border-r border-border w-12">
                              {line.type !== "info" && <span>{index + 1}</span>}
                            </td>
                          )}
                          <td
                            className={`pl-3 pr-4 py-0.5 whitespace-pre ${line.type === "addition" ? "border-l-2 border-green-500" : line.type === "deletion" ? "border-l-2 border-red-500" : ""}`}
                          >
                            {line.content}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                  {patch || "No diff available for this file."}
                </pre>
              )}
            </div>
          </TabsContent>
          <TabsContent value="before" className="h-full">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleDownload(beforeContent, "before")}
                aria-label="Download before content"
                title="Download before content"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopy(beforeContent, "before")}
                aria-label="Copy before content"
                title="Copy before content"
              >
                {copied === "before" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div
              className={`border rounded-md overflow-auto h-full ${isImage() ? "flex items-center justify-center" : ""}`}
            >
              {isImage() && beforeContent ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Previous version:</p>
                  <img
                    src={`data:image/${getFileExtension(filename)};base64,${beforeContent}`}
                    alt="Previous version"
                    className="max-w-full max-h-[60vh] mx-auto border rounded shadow-sm"
                  />
                </div>
              ) : (
                <pre className={`p-4 text-xs font-mono whitespace-pre-wrap ${isDarkMode ? "bg-zinc-900" : "bg-white"}`}>
                  {beforeContent || "File content not available."}
                </pre>
              )}
            </div>
          </TabsContent>
          <TabsContent value="after" className="h-full">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleDownload(afterContent, "after")}
                aria-label="Download after content"
                title="Download after content"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopy(afterContent, "after")}
                aria-label="Copy after content"
                title="Copy after content"
              >
                {copied === "after" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div
              className={`border rounded-md overflow-auto h-full ${isImage() ? "flex items-center justify-center" : ""}`}
            >
              {isImage() && afterContent ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Current version:</p>
                  <img
                    src={`data:image/${getFileExtension(filename)};base64,${afterContent}`}
                    alt="Current version"
                    className="max-w-full max-h-[60vh] mx-auto border rounded shadow-sm"
                  />
                </div>
              ) : (
                <pre className={`p-4 text-xs font-mono whitespace-pre-wrap ${isDarkMode ? "bg-zinc-900" : "bg-white"}`}>
                  {afterContent || "File content not available."}
                </pre>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {githubUrl && (
        <div className="mt-4">
          <Button variant="outline" size="sm" asChild className="w-full">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center"
            >
              View on GitHub
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}

