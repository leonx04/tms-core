import { database } from "@/config/firebase"
import crypto from "crypto"
import { get, push, ref, set } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Get the GitHub event type
    const githubEvent = request.headers.get("X-GitHub-Event")

    if (!githubEvent) {
      return NextResponse.json({ error: "Missing X-GitHub-Event header" }, { status: 400 })
    }

    // Get the payload as text first to verify signature
    const rawBody = await request.text()
    let payload: any

    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      console.error("Error parsing webhook payload:", error)
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    // Get the repository URL to identify the project
    const repoUrl = payload.repository?.html_url

    if (!repoUrl) {
      return NextResponse.json({ error: "Repository URL not found in payload" }, { status: 400 })
    }

    // Find the project with this repository URL
    const projectsRef = ref(database, "projects")
    const projectsSnapshot = await get(projectsRef)

    if (!projectsSnapshot.exists()) {
      return NextResponse.json({ error: "No projects found" }, { status: 404 })
    }

    const projects = projectsSnapshot.val()
    let targetProjectId: string | null = null
    let webhookSecret = null

    // Find the project with matching repository URL
    Object.entries(projects).forEach(([projectId, projectData]: [string, any]) => {
      if (projectData.githubRepo === repoUrl) {
        targetProjectId = projectId
      }
    })

    if (!targetProjectId) {
      // Try to match with a more flexible approach
      Object.entries(projects).forEach(([projectId, projectData]: [string, any]) => {
        const projectRepoUrl = projectData.githubRepo || ""
        // Remove trailing slashes for comparison
        const normalizedProjectUrl = projectRepoUrl.replace(/\/+$/, "")
        const normalizedPayloadUrl = repoUrl.replace(/\/+$/, "")

        if (normalizedProjectUrl === normalizedPayloadUrl) {
          targetProjectId = projectId
        }
      })

      if (!targetProjectId) {
        console.log("No project found for repository URL:", repoUrl)
        // Instead of returning an error, we'll log the event anyway
        // This helps with debugging and allows for future project connections
        targetProjectId = "unassigned"
      }
    }

    // Get the webhook configuration for this project if it exists
    if (targetProjectId !== "unassigned") {
      const webhookRef = ref(database, "projectWebhook")
      const webhookSnapshot = await get(webhookRef)

      if (webhookSnapshot.exists()) {
        const webhooks = webhookSnapshot.val()

        Object.values(webhooks).forEach((webhook: any) => {
          if (webhook.projectId === targetProjectId) {
            webhookSecret = webhook.webhookSecret
          }
        })
      }
    }

    // Verify the signature if webhook secret is available
    // Note: We're not returning an error if verification fails to allow for initial setup
    if (webhookSecret) {
      const signature = request.headers.get("X-Hub-Signature-256") || request.headers.get("X-Hub-Signature")

      if (signature) {
        let isValid = false

        // Check SHA-256 signature
        if (signature.startsWith("sha256=")) {
          const hmac = crypto.createHmac("sha256", webhookSecret)
          const digest = "sha256=" + hmac.update(rawBody).digest("hex")
          isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
        }
        // Check SHA-1 signature (older GitHub webhooks)
        else if (signature.startsWith("sha1=")) {
          const hmac = crypto.createHmac("sha1", webhookSecret)
          const digest = "sha1=" + hmac.update(rawBody).digest("hex")
          isValid = signature === digest
        }

        if (!isValid) {
          console.warn("Invalid webhook signature for project:", targetProjectId)
          // Continue processing but log the warning
        }
      }
    }

    // Process the webhook based on the event type
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing GitHub webhook:", error)
    return NextResponse.json({ success: false, message: "Webhook received but encountered an error during processing" })
  }
}

