import nodemailer from "nodemailer"

type EmailConfig = {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
}

// Default email configuration
const defaultConfig: EmailConfig = {
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
  from: process.env.EMAIL_FROM || "noreply@tms.com",
}

// Create a transporter with the configuration
export const createTransporter = (config: Partial<EmailConfig> = {}) => {
  const emailConfig = { ...defaultConfig, ...config }

  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
  })
}

// Send an email
export const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string,
  config: Partial<EmailConfig> = {},
) => {
  const emailConfig = { ...defaultConfig, ...config }
  const transporter = createTransporter(emailConfig)

  const info = await transporter.sendMail({
    from: emailConfig.from,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
  })

  return info
}

// Email templates
export const emailTemplates = {
  resetPassword: (resetLink: string, userName = "there") => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
        }
        .button {
          display: inline-block;
          background-color: #0070f3;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">TMS</div>
        </div>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password for your TMS account. If you didn't make this request, you can safely ignore this email.</p>
        <p>To reset your password, click the button below:</p>
        <p style="text-align: center;">
          <a href="${resetLink}" class="button">Reset Password</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${resetLink}</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>Thanks,<br>The TMS Team</p>
        <div class="footer">
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  projectInvitation: (projectName: string, inviterName: string, inviteLink: string, userName = "there") => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>You've Been Invited to a Project</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
        }
        .button {
          display: inline-block;
          background-color: #0070f3;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">TMS</div>
        </div>
        <p>Hi ${userName},</p>
        <p>${inviterName} has invited you to join the project "${projectName}" on TMS.</p>
        <p>To accept this invitation and join the project, click the button below:</p>
        <p style="text-align: center;">
          <a href="${inviteLink}" class="button">Join Project</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${inviteLink}</p>
        <p>Thanks,<br>The TMS Team</p>
        <div class="footer">
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  taskAssignment: (
    taskTitle: string,
    projectName: string,
    assignerName: string,
    taskLink: string,
    userName = "there",
  ) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Task Assignment</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
        }
        .button {
          display: inline-block;
          background-color: #0070f3;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">TMS</div>
        </div>
        <p>Hi ${userName},</p>
        <p>${assignerName} has assigned you a new task in the project "${projectName}".</p>
        <p><strong>Task:</strong> ${taskTitle}</p>
        <p>To view the task details and get started, click the button below:</p>
        <p style="text-align: center;">
          <a href="${taskLink}" class="button">View Task</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${taskLink}</p>
        <p>Thanks,<br>The TMS Team</p>
        <div class="footer">
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  taskUpdate: (
    taskTitle: string,
    projectName: string,
    updaterName: string,
    updateType: string,
    taskLink: string,
    userName = "there",
  ) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Task Update</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
        }
        .button {
          display: inline-block;
          background-color: #0070f3;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">TMS</div>
        </div>
        <p>Hi ${userName},</p>
        <p>There has been an update to a task in the project "${projectName}".</p>
        <p><strong>Task:</strong> ${taskTitle}</p>
        <p><strong>Update:</strong> ${updaterName} ${updateType}</p>
        <p>To view the task details, click the button below:</p>
        <p style="text-align: center;">
          <a href="${taskLink}" class="button">View Task</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${taskLink}</p>
        <p>Thanks,<br>The TMS Team</p>
        <div class="footer">
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `,
}

export default {
  createTransporter,
  sendEmail,
  emailTemplates,
}

