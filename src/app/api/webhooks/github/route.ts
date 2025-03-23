import { database } from "@/config/firebase"
import crypto from "crypto"
import { get, push, ref, set } from "firebase/database"
import { type NextRequest, NextResponse } from "next/server"

// Hàm kiểm tra chữ ký webhook
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false

  try {
    // Kiểm tra chữ ký SHA-256
    if (signature.startsWith("sha256=")) {
      const hmac = crypto.createHmac("sha256", secret)
      const digest = "sha256=" + hmac.update(payload).digest("hex")
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
    }
    // Kiểm tra chữ ký SHA-1 (cho các webhook GitHub cũ hơn)
    else if (signature.startsWith("sha1=")) {
      const hmac = crypto.createHmac("sha1", secret)
      const digest = "sha1=" + hmac.update(payload).digest("hex")
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
    }
    return false
  } catch (error) {
    console.error("Lỗi khi xác thực chữ ký:", error)
    return false
  }
}

// Hàm chuẩn hóa URL repository để so sánh
function normalizeRepoUrl(url: string): string {
  if (!url) return ""
  // Loại bỏ dấu / ở cuối và các tham số query
  return url.replace(/\/+$/, "").split("?")[0].split("#")[0]
}

// Hàm tìm project ID từ repository URL
async function findProjectIdByRepoUrl(
  repoUrl: string,
): Promise<{ projectId: string | null; webhookSecret: string | null }> {
  try {
    // Chuẩn hóa URL repository từ payload
    const normalizedPayloadUrl = normalizeRepoUrl(repoUrl)

    // Tìm project với repository URL này
    const projectsRef = ref(database, "projects")
    const projectsSnapshot = await get(projectsRef)

    if (!projectsSnapshot.exists()) {
      console.log("Không tìm thấy dự án nào trong cơ sở dữ liệu")
      return { projectId: null, webhookSecret: null }
    }

    const projects = projectsSnapshot.val()
    let targetProjectId: string | null = null

    // Tìm project với URL repository khớp
    for (const [projectId, projectData] of Object.entries(projects)) {
      const projectRepoUrl = (projectData as any).githubRepo || ""
      const normalizedProjectUrl = normalizeRepoUrl(projectRepoUrl)

      if (normalizedProjectUrl && normalizedProjectUrl === normalizedPayloadUrl) {
        targetProjectId = projectId
        break
      }
    }

    // Nếu không tìm thấy, thử tìm kiếm linh hoạt hơn
    if (!targetProjectId) {
      for (const [projectId, projectData] of Object.entries(projects)) {
        const projectRepoUrl = (projectData as any).githubRepo || ""

        // Kiểm tra nếu URL chứa tên repository
        if (projectRepoUrl && normalizedPayloadUrl.includes(projectRepoUrl.split("/").pop() || "")) {
          targetProjectId = projectId
          break
        }
      }
    }

    // Lấy webhook secret nếu có
    let webhookSecret = null
    if (targetProjectId) {
      const webhookRef = ref(database, "projectWebhook")
      const webhookSnapshot = await get(webhookRef)

      if (webhookSnapshot.exists()) {
        const webhooks = webhookSnapshot.val()

        for (const webhook of Object.values(webhooks)) {
          if ((webhook as any).projectId === targetProjectId) {
            webhookSecret = (webhook as any).webhookSecret || null
            break
          }
        }
      }
    }

    return { projectId: targetProjectId, webhookSecret }
  } catch (error) {
    console.error("Lỗi khi tìm project ID:", error)
    return { projectId: null, webhookSecret: null }
  }
}

