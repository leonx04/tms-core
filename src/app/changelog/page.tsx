"use client"


import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, Code, FileText, GitPullRequest, Sparkles } from 'lucide-react';

export default function ChangelogPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Changelog</h1>
          <p className="text-muted-foreground text-lg">
            Stay up to date with the latest improvements and updates to TMC.
          </p>
        </div>

        <div className="space-y-12">
          <ChangelogVersion 
            version="1.5.0" 
            date="June 15, 2023" 
            changes={[
              {
                type: "feature",
                title: "Custom Cloudinary Configuration",
                description: "Each project can now have its own Cloudinary configuration, allowing for better organization of media resources."
              },
              {
                type: "feature",
                title: "Enhanced GitHub Integration",
                description: "Improved GitHub integration with automatic commit linking and more detailed repository event tracking."
              },
              {
                type: "improvement",
                title: "Dashboard Performance",
                description: "Optimized dashboard loading times and reduced resource usage for better performance."
              },
              {
                type: "fix",
                title: "Task Assignment Bug",
                description: "Fixed an issue where task assignments weren't being properly saved in certain scenarios."
              }
            ]} 
          />

          <ChangelogVersion 
            version="1.4.0" 
            date="April 3, 2023" 
            changes={[
              {
                type: "feature",
                title: "Role-Based Access Control",
                description: "Implemented a comprehensive role-based access control system with custom permissions for each project."
              },
              {
                type: "feature",
                title: "Task Dependencies",
                description: "Added support for task dependencies, allowing you to specify which tasks must be completed before others can start."
              },
              {
                type: "improvement",
                title: "Notification System",
                description: "Redesigned notification system with more customization options and better delivery reliability."
              },
              {
                type: "fix",
                title: "Comment Formatting",
                description: "Fixed issues with markdown formatting in task comments."
              }
            ]} 
          />

          <ChangelogVersion 
            version="1.3.0" 
            date="February 10, 2023" 
            changes={[
              {
                type: "feature",
                title: "Webhook Support",
                description: "Added support for configurable webhooks to integrate with GitHub and other third-party services."
              },
              {
                type: "feature",
                title: "Task Templates",
                description: "Introduced task templates to quickly create standardized tasks for common workflows."
              },
              {
                type: "improvement",
                title: "UI Refresh",
                description: "Updated the user interface with a more modern design and improved accessibility."
              },
              {
                type: "fix",
                title: "Search Functionality",
                description: "Fixed issues with the global search feature not returning all relevant results."
              }
            ]} 
          />

          <ChangelogVersion 
            version="1.2.0" 
            date="December 5, 2022" 
            changes={[
              {
                type: "feature",
                title: "Dark Mode",
                description: "Added support for dark mode to reduce eye strain and save battery life."
              },
              {
                type: "feature",
                title: "Task Filtering",
                description: "Enhanced task filtering capabilities with saved filters and more filter options."
              },
              {
                type: "improvement",
                title: "Performance Optimizations",
                description: "Improved application performance and reduced loading times across all pages."
              },
              {
                type: "fix",
                title: "Date Picker",
                description: "Fixed issues with the date picker component in task creation and editing forms."
              }
            ]} 
          />

          <ChangelogVersion 
            version="1.1.0" 
            date="October 18, 2022" 
            changes={[
              {
                type: "feature",
                title: "Task Comments",
                description: "Added the ability to comment on tasks with rich text formatting and file attachments."
              },
              {
                type: "feature",
                title: "Email Notifications",
                description: "Implemented email notifications for important events like task assignments and approaching deadlines."
              },
              {
                type: "improvement",
                title: "Task Detail View",
                description: "Redesigned the task detail view for better information organization and usability."
              },
              {
                type: "fix",
                title: "Authentication Issues",
                description: "Fixed several issues related to user authentication and session management."
              }
            ]} 
          />

          <ChangelogVersion 
            version="1.0.0" 
            date="September 1, 2022" 
            changes={[
              {
                type: "feature",
                title: "Initial Release",
                description: "First public release of TMC with core task management functionality."
              },
              {
                type: "feature",
                title: "Project Management",
                description: "Create and manage projects with customizable roles and permissions."
              },
              {
                type: "feature",
                title: "Task Tracking",
                description: "Comprehensive task tracking with statuses, priorities, and assignments."
              },
              {
                type: "feature",
                title: "Basic GitHub Integration",
                description: "Simple GitHub integration for linking commits to tasks."
              }
            ]} 
          />
        </div>
      </div>
    </div>
  );
}

interface ChangelogVersionProps {
  version: string;
  date: string;
  changes: {
    type: "feature" | "improvement" | "fix" | "deprecation";
    title: string;
    description: string;
  }[];
}

function ChangelogVersion({ version, date, changes }: ChangelogVersionProps) {
  return (
    <div>
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold mr-3">v{version}</h2>
        <Badge variant="outline" className="text-sm font-normal">
          {date}
        </Badge>
      </div>

      <div className="space-y-4 pl-4 border-l-2 border-border">
        {changes.map((change, index) => (
          <div key={index} className="pl-4 relative">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
              {change.type === "feature" && <Sparkles className="h-2 w-2 text-primary" />}
              {change.type === "improvement" && <GitPullRequest className="h-2 w-2 text-primary" />}
              {change.type === "fix" && <Bug className="h-2 w-2 text-primary" />}
              {change.type === "deprecation" && <Code className="h-2 w-2 text-primary" />}
            </div>
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center">
                  {change.type === "feature" && (
                    <Badge className="mr-2 bg-blue-500">
                      <Sparkles className="h-3 w-3 mr-1" /> Feature
                    </Badge>
                  )}
                  {change.type === "improvement" && (
                    <Badge className="mr-2 bg-purple-500">
                      <GitPullRequest className="h-3 w-3 mr-1" /> Improvement
                    </Badge>
                  )}
                  {change.type === "fix" && (
                    <Badge className="mr-2 bg-red-500">
                      <Bug className="h-3 w-3 mr-1" /> Fix
                    </Badge>
                  )}
                  {change.type === "deprecation" && (
                    <Badge className="mr-2 bg-yellow-500">
                      <Code className="h-3 w-3 mr-1" /> Deprecation
                    </Badge>
                  )}
                  <CardTitle className="text-base font-medium">{change.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <p className="text-sm text-muted-foreground">{change.description}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
