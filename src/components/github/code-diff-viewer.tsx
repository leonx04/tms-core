"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileCode, ExternalLink, Copy, Check, Download, Eye, FileText, Code, ChevronDown } from 'lucide-react'
import { useMediaQuery } from "@/hooks/use-media-query"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CodeDiffViewerProps {
  filename: string
  status: string
  patch?: string
  beforeContent?: string | null
  afterContent?: string | null
  githubUrl?: string
}

// Function to safely decode base64 content with Unicode support
function safeAtob(base64: string): string {
  try {
    // For Unicode support, we need to handle the decoding manually
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    console.error("Error decoding base64:", e);
    return "Error decoding content";
  }
}

// Function to parse the diff and return highlighted HTML
function parseDiff(diff: string) {
  if (!diff) return [];

  const lines = diff.split('\n');
  const result = [];
  let lineNumber = 1;
  let oldLineNumber = 1;
  let newLineNumber = 1;
  let inHunk = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let type = 'normal';
    let content = line;
    let oldLine = null;
    let newLine = null;

    if (line.startsWith('+')) {
      type = 'addition';
      newLine = newLineNumber++;
    } else if (line.startsWith('-')) {
      type = 'deletion';
      oldLine = oldLineNumber++;
    } else if (line.startsWith('@@')) {
      type = 'info';
      inHunk = true;

      // Parse the @@ line to get the starting line numbers
      const match = line.match(/@@ -(\d+),\d+ \+(\d+),\d+ @@/);
      if (match) {
        oldLineNumber = parseInt(match[1], 10);
        newLineNumber = parseInt(match[2], 10);
      }
    } else if (inHunk) {
      // Normal line in a hunk
      oldLine = oldLineNumber++;
      newLine = newLineNumber++;
    }

    result.push({
      type,
      content,
      oldLine,
      newLine,
      lineNumber: lineNumber++
    });
  }

  return result;
}

// Function to get file extension
function getFileExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// Function to determine if the file is a text file
function isTextFile(filename: string) {
  const extension = getFileExtension(filename);
  const textExtensions = ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'html', 'json', 'yml', 'yaml', 'xml', 'svg', 'sh', 'bash', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'php', 'sql'];
  return textExtensions.includes(extension);
}

// Function to get line class based on type
function getLineClass(type: string) {
  switch (type) {
    case 'addition':
      return 'bg-[#e6ffec] text-[#24292f] dark:bg-[#0d1b12] dark:text-[#adbac7]';
    case 'deletion':
      return 'bg-[#ffebe9] text-[#24292f] dark:bg-[#1c0c0b] dark:text-[#adbac7]';
    case 'info':
      return 'bg-[#f1f8ff] text-[#0550ae] dark:bg-[#0c2d6b] dark:text-[#6cb6ff]';
    default:
      return '';
  }
}

// Function to get syntax highlighting class based on file extension
function getSyntaxClass(filename: string, lineContent: string) {
  const ext = getFileExtension(filename);

  // Basic syntax highlighting for common file types
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
    if (lineContent.match(/\b(function|return|const|let|var|if|else|for|while|class|import|export)\b/)) {
      return 'text-[#cf222e] dark:text-[#ff7b72]';
    }
    if (lineContent.match(/\b(true|false|null|undefined|this)\b/)) {
      return 'text-[#0550ae] dark:text-[#79c0ff]';
    }
    if (lineContent.match(/"([^"]*)"|'([^']*)'/)) {
      return 'text-[#0a3069] dark:text-[#a5d6ff]';
    }
  }

  return '';
}