export async function POST(request: NextRequest) {
  console.log("Nhận webhook GitHub")

  try {
    // Lấy loại sự kiện GitHub
    const githubEvent = request.headers.get("X-GitHub-Event")

    if (!githubEvent) {
      console.error("Thiếu header X-GitHub-Event")
      return NextResponse.json({ error: "Thiếu header X-GitHub-Event" }, { status: 400 })
    }

    console.log(`Loại sự kiện GitHub: ${githubEvent}`)

    // Lấy payload dưới dạng text để xác thực chữ ký
    const rawBody = await request.text()
    let payload: any

    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      console.error("Lỗi khi phân tích payload JSON:", error)
      return NextResponse.json({ error: "Payload JSON không hợp lệ" }, { status: 400 })
    }

    // Lấy URL repository để xác định project
    const repoUrl = payload.repository?.html_url

    if (!repoUrl) {
      console.error("Không tìm thấy URL repository trong payload")
      return NextResponse.json({ error: "Không tìm thấy URL repository trong payload" }, { status: 400 })
    }

    console.log(`URL repository: ${repoUrl}`)

    // Tìm project ID và webhook secret
    const { projectId, webhookSecret } = await findProjectIdByRepoUrl(repoUrl)

    if (!projectId) {
      console.log(`Không tìm thấy project cho repository URL: ${repoUrl}. Lưu sự kiện vào 'unassigned'`)
      // Tiếp tục xử lý với projectId = "unassigned"
    } else {
      console.log(`Tìm thấy project ID: ${projectId}`)
    }

    // Xác thực chữ ký nếu có webhook secret
    if (webhookSecret) {
      const signature = request.headers.get("X-Hub-Signature-256") || request.headers.get("X-Hub-Signature")

      if (signature) {
        const isValid = verifySignature(rawBody, signature, webhookSecret)

        if (!isValid) {
          console.warn(`Chữ ký webhook không hợp lệ cho project: ${projectId || "unassigned"}`)
          // Tiếp tục xử lý nhưng ghi log cảnh báo
        } else {
          console.log("Xác thực chữ ký webhook thành công")
        }
      } else {
        console.warn("Không có chữ ký webhook trong request")
      }
    }

    // Xử lý webhook dựa trên loại sự kiện
    const targetProjectId = projectId || "unassigned"

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
        // Xử lý sự kiện ping (được gửi khi webhook được cấu hình lần đầu)
        await handlePingEvent(targetProjectId, payload)
        break
      default:
        // Lưu các sự kiện khác để xử lý trong tương lai
        await storeGenericEvent(targetProjectId, githubEvent, payload)
    }

    console.log("Xử lý webhook GitHub thành công")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Lỗi khi xử lý webhook GitHub:", error)
    // Trả về thông tin lỗi chi tiết hơn để debug
    return NextResponse.json(
      {
        success: false,
        message: "Webhook đã nhận nhưng gặp lỗi trong quá trình xử lý",
        error: (error as Error).message,
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
    const ref = payload.ref || ""

    console.log(`Xử lý sự kiện push cho project ${projectId} với ${commits.length} commit`)

    // Lưu sự kiện push
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

    // Lưu từng commit vào cơ sở dữ liệu
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

    // Chỉ tạo thông báo nếu đây là một project thực
    if (projectId !== "unassigned") {
      // Tạo thông báo cho các thành viên dự án
      const projectRef = ref(database, `projects/${projectId}`)
      const projectSnapshot = await get(projectRef)

      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.val()
        const members = projectData.members || {}

        // Lấy tên repository cho thông báo
        const repoName = repository.name
        const branch = ref.replace("refs/heads/", "")
        const commitsCount = commits.length

        // Tạo thông báo cho mỗi thành viên dự án
        for (const [memberId, memberData] of Object.entries(members)) {
          const notificationRef = push(ref(database, "notifications"))

          await set(notificationRef, {
            userId: memberId,
            eventType: "WEBHOOK_EVENT",
            referenceId: projectId,
            message: `${payload.pusher.name} đã push ${commitsCount} commit${commitsCount === 1 ? "" : "s"} vào ${repoName}/${branch}`,
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

    console.log(`Xử lý sự kiện push thành công cho project ${projectId}`)
  } catch (error) {
    console.error("Lỗi khi xử lý sự kiện push:", error)
    // Không ném lỗi, chỉ ghi log để tránh webhook thất bại
  }
}

async function handlePullRequestEvent(projectId: string, payload: any) {
  try {
    const action = payload.action
    const pullRequest = payload.pull_request
    const repository = payload.repository || {}
    const sender = payload.sender || {}

    if (!pullRequest) {
      console.warn("Không có thông tin pull request trong payload")
      return
    }

    console.log(`Xử lý sự kiện pull request ${action} cho project ${projectId}`)

    // Lưu sự kiện pull request
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

    // Lưu pull request vào cơ sở dữ liệu
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

    // Chỉ tạo thông báo nếu đây là một project thực
    if (projectId !== "unassigned") {
      // Tạo thông báo cho các thành viên dự án
      const projectRef = ref(database, `projects/${projectId}`)
      const projectSnapshot = await get(projectRef)

      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.val()
        const members = projectData.members || {}

        // Lấy tên repository cho thông báo
        const repoName = repository.name

        // Tạo thông báo cho mỗi thành viên dự án
        for (const [memberId, memberData] of Object.entries(members)) {
          const notificationRef = push(ref(database, "notifications"))

          await set(notificationRef, {
            userId: memberId,
            eventType: "WEBHOOK_EVENT",
            referenceId: projectId,
            message: `${pullRequest.user.login} ${action} pull request #${pullRequest.number} trong ${repoName}: ${pullRequest.title}`,
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

    console.log(`Xử lý sự kiện pull request thành công cho project ${projectId}`)
  } catch (error) {
    console.error("Lỗi khi xử lý sự kiện pull request:", error)
    // Không ném lỗi, chỉ ghi log để tránh webhook thất bại
  }
}

async function handleIssuesEvent(projectId: string, payload: any) {
  try {
    const action = payload.action
    const issue = payload.issue
    const repository = payload.repository || {}
    const sender = payload.sender || {}

    if (!issue) {
      console.warn("Không có thông tin issue trong payload")
      return
    }

    console.log(`Xử lý sự kiện issue ${action} cho project ${projectId}`)

    // Lưu sự kiện issue
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

    // Lưu issue vào cơ sở dữ liệu
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

    // Chỉ tạo thông báo nếu đây là một project thực
    if (projectId !== "unassigned") {
      // Tạo thông báo cho các thành viên dự án
      const projectRef = ref(database, `projects/${projectId}`)
      const projectSnapshot = await get(projectRef)

      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.val()
        const members = projectData.members || {}

        // Lấy tên repository cho thông báo
        const repoName = repository.name

        // Tạo thông báo cho mỗi thành viên dự án
        for (const [memberId, memberData] of Object.entries(members)) {
          const notificationRef = push(ref(database, "notifications"))

          await set(notificationRef, {
            userId: memberId,
            eventType: "WEBHOOK_EVENT",
            referenceId: projectId,
            message: `${issue.user.login} ${action} issue #${issue.number} trong ${repoName}: ${issue.title}`,
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

    console.log(`Xử lý sự kiện issue thành công cho project ${projectId}`)
  } catch (error) {
    console.error("Lỗi khi xử lý sự kiện issue:", error)
    // Không ném lỗi, chỉ ghi log để tránh webhook thất bại
  }
}

async function handlePingEvent(projectId: string, payload: any) {
  try {
    const repository = payload.repository || {}
    const sender = payload.sender || {}
    const hook = payload.hook || {}

    console.log(`Xử lý sự kiện ping cho project ${projectId}`)

    // Lưu sự kiện ping
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

    // Chỉ tạo thông báo nếu đây là một project thực
    if (projectId !== "unassigned") {
      // Tạo thông báo cho các thành viên dự án
      const projectRef = ref(database, `projects/${projectId}`)
      const projectSnapshot = await get(projectRef)

      if (projectSnapshot.exists()) {
        const projectData = projectSnapshot.val()
        const members = projectData.members || {}

        // Lấy tên repository cho thông báo
        const repoName = repository.name

        // Tạo thông báo cho mỗi thành viên dự án
        for (const [memberId, memberData] of Object.entries(members)) {
          const notificationRef = push(ref(database, "notifications"))

          await set(notificationRef, {
            userId: memberId,
            eventType: "WEBHOOK_EVENT",
            referenceId: projectId,
            message: `Webhook GitHub cho ${repoName} đã được cấu hình thành công`,
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

    console.log(`Xử lý sự kiện ping thành công cho project ${projectId}`)
  } catch (error) {
    console.error("Lỗi khi xử lý sự kiện ping:", error)
    // Không ném lỗi, chỉ ghi log để tránh webhook thất bại
  }
}

async function storeGenericEvent(projectId: string, eventType: string, payload: any) {
  try {
    const repository = payload.repository || {}
    const sender = payload.sender || {}

    console.log(`Lưu sự kiện ${eventType} cho project ${projectId}`)

    // Lưu sự kiện chung
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

    console.log(`Lưu sự kiện ${eventType} thành công cho project ${projectId}`)
  } catch (error) {
    console.error(`Lỗi khi xử lý sự kiện ${eventType}:`, error)
    // Không ném lỗi, chỉ ghi log để tránh webhook thất bại
  }
}

