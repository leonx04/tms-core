"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, Copy, ExternalLink, Info } from "lucide-react"
import { useState } from "react"

interface GitHubWebhookGuideProps {
  webhookUrl: string
  webhookSecret: string
  repoUrl?: string
}

export function GitHubWebhookGuide({ webhookUrl, webhookSecret, repoUrl }: GitHubWebhookGuideProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("setup")

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  // Extract repo owner and name from URL if available
  let repoOwner = ""
  let repoName = ""

  if (repoUrl) {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (match) {
      repoOwner = match[1]
      repoName = match[2]
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-xl">GitHub Webhook Integration Guide</CardTitle>
        <CardDescription>Learn how to set up and use GitHub webhooks with your project</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="events">Event Types</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Before you begin</AlertTitle>
              <AlertDescription>
                You'll need administrator access to the GitHub repository you want to connect.
              </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step1">
                <AccordionTrigger>Step 1: Navigate to your repository settings</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Go to your GitHub repository and click on "Settings" in the top navigation bar.
                  </p>
                  {repoUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`${repoUrl}/settings`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center"
                      >
                        Go to Repository Settings
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step2">
                <AccordionTrigger>Step 2: Select Webhooks</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    In the left sidebar, click on "Webhooks", then click the "Add webhook" button.
                  </p>
                  {repoUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`${repoUrl}/settings/hooks/new`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center"
                      >
                        Add Webhook
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step3">
                <AccordionTrigger>Step 3: Configure the webhook</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Payload URL</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted p-2 rounded text-xs flex-1 overflow-x-auto">{webhookUrl}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(webhookUrl, "url")}
                        className="shrink-0"
                      >
                        {copied === "url" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Content type</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted p-2 rounded text-xs">application/json</code>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Secret</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted p-2 rounded text-xs flex-1 overflow-x-auto">
                        {webhookSecret || "No secret configured"}
                      </code>
                      {webhookSecret && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(webhookSecret, "secret")}
                          className="shrink-0"
                        >
                          {copied === "secret" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The secret is used to secure your webhook. We strongly recommend setting one.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Which events would you like to trigger this webhook?</p>
                    <p className="text-sm text-muted-foreground">
                      You can select "Just the push event" for commits only, or "Send me everything" for all events. For
                      more granular control, select "Let me select individual events" and choose the events you need.
                    </p>
                    <p className="text-sm text-muted-foreground">Recommended events:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Push (for commits)</li>
                      <li>Pull requests</li>
                      <li>Issues</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step4">
                <AccordionTrigger>Step 4: Test the webhook</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    After saving the webhook, GitHub will send a ping event to verify the connection. You can check the
                    delivery status at the bottom of your webhook settings page.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    To test further, try creating a commit, opening an issue, or creating a pull request.
                  </p>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Webhook events</AlertTitle>
                    <AlertDescription>
                      After setting up the webhook, you can view all received events in the{" "}
                      <a href="./webhooks" className="text-primary hover:underline">
                        Webhooks page
                      </a>
                      .
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="events" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              GitHub webhooks can send notifications for various events. Here are the main event types supported by our
              integration:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-2">Push Events</h3>
                <p className="text-sm text-muted-foreground">
                  Triggered when commits are pushed to a repository branch. This is useful for tracking code changes and
                  automating workflows.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Event type: <code className="bg-muted px-1 py-0.5 rounded">push</code>
                </p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-2">Pull Request Events</h3>
                <p className="text-sm text-muted-foreground">
                  Triggered when pull requests are opened, closed, reopened, edited, assigned, or merged.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Event type: <code className="bg-muted px-1 py-0.5 rounded">pull_request</code>
                </p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-2">Issue Events</h3>
                <p className="text-sm text-muted-foreground">
                  Triggered when issues are opened, closed, reopened, edited, assigned, or labeled.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Event type: <code className="bg-muted px-1 py-0.5 rounded">issues</code>
                </p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-2">Release Events</h3>
                <p className="text-sm text-muted-foreground">
                  Triggered when a new release is published in your repository.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Event type: <code className="bg-muted px-1 py-0.5 rounded">release</code>
                </p>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Additional Events</AlertTitle>
              <AlertDescription>
                GitHub supports many more event types. For a complete list, see the{" "}
                <a
                  href="https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center"
                >
                  GitHub Webhooks documentation
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="troubleshooting" className="space-y-4 mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Common Issues</AlertTitle>
              <AlertDescription>
                If you're experiencing problems with your GitHub webhook, check these common issues.
              </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="issue1">
                <AccordionTrigger>Webhook is not receiving events</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Check the following:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Verify the webhook URL is correct and accessible from the internet</li>
                    <li>Check that the webhook is active in your GitHub repository settings</li>
                    <li>Review the recent deliveries in GitHub to see if there are any failed attempts</li>
                    <li>Ensure your server is not blocking incoming requests</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="issue2">
                <AccordionTrigger>Signature verification failed</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    If GitHub reports "Signature verification failed", check:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>The webhook secret in GitHub matches exactly what's configured in your project</li>
                    <li>The content type is set to "application/json"</li>
                    <li>Your server is correctly validating the signature</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="issue3">
                <AccordionTrigger>Events are not showing in the dashboard</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    If events are being sent but not appearing in your dashboard:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>
                      Verify that the repository URL in your project settings exactly matches your GitHub repository
                    </li>
                    <li>Check that you've selected the correct event types in GitHub</li>
                    <li>Try refreshing the webhooks page</li>
                    <li>Check your browser console for any errors</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="bg-muted p-4 rounded-lg mt-4">
              <h3 className="font-medium mb-2">Need more help?</h3>
              <p className="text-sm text-muted-foreground">
                If you're still experiencing issues, check the GitHub webhook logs in your repository settings. GitHub
                provides detailed information about delivery attempts and responses.
              </p>
              {repoUrl && (
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a
                    href={`${repoUrl}/settings/hooks`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    View Webhook Logs
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

