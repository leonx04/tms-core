import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Building, Clock, Globe, MapPin } from 'lucide-react';
import Image from "next/image";
import Link from "next/link";

export default function CareersPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Join Our Team</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Help us build the future of task management for software development teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div>
            <h2 className="text-2xl font-bold mb-4">Why Work With Us</h2>
            <p className="text-muted-foreground mb-6">
              At TMC, we're passionate about creating tools that make developers' lives easier. We're a small but growing team of engineers, designers, and product specialists who are committed to building the best task management system for software development teams.
            </p>
            <p className="text-muted-foreground mb-6">
              We believe in a flexible work environment, continuous learning, and a healthy work-life balance. Our team is distributed across the globe, and we embrace remote work as a core part of our culture.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Remote-First</h3>
                <p className="text-sm text-muted-foreground">Work from anywhere in the world with flexible hours.</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Competitive Pay</h3>
                <p className="text-sm text-muted-foreground">Salary packages that recognize your skills and experience.</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Learning Budget</h3>
                <p className="text-sm text-muted-foreground">Annual budget for courses, books, and conferences.</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Health Benefits</h3>
                <p className="text-sm text-muted-foreground">Comprehensive health insurance for you and your family.</p>
              </div>
            </div>
          </div>
          <div className="relative rounded-lg overflow-hidden shadow-modern h-64 md:h-auto">
            <Image 
              src="/tmc.png?height=600&width=800" 
              alt="Team working together" 
              width={800} 
              height={600}
              className="object-cover w-full h-full"
            />
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Open Positions</h2>
          
          <Tabs defaultValue="engineering" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="engineering">Engineering</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="product">Product</TabsTrigger>
            </TabsList>

            <TabsContent value="engineering" className="space-y-6">
              <JobCard 
                title="Senior Frontend Engineer"
                department="Engineering"
                location="Remote"
                type="Full-time"
                description="We're looking for a Senior Frontend Engineer to help us build and improve our React-based web application. You'll work closely with our design and product teams to create intuitive and performant user interfaces."
                requirements={[
                  "5+ years of experience with React and modern JavaScript",
                  "Experience with TypeScript and Next.js",
                  "Strong understanding of web performance optimization",
                  "Experience with responsive design and accessibility",
                  "Excellent communication skills and ability to work in a remote team"
                ]}
                slug="senior-frontend-engineer"
              />
              
              <JobCard 
                title="Backend Engineer"
                department="Engineering"
                location="Remote"
                type="Full-time"
                description="We're seeking a Backend Engineer to help us build and scale our API and server infrastructure. You'll work on designing and implementing new features, optimizing performance, and ensuring the reliability of our services."
                requirements={[
                  "3+ years of experience with Node.js and RESTful APIs",
                  "Experience with database design and optimization",
                  "Familiarity with cloud services (AWS, GCP, or Azure)",
                  "Understanding of security best practices",
                  "Strong problem-solving skills and attention to detail"
                ]}
                slug="backend-engineer"
              />
            </TabsContent>

            <TabsContent value="design" className="space-y-6">
              <JobCard 
                title="UI/UX Designer"
                department="Design"
                location="Remote"
                type="Full-time"
                description="We're looking for a UI/UX Designer to help us create beautiful and intuitive user experiences. You'll work closely with our product and engineering teams to design and iterate on features that delight our users."
                requirements={[
                  "3+ years of experience in UI/UX design for web applications",
                  "Proficiency with design tools like Figma or Sketch",
                  "Experience with design systems and component libraries",
                  "Understanding of user research and usability testing",
                  "Ability to communicate design decisions effectively"
                ]}
                slug="ui-ux-designer"
              />
            </TabsContent>

            <TabsContent value="product" className="space-y-6">
              <JobCard 
                title="Product Manager"
                department="Product"
                location="Remote"
                type="Full-time"
                description="We're seeking a Product Manager to help us define and execute our product strategy. You'll work closely with our engineering, design, and customer success teams to identify opportunities, prioritize features, and deliver value to our users."
                requirements={[
                  "3+ years of experience in product management for B2B SaaS products",
                  "Experience with agile development methodologies",
                  "Strong analytical skills and data-driven decision making",
                  "Excellent communication and stakeholder management skills",
                  "Understanding of software development processes and tools"
                ]}
                slug="product-manager"
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Don't See a Perfect Fit?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            We're always interested in connecting with talented individuals who are passionate about our mission. Send us your resume and let us know how you can contribute to our team.
          </p>
          <Link 
            href="/contact" 
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get in Touch <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface JobCardProps {
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  slug: string;
}

function JobCard({ title, department, location, type, description, requirements, slug }: JobCardProps) {
  return (
    <Card className="shadow-modern">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
          <CardTitle className="text-xl">{title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center">
              <Building className="h-3 w-3 mr-1" /> {department}
            </Badge>
            <Badge variant="outline" className="flex items-center">
              <MapPin className="h-3 w-3 mr-1" /> {location}
            </Badge>
            <Badge variant="outline" className="flex items-center">
              <Clock className="h-3 w-3 mr-1" /> {type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{description}</p>
        <h4 className="font-semibold mb-2">Requirements:</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground mb-4">
          {requirements.map((requirement, index) => (
            <li key={index}>{requirement}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Link 
          href={`/careers/${slug}`} 
          className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Apply Now <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
