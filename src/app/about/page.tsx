
"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Code, GitBranch, Layers, Shield, Users, Zap, Github, Linkedin, Twitter, Mail, Globe } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">About TMC</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A comprehensive task management system designed for software development teams to track bugs, develop
            features, and manage documentation with ease.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div>
            <h2 className="text-2xl font-bold mb-4">The Vision</h2>
            <p className="text-muted-foreground mb-6">
              TMC was born from my personal experience as a developer facing the challenges of project management. I
              created this platform to simplify task management for software development teams, believing that great
              software is built when developers can focus on what matters most: writing code and solving problems, not
              managing their workflow.
            </p>
            <p className="text-muted-foreground">
              This platform is designed to integrate seamlessly with the tools developers already use, providing a
              centralized hub for tracking tasks, bugs, and documentation throughout the development lifecycle.
            </p>
          </div>
          <div className="relative rounded-lg overflow-hidden shadow-modern h-64 md:h-auto">
            <Image
              src="/tmc.png?height=400&width=600"
              alt="TMC Dashboard"
              width={600}
              height={400}
              className="object-cover w-full h-full"
            />
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Key Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Users className="h-8 w-8 text-primary" />}
              title="Team Collaboration"
              description="Create and manage projects with customized roles to ensure everyone has the right access."
            />
            <FeatureCard
              icon={<GitBranch className="h-8 w-8 text-primary" />}
              title="GitHub Integration"
              description="Link commits and track repository events in real-time, keeping your code and tasks in sync."
            />
            <FeatureCard
              icon={<Layers className="h-8 w-8 text-primary" />}
              title="Task Tracking"
              description="Track bugs, develop features, and manage documentation with an intuitive interface."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-primary" />}
              title="Real-time Notifications"
              description="Receive email and in-browser notifications for important events to stay updated."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-primary" />}
              title="Secure Access Control"
              description="Control who can access what with fine-grained permissions and role-based access control."
            />
            <FeatureCard
              icon={<Code className="h-8 w-8 text-primary" />}
              title="Custom Cloudinary Config"
              description="Configure Cloudinary settings per project for better media resource management."
            />
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Meet the Developer</h2>
          <div className="flex justify-center">
            <div className="max-w-md">
              <div className="bg-card border border-border/40 rounded-xl p-8 shadow-modern text-center">
                <div className="mb-6 rounded-full overflow-hidden w-40 h-40 mx-auto shadow-modern">
                  <Image
                    src="https://avatars.githubusercontent.com/u/111296639?v=4"
                    alt="Nguyen Xuan Dung"
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nguyen Xuan Dung</h3>
                <div className="flex justify-center gap-2 mb-4">
                  <Badge variant="outline" className="mb-2">
                    Full-Stack Developer
                  </Badge>
                  <Badge variant="outline" className="mb-2">
                    Project Creator
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-6">
                  Passionate about building tools that empower developers to create amazing software. I designed and
                  developed TMC from the ground up to solve real-world problems I've encountered in software development
                  teams.
                </p>
                <div className="flex justify-center space-x-4">
                  <a
                    href="https://github.com/leonx04"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a
                    href="mailto:contact@example.com"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Email"
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                  <a
                    href="https://example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Website"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-muted/30 rounded-lg p-8">
            <h2 className="text-xl font-bold mb-4">Project Journey</h2>
            <p className="text-muted-foreground mb-4">
              TMC started as a personal project to address the challenges I faced while managing development tasks. What
              began as a simple tool has evolved into a comprehensive platform designed to streamline the entire
              development workflow.
            </p>
            <p className="text-muted-foreground">
              This project is continuously improving based on user feedback and my own experiences as a developer. I'm
              committed to making TMC the best task management solution for software development teams of all sizes.
            </p>
          </div>

          <div className="bg-muted/30 rounded-lg p-8">
            <h2 className="text-xl font-bold mb-4">Open Source Contributions</h2>
            <p className="text-muted-foreground mb-4">
              While TMC is my primary project, I'm also passionate about contributing to the open source community. I
              believe in the power of collaboration and shared knowledge to advance software development.
            </p>
            <p className="text-muted-foreground mb-4">
              If you're interested in collaborating or have suggestions for TMC, I'd love to hear from you!
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get in Touch
            </Link>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-lg p-8 text-center shadow-modern">
          <h2 className="text-2xl font-bold mb-4">Support This Project</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            TMC is a passion project developed and maintained by a single developer. If you find it useful, consider
            supporting its continued development and improvement.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/upgrade"
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Upgrade to Premium
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
            >
              Send Feedback
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="shadow-modern h-full">
      <CardContent className="p-6">
        <div className="mb-4 bg-primary/5 w-16 h-16 rounded-lg flex items-center justify-center">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

