"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMediaQuery } from "@/hooks/use-media-query"
import { AlertCircle, Bug, Calendar, ExternalLink, GitFork, Languages, RefreshCcw, Star } from 'lucide-react'
import Link from "next/link"
import type * as React from "react"
import { useEffect, useRef, useState } from "react"

// Cache for repository data to avoid repeated API calls
const repoCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 1000 * 60 * 30 // 30 minutes

async function fetchRepoInfo(repo: string) {
    // Check cache first
    const cachedData = repoCache.get(repo)
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.data
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${repo}`, {
            headers: {
                // Add a user agent to avoid GitHub API limitations
                "User-Agent": "Project-Management-App",
            },
        })

        if (response.status === 403 && response.headers.get("X-RateLimit-Remaining") === "0") {
            return { error: "rate_limit", message: "GitHub API rate limit exceeded. Please try again later." }
        }

        if (response.status === 404) {
            return { error: "not_found", message: "Repository not found" }
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch repository info: ${response.status}`)
        }

        const data = await response.json()

        // Cache the result
        repoCache.set(repo, { data, timestamp: Date.now() })

        return data
    } catch (error) {
        console.error("Error fetching repository info:", error)
        return { error: "fetch_error", message: "Failed to fetch repository data" }
    }
}

// Format numbers with K, M for better readability
function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
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

export function RepoLink({ url }: { url: string }) {
    const [repoInfo, setRepoInfo] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const hasTriggeredFetch = useRef(false)
    const isMobile = useMediaQuery("(max-width: 768px)")
    const tooltipRef = useRef<HTMLDivElement>(null)
    const [isMounted, setIsMounted] = useState(false)

    // Extract repository information from URL
    const match = url.match(/github\.com\/([^/]+\/[^/]+)/)
    const repoPath = match ? match[1].replace(/\.git$/, "") : null

    // If URL doesn't match GitHub pattern, just render a regular link
    if (!repoPath) {
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

    const handleTooltipOpen = async () => {
        setIsOpen(true)
        if (!repoInfo && !isLoading && !hasTriggeredFetch.current) {
            setIsLoading(true)
            hasTriggeredFetch.current = true

            try {
                const info = await fetchRepoInfo(repoPath)

                if (info.error) {
                    setError(info.message)
                    setRepoInfo(null)
                } else {
                    setRepoInfo(info)
                    setError(null)
                }
            } catch (err) {
                setError("Failed to load repository data")
                console.error(err)
            } finally {
                setIsLoading(false)
            }
        }
    }

    const handleRetry = async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Clear cache for this repo to force a fresh fetch
            repoCache.delete(repoPath)

            const info = await fetchRepoInfo(repoPath)

            if (info.error) {
                setError(info.message)
                setRepoInfo(null)
            } else {
                setRepoInfo(info)
                setError(null)
            }
        } catch (err) {
            setError("Failed to load repository data")
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
        setIsMounted(true)

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

    useEffect(() => {
        if (!isMounted) return;
    }, [isMounted])

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip open={isOpen} onOpenChange={setIsOpen}>
                <TooltipTrigger asChild onMouseEnter={!isMobile ? handleTooltipOpen : undefined}>
                    <Link
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-mono flex items-center gap-1 max-w-full"
                        onClick={handleClick}
                        aria-label={`GitHub repository: ${repoPath}`}
                        title={repoPath}
                    >
                        <span className="truncate">{repoPath}</span>
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
                            <p className="text-sm text-muted-foreground">Loading repository data...</p>
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
                    ) : repoInfo ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <img
                                        src={repoInfo.owner.avatar_url || "/placeholder.svg"}
                                        alt={`${repoInfo.owner.login}'s avatar`}
                                        className="w-6 h-6 rounded-full"
                                        onError={(e) => {
                                            ; (e.target as HTMLImageElement).style.display = "none"
                                        }}
                                    />
                                    <div className="font-medium text-foreground line-clamp-2 max-w-[200px]">
                                        {repoInfo.full_name}
                                    </div>
                                </div>
                                {repoInfo.private && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                        Private
                                    </Badge>
                                )}
                            </div>

                            {repoInfo.description && (
                                <div className="text-sm text-muted-foreground line-clamp-2">{repoInfo.description}</div>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                                    <span>{formatNumber(repoInfo.stargazers_count)} stars</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <GitFork className="w-3.5 h-3.5 text-blue-500" />
                                    <span>{formatNumber(repoInfo.forks_count)} forks</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Bug className="w-3.5 h-3.5 text-red-500" />
                                    <span>{formatNumber(repoInfo.open_issues_count)} issues</span>
                                </div>
                                {repoInfo.language && (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Languages className="w-3.5 h-3.5 text-green-500" />
                                        <span>{repoInfo.language}</span>
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Created {formatRelativeTime(repoInfo.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <RefreshCcw className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Updated {formatRelativeTime(repoInfo.updated_at)}</span>
                                </div>
                            </div>

                            {repoInfo.license && (
                                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                                    License: {repoInfo.license.spdx_id || repoInfo.license.name}
                                </div>
                            )}

                            <div className="pt-2">
                                <Button size="sm" variant="outline" className="w-full text-xs h-8" asChild>
                                    <a
                                        href={repoInfo.html_url}
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
                        <p className="text-sm text-muted-foreground py-2">Repository data not available</p>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
