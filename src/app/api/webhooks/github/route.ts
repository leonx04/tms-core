import { database } from "@/config/firebase"
import crypto from "crypto"
import { get, push, ref, set } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"

// Function to verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false

  try {
    // Check SHA-256 signature
    if (signature.startsWith("sha256=")) {
      const hmac = crypto.createHmac("sha256", secret)
      const digest = "sha256=" + hmac.update(payload).digest("hex")
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
    }
    // Check SHA-1 signature (for older GitHub webhooks)
    else if (signature.startsWith("sha1=")) {
      const hmac = crypto.createHmac("sha1", secret)
      const digest = "sha1=" + hmac.update(payload).digest("hex")
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
    }
    return false
  } catch (error) {
    console.error("Error verifying signature:", error)
    return false
  }
}

// Function to normalize repository URL for comparison
function normalizeRepoUrl(url: string): string {
  if (!url) return ""
  // Remove trailing slashes and query parameters
  return url.replace(/\/+$/, "").split("?")[0].split("#")[0]
}

// Function to find project ID from repository URL
async function findProjectIdByRepoUrl(
  repoUrl: string,
): Promise<{ projectId: string | null; webhookSecret: string | null }> {
  try {
    // Normalize repository URL from payload
    const normalizedPayloadUrl = normalizeRepoUrl(repoUrl)
    console.log(`Finding project for normalized repository URL: ${normalizedPayloadUrl}`)

    // Find project with this repository URL
    const projectsRef = ref(database, "projects")

    try {
      const projectsSnapshot = await get(projectsRef)

      if (!projectsSnapshot.exists()) {
        console.log("No projects found in database")
        return { projectId: null, webhookSecret: null }
      }

      const projects = projectsSnapshot.val()
      let targetProjectId: string | null = null

      // Find project with matching repository URL
      for (const [projectId, projectData] of Object.entries(projects)) {
        const projectRepoUrl = (projectData as any).githubRepo || ""
        const normalizedProjectUrl = normalizeRepoUrl(projectRepoUrl)

        if (normalizedProjectUrl && normalizedProjectUrl === normalizedPayloadUrl) {
          targetProjectId = projectId
          break
        }
      }

      // If not found, try more flexible search
      if (!targetProjectId) {
        for (const [projectId, projectData] of Object.entries(projects)) {
          const projectRepoUrl = (projectData as any).githubRepo || ""
          const repoName = normalizedPayloadUrl.split("/").pop() || ""

          // Check if URL contains repository name
          if (projectRepoUrl && projectRepoUrl.includes(repoName)) {
            targetProjectId = projectId
            break
          }
        }
      }

      // Get webhook secret if available
      let webhookSecret = null
      if (targetProjectId) {
        try {
          // Use query with orderByChild to leverage index
          const webhookRef = ref(database, "projectWebhook")
          const webhookSnapshot = await get(webhookRef)

          if (webhookSnapshot.exists()) {
            const webhooks = webhookSnapshot.val()

            for (const [webhookId, webhook] of Object.entries(webhooks)) {
              if ((webhook as any).projectId === targetProjectId) {
                webhookSecret = (webhook as any).webhookSecret || null
                break
              }
            }
          }
        } catch (webhookError) {
          console.error("Error querying webhook:", webhookError)
        }
      }

      return { projectId: targetProjectId, webhookSecret }
    } catch (projectError) {
      console.error("Error querying projects:", projectError)
      return { projectId: null, webhookSecret: null }
    }
  } catch (error) {
    console.error("Error finding project ID:", error)
    return { projectId: null, webhookSecret: null }
  }
}

