import * as React from "react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

async function fetchCommitInfo(repo: string, commitId: string) {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/commits/${commitId}`);
    if (!response.ok) throw new Error("Failed to fetch commit info");
    return await response.json();
  } catch (error) {
    console.error("Error fetching commit info:", error);
    return null;
  }
}

export function CommitLink({ url }: { url: string }) {
  const [commitInfo, setCommitInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasTriggeredFetch = useRef(false);

  const match = url.match(/github\.com\/([^\/]+\/[^\/]+)\/commit\/([a-f0-9]{7,40})/);
  if (!match) return <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>;

  const [, repo, commitId] = match;

  const handleTooltipOpen = async () => {
    if (!commitInfo && !isLoading && !hasTriggeredFetch.current) {
      setIsLoading(true);
      hasTriggeredFetch.current = true;
      const info = await fetchCommitInfo(repo, commitId);
      setCommitInfo(info);
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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
            {commitId.slice(0, 7)}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-sm bg-background border border-border p-4 shadow-lg rounded-md">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            </div>
          ) : commitInfo ? (
            <div className="space-y-2">
              <div className="font-medium text-foreground">
                {commitInfo.commit.message.split("\n")[0]}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {commitInfo.author?.avatar_url && (
                  <img
                    src={commitInfo.author.avatar_url}
                    alt="Avatar"
                    className="h-5 w-5 rounded-full"
                  />
                )}
                <span className="text-muted-foreground">
                  {commitInfo.commit.author.name}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(commitInfo.commit.author.date)}
              </div>
              <div className="text-xs flex items-center gap-1 mt-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  +{commitInfo.stats?.additions || '?'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  -{commitInfo.stats?.deletions || '?'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not found data commit</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}