// Function to compare before and after content and highlight changes
function highlightChanges(before: string | null, after: string | null) {
  if (!before || !after) return { beforeLines: [], afterLines: [] };

  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  // Use a simple diff algorithm to identify changes
  const beforeHighlighted: { content: string, type: string }[] = [];
  const afterHighlighted: { content: string, type: string }[] = [];

  // Create a map of lines in the after content for quick lookup
  const afterMap = new Map();
  afterLines.forEach((line, index) => {
    afterMap.set(line, index);
  });

  // Create a map of lines in the before content for quick lookup
  const beforeMap = new Map();
  beforeLines.forEach((line, index) => {
    beforeMap.set(line, index);
  });

  // Mark lines that are only in before as deletions
  beforeLines.forEach(line => {
    if (!afterMap.has(line)) {
      beforeHighlighted.push({ content: line, type: 'deletion' });
    } else {
      beforeHighlighted.push({ content: line, type: 'normal' });
    }
  });

  // Mark lines that are only in after as additions
  afterLines.forEach(line => {
    if (!beforeMap.has(line)) {
      afterHighlighted.push({ content: line, type: 'addition' });
    } else {
      afterHighlighted.push({ content: line, type: 'normal' });
    }
  });

  return { beforeLines: beforeHighlighted, afterLines: afterHighlighted };
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
  const [parsedDiff, setParsedDiff] = useState<Array<any>>([])
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [decodedBefore, setDecodedBefore] = useState<string | null>(null)
  const [decodedAfter, setDecodedAfter] = useState<string | null>(null)
  const [highlightedChanges, setHighlightedChanges] = useState<{
    beforeLines: { content: string, type: string }[],
    afterLines: { content: string, type: string }[]
  }>({ beforeLines: [], afterLines: [] })
  const [activeTab, setActiveTab] = useState("diff")
  const diffContainerRef = useRef<HTMLDivElement>(null)
  const beforeContainerRef = useRef<HTMLDivElement>(null)
  const afterContainerRef = useRef<HTMLDivElement>(null)
  const [showOptions, setShowOptions] = useState(false)

  useEffect(() => {
    if (patch) {
      setParsedDiff(parseDiff(patch));
    }

    // Decode content safely
    if (beforeContent) {
      try {
        const decoded = safeAtob(beforeContent);
        setDecodedBefore(decoded);
      } catch (e) {
        console.error("Error decoding before content:", e);
        setDecodedBefore("Error decoding content");
      }
    }

    if (afterContent) {
      try {
        const decoded = safeAtob(afterContent);
        setDecodedAfter(decoded);
      } catch (e) {
        console.error("Error decoding after content:", e);
        setDecodedAfter("Error decoding content");
      }
    }

    // Check if dark mode is enabled
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);

    // Add listener for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          setIsDarkMode(isDark);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, [patch, beforeContent, afterContent]);

  // Highlight changes when before and after content are available
  useEffect(() => {
    if (decodedBefore && decodedAfter) {
      const highlighted = highlightChanges(decodedBefore, decodedAfter);
      setHighlightedChanges(highlighted);
    }
  }, [decodedBefore, decodedAfter]);

  const handleCopy = (text: string | null | undefined, type: string) => {
    if (!text) return

    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "added":
        return "bg-[#dafbe1] text-[#1a7f37] border-[#a7f0ba] dark:bg-[#0d1b12] dark:text-[#56d364] dark:border-[#2ea043]"
      case "removed":
        return "bg-[#ffebe9] text-[#cf222e] border-[#ffc1ba] dark:bg-[#1c0c0b] dark:text-[#f85149] dark:border-[#f85149]"
      case "modified":
      case "changed":
        return "bg-[#ddf4ff] text-[#0969da] border-[#a5d6ff] dark:bg-[#0c2d6b] dark:text-[#79c0ff] dark:border-[#388bfd]"
      default:
        return ""
    }
  }

  const handleDownload = (content: string | null | undefined, type: string) => {
    if (!content) return;

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${filename}${type === 'diff' ? '.diff' : type === 'before' ? '.before' : '.after'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  const isImage = () => {
    const ext = getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext);
  }

  const isBinary = () => {
    const ext = getFileExtension(filename);
    return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'exe', 'dll', 'bin'].includes(ext);
  }

  // Function to get file icon based on extension
  const getFileIcon = () => {
    const ext = getFileExtension(filename);
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json'].includes(ext)) {
      return <Code className="h-5 w-5 flex-shrink-0" />;
    } else if (['md', 'txt', 'doc', 'docx', 'pdf'].includes(ext)) {
      return <FileText className="h-5 w-5 flex-shrink-0" />;
    } else if (isImage()) {
      return <Eye className="h-5 w-5 flex-shrink-0" />;
    }
    return <FileCode className="h-5 w-5 flex-shrink-0" />;
  };

  // Function to scroll to first change
  const scrollToFirstChange = () => {
    if (activeTab === 'diff' && diffContainerRef.current) {
      const firstAddition = diffContainerRef.current.querySelector('.bg-\\[\\#e6ffec\\], .dark\\:bg-\\[\\#0d1b12\\]');
      const firstDeletion = diffContainerRef.current.querySelector('.bg-\\[\\#ffebe9\\], .dark\\:bg-\\[\\#1c0c0b\\]');

      const firstChange = firstAddition || firstDeletion;
      if (firstChange) {
        firstChange.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (activeTab === 'before' && beforeContainerRef.current) {
      const firstDeletion = beforeContainerRef.current.querySelector('.bg-\\[\\#ffebe9\\], .dark\\:bg-\\[\\#1c0c0b\\]');
      if (firstDeletion) {
        firstDeletion.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (activeTab === 'after' && afterContainerRef.current) {
      const firstAddition = afterContainerRef.current.querySelector('.bg-\\[\\#e6ffec\\], .dark\\:bg-\\[\\#0d1b12\\]');
      if (firstAddition) {
        firstAddition.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  useEffect(() => {
    // Small delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      scrollToFirstChange();
    }, 100);

    return () => clearTimeout(timer);
  }, [activeTab, parsedDiff, highlightedChanges]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-hidden max-w-full">
          {getFileIcon()}
          <span className="truncate font-medium">{filename}</span>
        </div>
        <Badge variant="outline" className={`${getStatusColor(status)} font-medium`}>
          {status}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="mx-auto mb-4 w-auto inline-flex bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] p-0.5 rounded-md">
            <TabsTrigger
              value="diff"
              className="data-[state=active]:bg-white data-[state=active]:dark:bg-[#0d1117] data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm"
            >
              Diff View
            </TabsTrigger>
            <TabsTrigger
              value="before"
              disabled={!beforeContent}
              className="data-[state=active]:bg-white data-[state=active]:dark:bg-[#0d1117] data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm"
            >
              Before
            </TabsTrigger>
            <TabsTrigger
              value="after"
              disabled={!afterContent}
              className="data-[state=active]:bg-white data-[state=active]:dark:bg-[#0d1117] data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm"
            >
              After
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-y-hidden mt-2 relative">
          <TabsContent value="diff" className="h-full">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-sm border border-[#d0d7de] dark:border-[#30363d] shadow-sm"
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {showOptions && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-md shadow-lg p-1 z-20 min-w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7 px-2"
                      onClick={() => setShowLineNumbers(!showLineNumbers)}
                    >
                      {showLineNumbers ? "Hide line numbers" : "Show line numbers"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7 px-2"
                      onClick={() => handleDownload(patch, 'diff')}
                    >
                      Download diff
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7 px-2"
                      onClick={() => handleCopy(patch, "diff")}
                    >
                      {copied === "diff" ? "Copied!" : "Copy diff"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div
              ref={diffContainerRef}
              className="border border-[#d0d7de] dark:border-[#30363d] rounded-md overflow-y-hidden h-full github-scrollbar"
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
                <div className={`font-mono text-xs ${isDarkMode ? 'bg-[#0d1117]' : 'bg-white'}`}>
                  <table className="w-full border-collapse">
                    <tbody>
                      {parsedDiff.map((line, index) => (
                        <tr key={index} className={`${getLineClass(line.type)} hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]`}>
                          {showLineNumbers && (
                            <>
                              <td className="select-none text-right pr-1 pl-3 text-[#57606a] dark:text-[#768390] border-r border-[#d0d7de] dark:border-[#30363d] w-[4ch] text-xs">
                                {line.oldLine !== null ? line.oldLine : ' '}
                              </td>
                              <td className="select-none text-right pr-1 pl-1 text-[#57606a] dark:text-[#768390] border-r border-[#d0d7de] dark:border-[#30363d] w-[4ch] text-xs">
                                {line.newLine !== null ? line.newLine : ' '}
                              </td>
                            </>
                          )}
                          <td
                            className={`pl-3 pr-4 py-0.5 whitespace-pre overflow-visible ${line.type === 'addition'
                                ? 'border-l-2 border-[#2da44e] dark:border-[#2ea043]'
                                : line.type === 'deletion'
                                  ? 'border-l-2 border-[#cf222e] dark:border-[#f85149]'
                                  : line.type === 'info'
                                    ? 'border-l-2 border-[#0969da] dark:border-[#388bfd]'
                                    : ''
                              } ${getSyntaxClass(filename, line.content)}`}
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
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-sm border border-[#d0d7de] dark:border-[#30363d] shadow-sm"
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {showOptions && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-md shadow-lg p-1 z-20 min-w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7 px-2"
                      onClick={() => handleDownload(decodedBefore, 'before')}
                    >
                      Download content
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7 px-2"
                      onClick={() => handleCopy(decodedBefore, "before")}
                    >
                      {copied === "before" ? "Copied!" : "Copy content"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div
              ref={beforeContainerRef}
              className="border border-[#d0d7de] dark:border-[#30363d] rounded-md overflow-y-hidden h-full github-scrollbar"
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
                <div className={`font-mono text-xs ${isDarkMode ? 'bg-[#0d1117]' : 'bg-white'}`}>
                  {highlightedChanges.beforeLines.length > 0 ? (
                    <table className="w-full border-collapse">
                      <tbody>
                        {highlightedChanges.beforeLines.map((line, index) => (
                          <tr key={index} className={`${getLineClass(line.type)} hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]`}>
                            {showLineNumbers && (
                              <td className="select-none text-right pr-1 pl-3 text-[#57606a] dark:text-[#768390] border-r border-[#d0d7de] dark:border-[#30363d] w-[4ch] text-xs">
                                {index + 1}
                              </td>
                            )}
                            <td
                              className={`pl-3 pr-4 py-0.5 whitespace-pre overflow-visible ${line.type === 'deletion'
                                  ? 'border-l-2 border-[#cf222e] dark:border-[#f85149]'
                                  : ''
                                } ${getSyntaxClass(filename, line.content)}`}
                            >
                              {line.content}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <pre className="p-4 whitespace-pre-wrap">
                      {decodedBefore || "File content not available."}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="after" className="h-full">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-sm border border-[#d0d7de] dark:border-[#30363d] shadow-sm"
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {showOptions && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-md shadow-lg p-1 z-20 min-w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7 px-2"
                      onClick={() => handleDownload(decodedAfter, 'after')}
                    >
                      Download content
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7 px-2"
                      onClick={() => handleCopy(decodedAfter, "after")}
                    >
                      {copied === "after" ? "Copied!" : "Copy content"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div
              ref={afterContainerRef}
              className="border border-[#d0d7de] dark:border-[#30363d] rounded-md overflow-auto h-full github-scrollbar"
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
                <div className={`font-mono text-xs ${isDarkMode ? 'bg-[#0d1117]' : 'bg-white'}`}>
                  {highlightedChanges.afterLines.length > 0 ? (
                    <table className="w-full border-collapse">
                      <tbody>
                        {highlightedChanges.afterLines.map((line, index) => (
                          <tr key={index} className={`${getLineClass(line.type)} hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]`}>
                            {showLineNumbers && (
                              <td className="select-none text-right pr-1 pl-3 text-[#57606a] dark:text-[#768390] border-r border-[#d0d7de] dark:border-[#30363d] w-[4ch] text-xs">
                                {index + 1}
                              </td>
                            )}
                            <td
                              className={`pl-3 pr-4 py-0.5 whitespace-pre overflow-visible ${line.type === 'addition'
                                  ? 'border-l-2 border-[#2da44e] dark:border-[#2ea043]'
                                  : ''
                                } ${getSyntaxClass(filename, line.content)}`}
                            >
                              {line.content}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <pre className="p-4 whitespace-pre-wrap">
                      {decodedAfter || "File content not available."}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {githubUrl && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full border-[#d0d7de] dark:border-[#30363d] hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]"
          >
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