export async function POST(request: NextRequest) {
  console.log("Received GitHub webhook")

  try {
    // Get GitHub event type
    const githubEvent = request.headers.get("X-GitHub-Event")

    if (!githubEvent) {
      console.error("Missing X-GitHub-Event header")
      return NextResponse.json({ error: "Missing X-GitHub-Event header" }, { status: 400 })
    }

    console.log(`GitHub event type: ${githubEvent}`)

    // Get payload as text for signature verification
    const rawBody = await request.text()
    let payload: any

    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      console.error("Error parsing JSON payload:", error)
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    // Get repository URL to identify project
    const repoUrl = payload.repository?.html_url

    if (!repoUrl) {
      console.error("Repository URL not found in payload")
      return NextResponse.json({ error: "Repository URL not found in payload" }, { status: 400 })
    }

    console.log(`Repository URL: ${repoUrl}`)

    // Find project ID and webhook secret
    const { projectId, webhookSecret } = await findProjectIdByRepoUrl(repoUrl)

    if (!projectId) {
      console.log(`No project found for repository URL: ${repoUrl}. Storing event in 'unassigned'`)
      // Continue processing with projectId = "unassigned"
    } else {
      console.log(`Found project ID: ${projectId}`)
    }

    // Verify signature if webhook secret exists
    if (webhookSecret) {
      const signature = request.headers.get("X-Hub-Signature-256") || request.headers.get("X-Hub-Signature")

      if (signature) {
        const isValid = verifySignature(rawBody, signature, webhookSecret)

        if (!isValid) {
          console.warn(`Invalid webhook signature for project: ${projectId || "unassigned"}`)
          // Continue processing but log warning
        } else {
          console.log("Webhook signature verification successful")
        }
      } else {
        console.warn("No webhook signature in request")
      }
    }

    // Process webhook based on event type
    const targetProjectId = projectId || "unassigned"

    try {
      switch (githubEvent) {
        case "push":
          await handlePushEvent(targetProjectId, payload)
          break
        case "pull_request":
          await handlePullRequestEvent(targetProjectId, payload)
          break
        case "issues":
          await handleIssuesEvent(targetProjectId, payload)
          break
        case "ping":
          // Handle ping event (sent when webhook is first configured)
          await handlePingEvent(targetProjectId, payload)
          break
        default:
          // Store other events for future processing
          await storeGenericEvent(targetProjectId, githubEvent, payload)
      }
    } catch (eventError) {
      console.error(`Error processing ${githubEvent} event:`, eventError)
      // Don't throw error, just log to avoid webhook failure
    }

    console.log("GitHub webhook processing successful")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing GitHub webhook:", error)
    // Return more detailed error information for debugging
    return NextResponse.json(
      {
        success: false,
        message: "Webhook received but encountered an error during processing",
        error: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 },
    )
  }
}

async function handlePushEvent(projectId: string, payload: any) {
  try {
    const commits = payload.commits || []
    const repository = payload.repository || {}
    const sender = payload.sender || {}
    const refString = payload.ref || ""

    console.log(`Processing push event for project ${projectId} with ${commits.length} commits`)

    // Store push event
    try {
      const eventRef = push(ref(database, `projectEvents/${projectId}`))
      await set(eventRef, {
        type: "push",
        timestamp: new Date().toISOString(),
        repository: {
          id: repository.id,
          name: repository.name,
          url: repository.html_url,
        },
        sender: {
          id: sender.id,
          login: sender.login,
          avatar_url: sender.avatar_url,
        },
        ref: refString,
        commits_count: commits.length,
      })
    } catch (eventError) {
      console.error("Error storing push event:", eventError)
    }

    // Store each commit in the database
    for (const commit of commits) {
      try {
        const commitRef = push(ref(database, `projectCommits/${projectId}`))

        await set(commitRef, {
          id: commit.id,
          message: commit.message,
          timestamp: commit.timestamp,
          url: commit.url,
          author: {
            name: commit.author.name,
            email: commit.author.email,
            username: commit.author.username,
          },
          added: commit.added || [],
          removed: commit.removed || [],
          modified: commit.modified || [],
        })
      } catch (commitError) {
        console.error("Error storing commit:", commitError)
      }
    }

    // Only create notifications if this is a real project
    if (projectId !== "unassigned") {
      try {
        // Create notifications for project members
        const projectRef = ref(database, `projects/${projectId}`)
        const projectSnapshot = await get(projectRef)

        if (projectSnapshot.exists()) {
          const projectData = projectSnapshot.val()
          const members = projectData.members || {}

          // Get repository name for notification
          const repoName = repository.name
          const branch = refString.replace("refs/heads/", "")
          const commitsCount = commits.length

          // Create notification for each project member
          for (const memberId of Object.keys(members)) {
            try {
              const notificationRef = push(ref(database, "notifications"))

              await set(notificationRef, {
                userId: memberId,
                eventType: "WEBHOOK_EVENT",
                referenceId: projectId,
                message: `${payload.pusher.name} pushed ${commitsCount} commit${commitsCount === 1 ? "" : "s"} to ${repoName}/${branch}`,
                status: "unread",
                createdAt: new Date().toISOString(),
                data: {
                  type: "push",
                  repository: repository.name,
                  branch: branch,
                  commits: commits.map((commit: any) => ({
                    id: commit.id,
                    message: commit.message,
                    url: commit.url,
                  })),
                },
              })
            } catch (notificationError) {
              console.error(`Error creating notification for member ${memberId}:`, notificationError)
            }
          }
        }
      } catch (projectError) {
        console.error("Error querying project information:", projectError)
      }
    }

    console.log(`Push event processing successful for project ${projectId}`)
  } catch (error) {
    console.error("Error processing push event:", error)
    // Don't throw error, just log to avoid webhook failure
  }
}

