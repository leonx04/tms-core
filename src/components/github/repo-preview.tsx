import * as React from "react";
import { useState, useRef } from "react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, GitFork, Bug, Languages, Calendar, RefreshCcw } from "lucide-react";

async function fetchRepoInfo(repo: string) {
    try {
        const response = await fetch(`https://api.github.com/repos/${repo}`);
        if (!response.ok) throw new Error("Failed to fetch repository info");
        return await response.json();
    } catch (error) {
        console.error("Error fetching repository info:", error);
        return null;
    }
}

export function RepoLink({ url }: { url: string }) {
    const [repoInfo, setRepoInfo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const hasTriggeredFetch = useRef(false);

    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    if (!match) return <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>;

    const [, repo] = match;

    const handleTooltipOpen = async () => {
        if (!repoInfo && !isLoading && !hasTriggeredFetch.current) {
            setIsLoading(true);
            hasTriggeredFetch.current = true;
            const info = await fetchRepoInfo(repo);
            setRepoInfo(info);
            setIsLoading(false);
        }
    };

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild onMouseEnter={handleTooltipOpen}>
                    <Link
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-mono"
                    >
                        {repo}
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-sm bg-background border border-border p-4 shadow-lg rounded-md">
                    {isLoading ? (
                        <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        </div>
                    ) : repoInfo ? (
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <img src={repoInfo.owner.avatar_url} alt="Owner Avatar" className="w-6 h-6 rounded-full" />
                                <div className="font-medium text-foreground">{repoInfo.full_name}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {repoInfo.description || "No description available"}
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" /> {repoInfo.stargazers_count}</span>
                                <span className="flex items-center gap-1"><GitFork className="w-4 h-4 text-blue-500" /> {repoInfo.forks_count}</span>
                                <span className="flex items-center gap-1"><Bug className="w-4 h-4 text-red-500" /> {repoInfo.open_issues_count}</span>
                                {repoInfo.language && (
                                    <span className="flex items-center gap-1"><Languages className="w-4 h-4 text-green-500" /> {repoInfo.language}</span>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                Created: {new Date(repoInfo.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <RefreshCcw className="w-4 h-4 text-gray-500" />
                                Last updated: {new Date(repoInfo.updated_at).toLocaleString()}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Repository data not found</p>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
