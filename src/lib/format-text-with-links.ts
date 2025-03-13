/**
 * Formats text by converting URLs and commit IDs into clickable links
 *
 * @param text The text to format
 * @param githubRepo Optional GitHub repository in format "username/repo"
 * @returns Formatted HTML string with clickable links
 */
export function formatTextWithLinks(text: string, githubRepo?: string): string {
    if (!text) return ""
  
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g
  
    // Commit ID pattern (assuming format like "abc1234" or "abc1234def5678")
    const commitPattern = /\b([a-f0-9]{7,40})\b/g
  
    // Replace URLs with clickable links
    let formattedText = text.replace(urlPattern, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline inline-flex items-center"><span>${url}</span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`
    })
  
    // Replace commit IDs with clickable links if there's a GitHub repo
    if (githubRepo) {
      formattedText = formattedText.replace(commitPattern, (commit) => {
        const commitUrl = `https://github.com/${githubRepo}/commit/${commit}`
        return `<a href="${commitUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline inline-flex items-center"><span>${commit}</span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`
      })
    }
  
    return formattedText
  }
  