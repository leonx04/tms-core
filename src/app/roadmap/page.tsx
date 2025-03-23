"use client"


import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, CheckCircle, Clock, Code, FileText, GitPullRequest, Sparkles } from 'lucide-react';
import Link from "next/link";

export default function RoadmapPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Product Roadmap</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our vision for the future of TMC and what we're working on to make task management even better for software development teams.
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="inprogress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            <RoadmapItem
              title="Advanced Analytics Dashboard"
              description="Comprehensive analytics with custom reports, burndown charts, and team performance metrics."
              quarter="Q3 2023"
              status="planned"
              tags={["Analytics", "Dashboard", "Reports"]}
            />
            <RoadmapItem
              title="Mobile Applications"
              description="Native mobile apps for iOS and Android to manage tasks on the go."
              quarter="Q4 2023"
              status="planned"
              tags={["Mobile", "iOS", "Android"]}
            />
            <RoadmapItem
              title="AI-Powered Task Suggestions"
              description="Smart task recommendations and automation based on your team's workflow patterns."
              quarter="Q1 2024"
              status="planned"
              tags={["AI", "Automation", "Productivity"]}
            />
          </TabsContent>

          <TabsContent value="inprogress" className="space-y-6">
            <RoadmapItem
              title="Enhanced GitHub Integration"
              description="Deeper GitHub integration with automatic PR linking, branch management, and code review workflows."
              quarter="Q2 2023"
              status="in-progress"
              tags={["GitHub", "Integration", "Code Review"]}
            />
            <RoadmapItem
              title="Team Collaboration Features"
              description="Real-time collaboration tools including shared notes, task comments with rich formatting, and @mentions."
              quarter="Q2 2023"
              status="in-progress"
              tags={["Collaboration", "Real-time", "Comments"]}
            />
          </TabsContent>

          <TabsContent value="completed" className="space-y-6">
            <RoadmapItem
              title="Custom Cloudinary Configuration"
              description="Project-specific Cloudinary configuration for better media resource management."
              quarter="Q1 2023"
              status="completed"
              tags={["Cloudinary", "Media", "Configuration"]}
            />
            <RoadmapItem
              title="Role-Based Access Control"
              description="Granular permissions system with custom roles for each project."
              quarter="Q1 2023"
              status="completed"
              tags={["Security", "Permissions", "Roles"]}
            />
            <RoadmapItem
              title="Webhook Support"
              description="Configurable webhooks for GitHub events and third-party integrations."
              quarter="Q4 2022"
              status="completed"
              tags={["Webhooks", "Integration", "Automation"]}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Have a feature request?</h2>
          <p className="text-muted-foreground mb-6">
            We're always looking to improve TMC. If you have a feature idea or suggestion, we'd love to hear from you!
          </p>
          <Link 
            href="/contact" 
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Submit a feature request <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface RoadmapItemProps {
  title: string;
  description: string;
  quarter: string;
  status: "planned" | "in-progress" | "completed";
  tags: string[];
}

function RoadmapItem({ title, description, quarter, status, tags }: RoadmapItemProps) {
  return (
    <Card className="shadow-modern">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{title}</CardTitle>
          <div className="flex items-center">
            <Badge 
              variant={
                status === "completed" ? "default" : 
                status === "in-progress" ? "secondary" : "outline"
              }
              className="ml-2"
            >
              {status === "completed" && <CheckCircle className="mr-1 h-3 w-3" />}
              {status === "in-progress" && <Clock className="mr-1 h-3 w-3" />}
              {status === "planned" && <Sparkles className="mr-1 h-3 w-3" />}
              {status === "completed" ? "Completed" : 
               status === "in-progress" ? "In Progress" : "Planned"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{description}</p>
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">{quarter}</span>
        </div>
      </CardContent>
    </Card>
  );
}
