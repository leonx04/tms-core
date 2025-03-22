"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormState({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    }, 1500);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Contact Us
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have questions or feedback? We'd love to hear from you. Get in touch
            with our team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <ContactCard
            icon={<Mail className="h-6 w-6 text-primary" />}
            title="Email Us"
            description="Our friendly team is here to help."
            contact="jungnguyen2108@gmail.com"
            link="mailto:jungnguyen2108@gmail.com"
          />

          <ContactCard
            icon={<MapPin className="h-6 w-6 text-primary" />}
            title="Office"
            description="Come say hello at our office."
            contact="Vinh, Nghe An, Viet Nam"
            link="https://maps.google.com"
          />

          <ContactCard
            icon={<Phone className="h-6 w-6 text-primary" />}
            title="Phone"
            description="Mon-Fri from 8am to 5pm."
            contact="+84 0377903208"
            link="tel:+840377903208"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Send Us a Message</h2>
            <p className="text-muted-foreground mb-6">
              Fill out the form below and we'll get back to you as soon as
              possible.
            </p>

            {isSubmitted ? (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <MessageSquare className="h-12 w-12 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      Message Received!
                    </h3>
                    <p className="text-muted-foreground">
                      Thank you for reaching out. We'll get back to you shortly.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => setIsSubmitted(false)}
                    >
                      Send Another Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium mb-1"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formState.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-md border border-input"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formState.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-md border border-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium mb-1"
                  >
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formState.subject}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md border border-input"
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing Question">Billing Question</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Partnership">Partnership</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium mb-1"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formState.message}
                    onChange={handleChange}
                    rows={5}
                    className="w-full px-3 py-2 rounded-md border border-input"
                    required
                  ></textarea>
                </div>

                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <FaqItem
                question="How do I get started with TMC?"
                answer="Getting started is easy! Simply sign up for an account, create your first project, and invite your team members. Our intuitive interface will guide you through the process."
              />

              <FaqItem
                question="What payment methods do you accept?"
                answer="We accept all major credit cards (Visa, Mastercard, American Express) as well as PayPal. For enterprise plans, we also offer invoice payment options."
              />

              <FaqItem
                question="Can I upgrade or downgrade my plan later?"
                answer="Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to additional features. When downgrading, your new limits will apply at the start of your next billing cycle."
              />

              <FaqItem
                question="How does the GitHub integration work?"
                answer="Our GitHub integration allows you to link commits to tasks, track pull requests, and receive notifications about repository events directly in TMC. This keeps your code and tasks in sync."
              />

              <FaqItem
                question="Is there a limit to the number of team members?"
                answer="No, there's no limit to the number of team members you can add to your projects, regardless of your plan. The plan limits only apply to the number of projects you can create."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContactCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  contact: string;
  link: string;
}

function ContactCard({
  icon,
  title,
  description,
  contact,
  link,
}: ContactCardProps) {
  return (
    <Card className="shadow-modern h-full">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="mb-4 bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center">
          {icon}
        </div>
        <CardTitle className="text-lg mb-2">{title}</CardTitle>
        <CardDescription className="mb-4">{description}</CardDescription>
        <a
          href={link}
          className="text-primary hover:underline font-medium"
          target={link.startsWith("http") ? "_blank" : undefined}
          rel={link.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {contact}
        </a>
      </CardContent>
    </Card>
  );
}

interface FaqItemProps {
  question: string;
  answer: string;
}

function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
          <h3 className="font-medium flex items-center">{question}</h3>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-semibold">{question}</h4>
          <p className="text-sm text-muted-foreground">{answer}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