async function handlePullRequestEvent(projectId: string, payload: any) {
  try {
    const action = payload.action
    const pullRequest = payload.pull_request
    const repository = payload.repository || {}
    const sender = payload.sender || {}

    if (!pullRequest) {
      console.warn("No pull request information in payload")
      return
    }

    console.log(`Processing pull request ${action} event for project ${projectId}`)

    // Store pull request event
    try {
      const eventRef = push(ref(database, `projectEvents/${projectId}`))
      await set(eventRef, {
        type: "pull_request",
        action: action,
        timestamp: new Date().toISOString(),
        repository: {
          id: repository.id,
          name: repository.name,
          url: repository.html_url,
        },
        sender: {
          id: sender.id,
          login: sender.login,
          avatar_url: sender.avatar_url,
        },
        pull_request: {
          id: pullRequest.number,
          title: pullRequest.title,
          url: pullRequest.html_url,
        },
      })
    } catch (eventError) {
      console.error("Error storing pull request event:", eventError)
    }

    // Store pull request in database
    try {
      const prRef = ref(database, `projectPullRequests/${projectId}/${pullRequest.number}`)

      await set(prRef, {
        id: pullRequest.number,
        title: pullRequest.title,
        body: pullRequest.body,
        state: pullRequest.state,
        html_url: pullRequest.html_url,
        created_at: pullRequest.created_at,
        updated_at: pullRequest.updated_at,
        user: {
          login: pullRequest.user.login,
          avatar_url: pullRequest.user.avatar_url,
        },
        base: {
          ref: pullRequest.base.ref,
        },
        head: {
          ref: pullRequest.head.ref,
        },
      })
    } catch (prError) {
      console.error("Error storing pull request:", prError)
    }

    // Only create notifications if this is a real project
    if (projectId !== "unassigned") {
      try {
        // Create notifications for project members
        const projectRef = ref(database, `projects/${projectId}`)
        const projectSnapshot = await get(projectRef)

        if (projectSnapshot.exists()) {
          const projectData = projectSnapshot.val()
          const members = projectData.members || {}

          // Get repository name for notification
          const repoName = repository.name

          // Create notification for each project member
          for (const memberId of Object.keys(members)) {
            try {
              const notificationRef = push(ref(database, "notifications"))

              await set(notificationRef, {
                userId: memberId,
                eventType: "WEBHOOK_EVENT",
                referenceId: projectId,
                message: `${pullRequest.user.login} ${action} pull request #${pullRequest.number} in ${repoName}: ${pullRequest.title}`,
                status: "unread",
                createdAt: new Date().toISOString(),
                data: {
                  type: "pull_request",
                  action: action,
                  repository: repository.name,
                  number: pullRequest.number,
                  title: pullRequest.title,
                  url: pullRequest.html_url,
                },
              })
            } catch (notificationError) {
              console.error(`Error creating notification for member ${memberId}:`, notificationError)
            }
          }
        }
      } catch (projectError) {
        console.error("Error querying project information:", projectError)
      }
    }

    console.log(`Pull request event processing successful for project ${projectId}`)
  } catch (error) {
    console.error("Error processing pull request event:", error)
    // Don't throw error, just log to avoid webhook failure
  }
}

