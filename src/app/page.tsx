"use client"

import Footer from "@/components/layout/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { ArrowRight, BarChart, CheckCircle, ChevronDown, GitBranch, Layers, Shield, Star, Users, Zap } from 'lucide-react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Redirect logged-in users to upgrade page when clicking on pricing links
  const handlePricingClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user) {
      e.preventDefault()
      router.push("/upgrade")
    }
  }

  // // Redirect logged-in users to dashboard instead of showing landing page
  // useEffect(() => {
  //   if (user) {
  //     router.push("/projects")
  //   }
  // }, [user, router])

  // // If user is logged in, don't show landing page
  // if (user) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  //     </div>
  //   )
  // }

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      

      <main className="flex-1">
        {/* Hero Section */}
        <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 dark:from-background dark:to-muted/10 py-20 md:py-32">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div 
              className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
              animate={{
                x: [0, 20, 0],
                y: [0, 30, 0],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
              animate={{
                x: [0, -30, 0],
                y: [0, 40, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="absolute bottom-0 left-1/3 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
              animate={{
                x: [0, 40, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium rounded-full">
                  <Star className="h-3.5 w-3.5 mr-1.5 text-primary" /> Trusted by over 5,000 development teams
                </Badge>
              </motion.div>
              
              <motion.h1 
                className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Streamline Your Software Development Workflow
              </motion.h1>
              
              <motion.p 
                className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                TMC is a comprehensive task management system designed for software development teams to track bugs,
                develop features, and manage documentation.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row justify-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link href="/upgrade">
                  <Button size="lg" className="w-full sm:w-auto rounded-full shadow-modern group">
                    Get Started Free 
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                    >
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </motion.div>
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full">
                    See How It Works
                  </Button>
                </Link>
              </motion.div>
            </div>

            <motion.div 
              className="mt-16 max-w-6xl mx-auto relative"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none rounded-xl"></div>
              <div className="relative bg-card border border-border/40 rounded-xl overflow-hidden shadow-modern-lg">
                {/* Dashboard Preview SVG */}
                <img src="/project-demo.jpg" alt="Project List" />
                
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Floating elements for visual interest */}
              <div className="absolute -top-6 -left-6 w-20 h-20 bg-primary/5 rounded-full blur-xl"></div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
            </motion.div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="py-12 bg-muted/30 dark:bg-muted/10 border-y border-border/20">
          <div className="container mx-auto px-4">
            <p className="text-center text-muted-foreground mb-8">
              Trusted by teams from leading companies
            </p>
            <motion.div 
              className="flex flex-wrap justify-center items-center gap-8 md:gap-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <motion.img 
                src="https://cdn.simpleicons.org/trello/0079BF" 
                alt="Trello" 
                className="h-8 w-auto" 
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img 
                src="https://cdn.simpleicons.org/asana/273347" 
                alt="Asana" 
                className="h-8 w-auto" 
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img 
                src="https://cdn.simpleicons.org/jira/0052CC" 
                alt="Jira" 
                className="h-8 w-auto" 
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img 
                src="https://cdn.simpleicons.org/clickup/7B68EE" 
                alt="ClickUp" 
                className="h-8 w-auto" 
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img 
                src="https://cdn.simpleicons.org/notion/000000" 
                alt="Notion" 
                className="h-8 w-auto" 
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img 
                src="https://cdn.simpleicons.org/github/181717" 
                alt="GitHub" 
                className="h-8 w-auto" 
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img 
                src="https://cdn.simpleicons.org/firebase/FFCA28" 
                alt="Firebase" 
                className="h-8 w-auto" 
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img 
                src="https://cdn.simpleicons.org/slack/4A154B" 
                alt="Slack" 
                className="h-8 w-auto" 
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img 
                src="https://cdn.simpleicons.org/linear/5E6AD2" 
                alt="Linear" 
                className="h-8 w-auto" 
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge variant="outline" className="mb-4 px-3 py-1 text-sm font-medium rounded-full">
                Key Features
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything you need to manage projects efficiently
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                TMC provides a comprehensive set of tools to help your team collaborate, track progress, and deliver
                high-quality software on time.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Users className="h-10 w-10 text-primary" />}
                title="Team Collaboration"
                description="Create and manage projects with customized roles (Admin, Developer, Tester, Document Writer) to ensure everyone has the right access."
                delay={0}
              />
              <FeatureCard
                icon={<GitBranch className="h-10 w-10 text-primary" />}
                title="GitHub Integration"
                description="Link commits manually and configure webhooks to track repository events in real-time, keeping your code and tasks in sync."
                delay={0.1}
              />
              <FeatureCard
                icon={<Layers className="h-10 w-10 text-primary" />}
                title="Task Tracking"
                description="Track bugs, develop features, and manage documentation for tasks in your projects with an intuitive interface."
                delay={0.2}
              />
              <FeatureCard
                icon={<Zap className="h-10 w-10 text-primary" />}
                title="Real-time Notifications"
                description="Receive email and in-browser notifications for important events to stay updated on project activities."
                delay={0.3}
              />
              <FeatureCard
                icon={<Shield className="h-10 w-10 text-primary" />}
                title="Secure Access Control"
                description="Control who can access what with fine-grained permissions and role-based access control for each project."
                delay={0.4}
              />
              <FeatureCard
                icon={<BarChart className="h-10 w-10 text-primary" />}
                title="Detailed Reporting"
                description="View statistics, progress charts, and project reports to make data-driven decisions and keep stakeholders informed."
                delay={0.5}
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-muted/30 dark:bg-muted/10">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge variant="outline" className="mb-4 px-3 py-1 text-sm font-medium rounded-full">
                How It Works
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple workflow, powerful results</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our intuitive workflow helps your team stay organized and focused on what matters most.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <WorkflowStep
                number="01"
                title="Create Projects"
                description="Set up projects, invite team members, and assign roles based on responsibilities."
                delay={0}
              />
              <WorkflowStep
                number="02"
                title="Manage Tasks"
                description="Create, assign, and track tasks with detailed information and real-time updates."
                delay={0.2}
              />
              <WorkflowStep
                number="03"
                title="Track Progress"
                description="Monitor project progress, review completed tasks, and generate reports for stakeholders."
                delay={0.4}
              />
            </div>
          </div>
        </section>

        {/* Product Screenshots Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge variant="outline" className="mb-4 px-3 py-1 text-sm font-medium rounded-full">
                Product Tour
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">See TMC in action</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Explore the key features of our task management system designed for software development teams.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <motion.div 
                className="bg-card border border-border rounded-xl overflow-hidden shadow-modern"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="p-4 border-b border-border bg-muted/50">
                  <h3 className="text-lg font-semibold">Cloudinary Config</h3>
                </div>
                <div className="p-0">
                <img src="/cloudinary.jpg" alt="Cloudinary Config" />
                </div>
              </motion.div>
              
              <motion.div 
                className="bg-card border border-border rounded-xl overflow-hidden shadow-modern"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="p-4 border-b border-border bg-muted/50">
                  <h3 className="text-lg font-semibold">Task Details</h3>
                </div>
                <div className="p-0">
                <img src="/task-detail.jpg" alt="Task Details" />
                </div>
              </motion.div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                className="bg-card border border-border rounded-xl overflow-hidden shadow-modern"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="p-4 border-b border-border bg-muted/50">
                  <h3 className="text-lg font-semibold">Team Management</h3>
                </div>
                <div className="p-0">
                <img src="/member-setting.jpg" alt="Team Management" />
                </div>
              </motion.div>
              
              <motion.div 
                className="bg-card border border-border rounded-xl overflow-hidden shadow-modern"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="p-4 border-b border-border bg-muted/50">
                  <h3 className="text-lg font-semibold">Webhook support</h3>
                </div>
                <div className="p-0">
                <img src="/webhook.jpg" alt="Webhook support" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge variant="outline" className="mb-4 px-3 py-1 text-sm font-medium rounded-full">
                Testimonials
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What our users say</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Don't just take our word for it. Here's what teams using TMC have to say.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <TestimonialCard
                quote="TMC has transformed how our team manages projects. The GitHub integration is seamless, and the task tracking is intuitive. Highly recommended!"
                author="Sarah Johnson"
                role="Engineering Manager"
                company="TechCorp"
                delay={0}
              />
              <TestimonialCard
                quote="We've tried many project management tools, but TMC stands out with its developer-focused features. Our productivity has increased by 30% since we started using it."
                author="Michael Chen"
                role="Lead Developer"
                company="InnovateSoft"
                delay={0.2}
              />
              <TestimonialCard
                quote="The role-based access control in TMC is exactly what we needed. It's easy to onboard new team members and ensure everyone has the right permissions."
                author="Emily Rodriguez"
                role="Product Owner"
                company="AgileWorks"
                delay={0.4}
              />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-muted/30 dark:bg-muted/10">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge variant="outline" className="mb-4 px-3 py-1 text-sm font-medium rounded-full">
                Pricing
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose the perfect plan for your team</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Flexible pricing options to fit teams of all sizes. All plans include core features.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <PricingCard
                title="Basic"
                price="Free"
                description="Perfect for individuals or small teams"
                features={["Up to 3 projects", "Basic task management", "Email notifications", "1 year validity"]}
                buttonText="Get Started"
                buttonLink="/upgrade"
                handleClick={handlePricingClick}
                delay={0}
              />
              <PricingCard
                title="Plus"
                price="$9.99"
                period="per month"
                description="Ideal for growing teams"
                features={[
                  "Up to 10 projects",
                  "Advanced task management",
                  "GitHub integration",
                  "Email & in-app notifications",
                  "1 year validity",
                ]}
                buttonText="Upgrade Now"
                buttonLink="/upgrade"
                handleClick={handlePricingClick}
                highlighted={true}
                delay={0.2}
              />
              <PricingCard
                title="Premium"
                price="$19.99"
                period="per month"
                description="For professional development teams"
                features={[
                  "Unlimited projects",
                  "Full task management suite",
                  "Advanced GitHub integration",
                  "Priority support",
                  "Custom Cloudinary configuration",
                  "1 year validity",
                ]}
                buttonText="Go Premium"
                buttonLink="/upgrade"
                handleClick={handlePricingClick}
                delay={0.4}
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge variant="outline" className="mb-4 px-3 py-1 text-sm font-medium rounded-full">
                FAQ
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about TMC and how it can help your team.
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto space-y-6">
              <FaqItem
                question="How does TMC differ from other project management tools?"
                answer="TMC is specifically designed for software development teams with features like GitHub integration, role-based access control, and specialized task tracking for bugs, features, and documentation. Unlike general project management tools, TMC understands the software development lifecycle."
              />
              <FaqItem
                question="Can I upgrade or downgrade my plan later?"
                answer="Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to additional features. When downgrading, your new limits will apply at the start of your next billing cycle."
              />
              <FaqItem
                question="Is there a limit to the number of team members?"
                answer="No, there's no limit to the number of team members you can add to your projects, regardless of your plan. The plan limits only apply to the number of projects you can create."
              />
              <FaqItem
                question="How does the GitHub integration work?"
                answer="TMC connects to your GitHub repositories through webhooks. You can link commits to tasks, track pull requests, and receive notifications about repository events directly in TMC. This keeps your code and tasks in sync."
              />
              <FaqItem
                question="Can I export my data from TMC?"
                answer="Yes, you can export your project data, tasks, and reports in various formats including CSV, JSON, and PDF. This makes it easy to create backups or share information with stakeholders."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to streamline your workflow?</h2>
              <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                Join thousands of teams who use TMC to manage their projects efficiently
              </p>
              <Link href="/upgrade">
                <Button size="lg" variant="secondary" className="rounded-full shadow-modern group">
                  Get Started Free 
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                  >
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </motion.div>
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function FeatureCard({ 
  title, 
  description, 
  icon, 
  delay = 0 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-100px" }}
    >
      <Card className="shadow-modern card-hover h-full border border-border/40 transition-all duration-300">
        <CardContent className="p-6">
          <motion.div 
            className="mb-4 bg-primary/5 w-16 h-16 rounded-lg flex items-center justify-center"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            {icon}
          </motion.div>
          <h3 className="text-xl font-semibold mb-3">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function WorkflowStep({ 
  number, 
  title, 
  description,
  delay = 0
}: { 
  number: string; 
  title: string; 
  description: string;
  delay?: number;
}) {
  return (
    <motion.div 
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-100px" }}
    >
      <motion.div 
        className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-4"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {number}
      </motion.div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </motion.div>
  )
}

function TestimonialCard({
  quote,
  author,
  role,
  company,
  delay = 0
}: { 
  quote: string; 
  author: string; 
  role: string; 
  company: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-100px" }}
    >
      <Card className="shadow-modern h-full border border-border/40">
        <CardContent className="p-6">
          <motion.div 
            className="mb-4 text-primary"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.667 18.667C10.667 20.133 9.46699 21.333 8.00033 21.333C6.53366 21.333 5.33366 20.133 5.33366 18.667C5.33366 17.2 6.53366 16 8.00033 16C9.46699 16 10.667 17.2 10.667 18.667ZM8.00033 10.667V13.333C11.68 13.333 14.667 16.32 14.667 20H17.3337C17.3337 14.84 13.1603 10.667 8.00033 10.667ZM8.00033 5.33301V7.99967C14.627 7.99967 20.0003 13.373 20.0003 19.9997H22.667C22.667 11.9063 16.0937 5.33301 8.00033 5.33301ZM24.0003 18.667C24.0003 20.133 22.8003 21.333 21.3337 21.333C19.867 21.333 18.667 20.133 18.667 18.667C18.667 17.2 19.867 16 21.3337 16C22.8003 16 24.0003 17.2 24.0003 18.667Z"
                fill="currentColor"
              />
            </svg>
          </motion.div>
          <p className="mb-6 italic">{quote}</p>
          <div>
            <p className="font-semibold">{author}</p>
            <p className="text-sm text-muted-foreground">
              {role}, {company}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PricingCard({
  title,
  price,
  period,
  description,
  features,
  buttonText,
  buttonLink,
  handleClick,
  highlighted = false,
  delay = 0
}: {
  title: string
  price: string
  period?: string
  description: string
  features: string[]
  buttonText: string
  buttonLink: string
  handleClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  highlighted?: boolean
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-100px" }}
      whileHover={{ y: -10 }}
    >
      <Card
        className={`h-full card-hover ${highlighted ? "relative border-primary/20 shadow-modern-lg" : "shadow-modern"}`}
      >
        {highlighted && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
            Popular
          </div>
        )}
        <CardContent className={`p-8 ${highlighted ? "pt-10" : ""}`}>
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <div className="mb-4">
            <span className="text-3xl font-bold">{price}</span>
            {period && <span className="text-muted-foreground ml-1">{period}</span>}
          </div>
          <p className="text-muted-foreground mb-6">{description}</p>
          <ul className="space-y-3 mb-6">
            {features.map((feature, index) => (
              <motion.li 
                key={index} 
                className="flex items-start"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: delay + index * 0.1 }}
                viewport={{ once: true }}
              >
                <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0" />
                <span>{feature}</span>
              </motion.li>
            ))}
          </ul>
          <Link href={buttonLink} onClick={handleClick}>
            <Button
              variant={highlighted ? "default" : "outline"}
              className={`w-full rounded-full ${highlighted ? "shadow-md" : ""}`}
            >
              {buttonText}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <motion.div 
      className="border border-border/40 rounded-lg overflow-hidden shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <details className="group">
        <summary className="flex justify-between items-center p-6 cursor-pointer list-none">
          <h3 className="text-lg font-medium">{question}</h3>
          <motion.div 
            className="transition-transform duration-300 group-open:rotate-180"
            whileTap={{ scale: 0.9 }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </summary>
        <motion.div 
          className="px-6 pb-6 pt-0"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <p className="text-muted-foreground">{answer}</p>
        </motion.div>
      </details>
    </motion.div>
  )
}
