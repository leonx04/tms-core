
"use client"

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar, Clock, User } from 'lucide-react';
import Image from "next/image";
import Link from "next/link";

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">TMC Blog</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Insights, tips, and updates about task management, software development, and team productivity.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured Post</h2>
          <FeaturedBlogPost 
            title="10 Ways to Improve Your Team's Development Workflow"
            excerpt="Discover practical strategies to streamline your development process, reduce bottlenecks, and boost your team's productivity with TMC."
            image="/placeholder.svg?height=600&width=1200"
            date="June 15, 2023"
            author="Sarah Johnson"
            readTime="8 min read"
            slug="improve-development-workflow"
            categories={["Productivity", "Team Management"]}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Latest Posts</h2>
            <Link 
              href="/blog/archive" 
              className="text-sm text-primary hover:underline flex items-center"
            >
              View all posts <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BlogPostCard 
              title="Getting Started with GitHub Integration in TMC"
              excerpt="Learn how to set up and make the most of TMC's GitHub integration features for seamless development tracking."
              image="/placeholder.svg?height=400&width=600"
              date="June 1, 2023"
              author="Michael Chen"
              readTime="5 min read"
              slug="github-integration-guide"
              categories={["Tutorial", "GitHub"]}
            />
            
            <BlogPostCard 
              title="Role-Based Access Control: A Complete Guide"
              excerpt="Understand how to implement effective role-based access control in your projects to enhance security and workflow."
              image="/placeholder.svg?height=400&width=600"
              date="May 15, 2023"
              author="Emily Rodriguez"
              readTime="6 min read"
              slug="role-based-access-control"
              categories={["Security", "Best Practices"]}
            />
            
            <BlogPostCard 
              title="Optimizing Your Task Management Workflow"
              excerpt="Discover strategies to streamline your task management process and boost team productivity with TMC."
              image="/placeholder.svg?height=400&width=600"
              date="May 1, 2023"
              author="David Kim"
              readTime="7 min read"
              slug="optimizing-task-management"
              categories={["Productivity", "Workflow"]}
            />
          </div>
        </div>

        <div className="mt-16 bg-muted/30 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Subscribe to Our Newsletter</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Stay up to date with the latest articles, tutorials, and updates from the TMC team.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1 px-4 py-2 rounded-md border border-input"
            />
            <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeaturedBlogPostProps {
  title: string;
  excerpt: string;
  image: string;
  date: string;
  author: string;
  readTime: string;
  slug: string;
  categories: string[];
}

function FeaturedBlogPost({ title, excerpt, image, date, author, readTime, slug, categories }: FeaturedBlogPostProps) {
  return (
    <Card className="shadow-modern overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="relative h-64 md:h-auto">
          <Image 
            src={image || "/placeholder.svg"} 
            alt={title} 
            fill
            className="object-cover"
          />
        </div>
        <div className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>
            <Link href={`/blog/${slug}`}>
              <CardTitle className="text-2xl mb-3 hover:text-primary transition-colors">
                {title}
              </CardTitle>
            </Link>
            <p className="text-muted-foreground mb-4">{excerpt}</p>
          </div>
          <div>
            <div className="flex items-center text-sm text-muted-foreground mb-3">
              <User className="h-4 w-4 mr-1" />
              <span className="mr-4">{author}</span>
              <Calendar className="h-4 w-4 mr-1" />
              <span className="mr-4">{date}</span>
              <Clock className="h-4 w-4 mr-1" />
              <span>{readTime}</span>
            </div>
            <Link 
              href={`/blog/${slug}`} 
              className="text-primary hover:underline flex items-center text-sm"
            >
              Read more <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface BlogPostCardProps {
  title: string;
  excerpt: string;
  image: string;
  date: string;
  author: string;
  readTime: string;
  slug: string;
  categories: string[];
}

function BlogPostCard({ title, excerpt, image, date, author, readTime, slug, categories }: BlogPostCardProps) {
  return (
    <Card className="shadow-modern overflow-hidden h-full flex flex-col">
      <div className="relative h-48">
        <Image 
          src={image || "/tmc.png"} 
          alt={title} 
          fill
          className="object-cover"
        />
      </div>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {categories.map((category) => (
            <Badge key={category} variant="outline" className="text-xs">
              {category}
            </Badge>
          ))}
        </div>
        <Link href={`/blog/${slug}`}>
          <CardTitle className="text-xl hover:text-primary transition-colors">
            {title}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <p className="text-sm text-muted-foreground">{excerpt}</p>
      </CardContent>
      <CardFooter className="pt-0 flex flex-col items-start">
        <div className="flex items-center text-xs text-muted-foreground mb-2 w-full">
          <User className="h-3 w-3 mr-1" />
          <span className="mr-3">{author}</span>
          <Calendar className="h-3 w-3 mr-1" />
          <span className="mr-3">{date}</span>
          <Clock className="h-3 w-3 mr-1" />
          <span>{readTime}</span>
        </div>
        <Link 
          href={`/blog/${slug}`} 
          className="text-primary hover:underline flex items-center text-sm"
        >
          Read more <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