async function handleIssuesEvent(projectId: string, payload: any) {
  try {
    const action = payload.action
    const issue = payload.issue
    const repository = payload.repository || {}
    const sender = payload.sender || {}

    if (!issue) {
      console.warn("No issue information in payload")
      return
    }

    console.log(`Processing issue ${action} event for project ${projectId}`)

    // Store issue event
    try {
      const eventRef = push(ref(database, `projectEvents/${projectId}`))
      await set(eventRef, {
        type: "issue",
        action: action,
        timestamp: new Date().toISOString(),
        repository: {
          id: repository.id,
          name: repository.name,
          url: repository.html_url,
        },
        sender: {
          id: sender.id,
          login: sender.login,
          avatar_url: sender.avatar_url,
        },
        issue: {
          id: issue.number,
          title: issue.title,
          url: issue.html_url,
        },
      })
    } catch (eventError) {
      console.error("Error storing issue event:", eventError)
    }

    // Store issue in database
    try {
      const issueRef = ref(database, `projectIssues/${projectId}/${issue.number}`)

      await set(issueRef, {
        id: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        html_url: issue.html_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        user: {
          login: issue.user.login,
          avatar_url: issue.user.avatar_url,
        },
      })
    } catch (issueError) {
      console.error("Error storing issue:", issueError)
    }

    // Only create notifications if this is a real project
    if (projectId !== "unassigned") {
      try {
        // Create notifications for project members
        const projectRef = ref(database, `projects/${projectId}`)
        const projectSnapshot = await get(projectRef)

        if (projectSnapshot.exists()) {
          const projectData = projectSnapshot.val()
          const members = projectData.members || {}

          // Get repository name for notification
          const repoName = repository.name

          // Create notification for each project member
          for (const memberId of Object.keys(members)) {
            try {
              const notificationRef = push(ref(database, "notifications"))

              await set(notificationRef, {
                userId: memberId,
                eventType: "WEBHOOK_EVENT",
                referenceId: projectId,
                message: `${issue.user.login} ${action} issue #${issue.number} in ${repoName}: ${issue.title}`,
                status: "unread",
                createdAt: new Date().toISOString(),
                data: {
                  type: "issue",
                  action: action,
                  repository: repository.name,
                  number: issue.number,
                  title: issue.title,
                  url: issue.html_url,
                },
              })
            } catch (notificationError) {
              console.error(`Error creating notification for member ${memberId}:`, notificationError)
            }
          }
        }
      } catch (projectError) {
        console.error("Error querying project information:", projectError)
      }
    }

    console.log(`Issue event processing successful for project ${projectId}`)
  } catch (error) {
    console.error("Error processing issue event:", error)
    // Don't throw error, just log to avoid webhook failure
  }
}

async function handlePingEvent(projectId: string, payload: any) {
  try {
    const repository = payload.repository || {}
    const sender = payload.sender || {}
    const hook = payload.hook || {}

    console.log(`Processing ping event for project ${projectId}`)

    // Store ping event
    try {
      const eventRef = push(ref(database, `projectEvents/${projectId}`))
      await set(eventRef, {
        type: "ping",
        timestamp: new Date().toISOString(),
        repository: {
          id: repository.id,
          name: repository.name,
          url: repository.html_url,
        },
        sender: {
          id: sender.id,
          login: sender.login,
          avatar_url: sender.avatar_url,
        },
        hook: {
          id: hook.id,
          type: hook.type,
          events: hook.events,
        },
        zen: payload.zen,
      })
    } catch (eventError) {
      console.error("Error storing ping event:", eventError)
    }

    // Only create notifications if this is a real project
    if (projectId !== "unassigned") {
      try {
        // Create notifications for project members
        const projectRef = ref(database, `projects/${projectId}`)
        const projectSnapshot = await get(projectRef)

        if (projectSnapshot.exists()) {
          const projectData = projectSnapshot.val()
          const members = projectData.members || {}

          // Get repository name for notification
          const repoName = repository.name

          // Create notification for each project member
          for (const memberId of Object.keys(members)) {
            try {
              const notificationRef = push(ref(database, "notifications"))

              await set(notificationRef, {
                userId: memberId,
                eventType: "WEBHOOK_EVENT",
                referenceId: projectId,
                message: `GitHub webhook for ${repoName} has been successfully configured`,
                status: "unread",
                createdAt: new Date().toISOString(),
                data: {
                  type: "ping",
                  repository: repository.name,
                  zen: payload.zen,
                },
              })
            } catch (notificationError) {
              console.error(`Error creating notification for member ${memberId}:`, notificationError)
            }
          }
        }
      } catch (projectError) {
        console.error("Error querying project information:", projectError)
      }
    }

    console.log(`Ping event processing successful for project ${projectId}`)
  } catch (error) {
    console.error("Error processing ping event:", error)
    // Don't throw error, just log to avoid webhook failure
  }
}

async function storeGenericEvent(projectId: string, eventType: string, payload: any) {
  try {
    const repository = payload.repository || {}
    const sender = payload.sender || {}

    console.log(`Storing ${eventType} event for project ${projectId}`)

    // Store generic event
    try {
      const eventRef = push(ref(database, `projectEvents/${projectId}`))
      await set(eventRef, {
        type: eventType,
        timestamp: new Date().toISOString(),
        repository: {
          id: repository.id,
          name: repository.name,
          url: repository.html_url,
        },
        sender: {
          id: sender.id,
          login: sender.login,
          avatar_url: sender.avatar_url,
        },
        payload: JSON.stringify(payload),
      })
    } catch (eventError) {
      console.error(`Error storing ${eventType} event:`, eventError)
    }

    console.log(`Successfully stored ${eventType} event for project ${projectId}`)
  } catch (error) {
    console.error(`Error processing ${eventType} event:`, error)
    // Don't throw error, just log to avoid webhook failure
  }
}

