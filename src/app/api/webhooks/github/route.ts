import { type NextRequest, NextResponse } from "next/server"
import { ref, get, push, set } from "firebase/database"
import { database } from "@/lib/firebase"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    // Get the GitHub event type
    const githubEvent = request.headers.get("X-GitHub-Event")

    if (!githubEvent) {
      return NextResponse.json({ error: "Missing X-GitHub-Event header" }, { status: 400 })
    }

    // Get the signature from GitHub
    const signature = request.headers.get("X-Hub-Signature-256")

    if (!signature) {
      return NextResponse.json({ error: "Missing X-Hub-Signature-256 header" }, { status: 400 })
    }

    // Get the payload
    const payload = await request.json()

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
      return NextResponse.json({ error: "No project found for this repository" }, { status: 404 })
    }

    // Get the webhook configuration for this project
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

    // Verify the signature if webhook secret is available
    if (webhookSecret) {
      const hmac = crypto.createHmac("sha256", webhookSecret)
      const digest = "sha256=" + hmac.update(JSON.stringify(payload)).digest("hex")

      if (signature !== digest) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
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
      // Add more event types as needed
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing GitHub webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handlePushEvent(projectId: string, payload: any) {
  try {
    const commits = payload.commits || []

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
        added: commit.added,
        removed: commit.removed,
        modified: commit.modified,
      })
    }

    // Create notifications for project members
    const projectRef = ref(database, `projects/${projectId}`)
    const projectSnapshot = await get(projectRef)

    if (projectSnapshot.exists()) {
      const projectData = projectSnapshot.val()
      const members = projectData.members || {}

      // Get the repository name for the notification message
      const repoName = payload.repository.name
      const branch = payload.ref.replace("refs/heads/", "")
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
            repository: payload.repository.name,
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
  } catch (error) {
    console.error("Error handling push event:", error)
    throw error
  }
}

async function handlePullRequestEvent(projectId: string, payload: any) {
  try {
    const action = payload.action
    const pullRequest = payload.pull_request

    if (!pullRequest) return

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

    // Create notifications for project members
    const projectRef = ref(database, `projects/${projectId}`)
    const projectSnapshot = await get(projectRef)

    if (projectSnapshot.exists()) {
      const projectData = projectSnapshot.val()
      const members = projectData.members || {}

      // Get the repository name for the notification message
      const repoName = payload.repository.name

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
            repository: payload.repository.name,
            number: pullRequest.number,
            title: pullRequest.title,
            url: pullRequest.html_url,
          },
        })
      }
    }
  } catch (error) {
    console.error("Error handling pull request event:", error)
    throw error
  }
}

async function handleIssuesEvent(projectId: string, payload: any) {
  try {
    const action = payload.action
    const issue = payload.issue

    if (!issue) return

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

    // Create notifications for project members
    const projectRef = ref(database, `projects/${projectId}`)
    const projectSnapshot = await get(projectRef)

    if (projectSnapshot.exists()) {
      const projectData = projectSnapshot.val()
      const members = projectData.members || {}

      // Get the repository name for the notification message
      const repoName = payload.repository.name

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
            repository: payload.repository.name,
            number: issue.number,
            title: issue.title,
            url: issue.html_url,
          },
        })
      }
    }
  } catch (error) {
    console.error("Error handling issues event:", error)
    throw error
  }
}