async function handlePushEvent(projectId: string, payload: any) {
  try {
    const commits = payload.commits || []
    const repository = payload.repository || {}
    const sender = payload.sender || {}
    const ref = payload.ref || ""

    // Store the push event
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
      ref: ref,
      commits_count: commits.length,
    })

    // Store each commit in the database
    for (const commit of commits) {
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
    }

    // Only create notifications if this is a real project
    if (projectId !== "unassigned") {
      // Create notifications for project members
      const projectRef = ref(database, `projects/${projectId}`)
      const projectSnapshot = await get(projectRef)

      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.val()
        const members = projectData.members || {}

        // Get the repository name for the notification message
        const repoName = repository.name
        const branch = ref.replace("refs/heads/", "")
        const commitsCount = commits.length

        // Create a notification for each project member
        for (const [memberId, memberData] of Object.entries(members)) {
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
        }
      }
    }
  } catch (error) {
    console.error("Error handling push event:", error)
    // Don't throw the error, just log it to prevent webhook failure
  }
}

async function handlePullRequestEvent(projectId: string, payload: any) {
  try {
    const action = payload.action
    const pullRequest = payload.pull_request
    const repository = payload.repository || {}
    const sender = payload.sender || {}

    if (!pullRequest) return

    // Store the pull request event
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

    // Store the pull request in the database
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

    // Only create notifications if this is a real project
    if (projectId !== "unassigned") {
      // Create notifications for project members
      const projectRef = ref(database, `projects/${projectId}`)
      const projectSnapshot = await get(projectRef)

      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.val()
        const members = projectData.members || {}

        // Get the repository name for the notification message
        const repoName = repository.name

        // Create a notification for each project member
        for (const [memberId, memberData] of Object.entries(members)) {
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
        }
      }
    }
  } catch (error) {
    console.error("Error handling pull request event:", error)
    // Don't throw the error, just log it to prevent webhook failure
  }
}

async function handleIssuesEvent(projectId: string, payload: any) {
  try {
    const action = payload.action
    const issue = payload.issue
    const repository = payload.repository || {}
    const sender = payload.sender || {}

    if (!issue) return

    // Store the issue event
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

    // Store the issue in the database
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

    // Only create notifications if this is a real project
    if (projectId !== "unassigned") {
      // Create notifications for project members
      const projectRef = ref(database, `projects/${projectId}`)
      const projectSnapshot = await get(projectRef)

      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.val()
        const members = projectData.members || {}

        // Get the repository name for the notification message
        const repoName = repository.name

        // Create a notification for each project member
        for (const [memberId, memberData] of Object.entries(members)) {
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
        }
      }
    }
  } catch (error) {
    console.error("Error handling issues event:", error)
    // Don't throw the error, just log it to prevent webhook failure
  }
}

async function handlePingEvent(projectId: string, payload: any) {
  try {
    const repository = payload.repository || {}
    const sender = payload.sender || {}
    const hook = payload.hook || {}

    // Store the ping event
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

    // Only create notifications if this is a real project
    if (projectId !== "unassigned") {
      // Create notifications for project members
      const projectRef = ref(database, `projects/${projectId}`)
      const projectSnapshot = await get(projectRef)

      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.val()
        const members = projectData.members || {}

        // Get the repository name for the notification message
        const repoName = repository.name

        // Create a notification for each project member
        for (const [memberId, memberData] of Object.entries(members)) {
          const notificationRef = push(ref(database, "notifications"))

          await set(notificationRef, {
            userId: memberId,
            eventType: "WEBHOOK_EVENT",
            referenceId: projectId,
            message: `GitHub webhook for ${repoName} was successfully configured`,
            status: "unread",
            createdAt: new Date().toISOString(),
            data: {
              type: "ping",
              repository: repository.name,
              zen: payload.zen,
            },
          })
        }
      }
    }
  } catch (error) {
    console.error("Error handling ping event:", error)
    // Don't throw the error, just log it to prevent webhook failure
  }
}

async function storeGenericEvent(projectId: string, eventType: string, payload: any) {
  try {
    const repository = payload.repository || {}
    const sender = payload.sender || {}

    // Store the generic event
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
  } catch (error) {
    console.error(`Error handling ${eventType} event:`, error)
    // Don't throw the error, just log it to prevent webhook failure
  }
}
