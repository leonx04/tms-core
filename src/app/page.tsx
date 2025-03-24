"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Award,
  BarChart,
  CheckCircle,
  ChevronDown,
  Code,
  GitBranch,
  Layers,
  MessageSquare,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Users,
  Zap,
  MonitorPlay,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import "swiper/css";
import "swiper/css/effect-cards";
import "swiper/css/effect-coverflow";
import "swiper/css/navigation";
import "swiper/css/pagination";
import {
  Autoplay,
  EffectCoverflow,
  Navigation,
  Pagination,
} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

// Animated counter component
const AnimatedCounter = ({
  value,
  duration = 2,
}: {
  value: number;
  duration?: number;
}) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

      const currentCount = Math.floor(progress * value);
      if (currentCount !== countRef.current) {
        countRef.current = currentCount;
        setCount(currentCount);
      }

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateCount);
      } else {
        setCount(value);
      }
    };

    animationFrame = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
};

// Testimonial data
const testimonials = [
  {
    quote:
      "TMC has transformed how our team manages projects. The GitHub integration is seamless, and the task tracking is intuitive. Our team's productivity increased by 35% in just two months!",
    author: "Sarah Johnson",
    role: "Engineering Manager",
    company: "TechCorp",
    avatar: "/avatars/avatar-1.jpg",
    rating: 5,
  },
  {
    quote:
      "We've tried many project management tools, but TMC stands out with its developer-focused features. The role-based access control is exactly what we needed for our growing team.",
    author: "Michael Chen",
    role: "Lead Developer",
    company: "InnovateSoft",
    avatar: "/avatars/avatar-2.jpg",
    rating: 5,
  },
  {
    quote:
      "The integration with GitHub has streamlined our workflow significantly. Being able to link commits directly to tasks has improved our code review process and documentation.",
    author: "Emily Rodriguez",
    role: "Product Owner",
    company: "AgileWorks",
    avatar: "/avatars/avatar-3.jpg",
    rating: 4,
  },
  {
    quote:
      "TMC's task tracking capabilities are unmatched. The ability to create parent-child task relationships helps us break down complex features into manageable pieces.",
    author: "David Kim",
    role: "CTO",
    company: "StartupLabs",
    avatar: "/avatars/avatar-4.jpg",
    rating: 5,
  },
  {
    quote:
      "The reporting features in TMC give us valuable insights into our development process. We can easily identify bottlenecks and optimize our workflow.",
    author: "Jessica Martinez",
    role: "Scrum Master",
    company: "DevOps Solutions",
    avatar: "/avatars/avatar-5.jpg",
    rating: 5,
  },
  {
    quote:
      "Switching to TMC was the best decision we made this year. The onboarding was smooth, and our team adapted quickly to the intuitive interface.",
    author: "Robert Wilson",
    role: "Development Director",
    company: "Enterprise Systems",
    avatar: "/avatars/avatar-6.jpg",
    rating: 4,
  },
];

// Global styles for custom scrollbar and other utilities
const globalStyles = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  @media (max-width: 640px) {
    .swiper-button-next,
    .swiper-button-prev {
      display: none !important;
    }
  }
  
  .testimonial-swiper .swiper-slide {
    width: 100%;
    max-width: 500px;
  }
  
  @media (max-width: 768px) {
    .testimonial-swiper .swiper-slide {
      max-width: 100%;
    }
  }
`;

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [windowWidth, setWindowWidth] = useState(0);

  // Parallax scroll effect references
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set initial width
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Hide scroll hint after user has scrolled
      if (window.scrollY > 100) {
        setShowScrollHint(false);
      }

      // Check if stats section is visible
      if (statsRef.current) {
        const rect = statsRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setStatsVisible(true);
        }
      }

      // Determine active section for navigation highlighting
      const sections = document.querySelectorAll("section[id]");
      let currentSection = "hero";

      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop - 100;
        const sectionHeight = (section as HTMLElement).offsetHeight;
        if (
          window.scrollY >= sectionTop &&
          window.scrollY < sectionTop + sectionHeight
        ) {
          currentSection = section.getAttribute("id") || "hero";
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Redirect logged-in users to upgrade page when clicking on pricing links
  const handlePricingClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user) {
      e.preventDefault();
      router.push("/upgrade");
    }
  };

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 80,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    // Add global styles to head
    const styleElement = document.createElement("style");
    styleElement.innerHTML = globalStyles;
    document.head.appendChild(styleElement);

    return () => {
      // Cleanup when component unmounts
      document.head.removeChild(styleElement);
    };
  }, []);

  // Determine which navigation to show based on screen size
  const renderNavigation = () => {
    // For extra small screens (< 480px)
    if (windowWidth < 480) {
      return (
        <div className="flex items-center justify-between overflow-x-auto hide-scrollbar">
          <NavButton
            icon={<Sparkles className="h-4 w-4" />}
            label=""
            isActive={activeSection === "features"}
            onClick={() => scrollToSection("features")}
            screenSize="xs"
          />
          <NavButton
            icon={<Rocket className="h-4 w-4" />}
            label=""
            isActive={activeSection === "how-it-works"}
            onClick={() => scrollToSection("how-it-works")}
            screenSize="xs"
          />
          <NavButton
            icon={<MonitorPlay className="h-4 w-4" />}
            label=""
            isActive={activeSection === "producttour"}
            onClick={() => scrollToSection("producttour")}
            screenSize="xs"
          />
          <NavButton
            icon={<MessageSquare className="h-4 w-4" />}
            label=""
            isActive={activeSection === "testimonials"}
            onClick={() => scrollToSection("testimonials")}
            screenSize="xs"
          />
          <NavButton
            icon={<Award className="h-4 w-4" />}
            label=""
            isActive={activeSection === "pricing"}
            onClick={() => scrollToSection("pricing")}
            screenSize="xs"
          />
        </div>
      );
    }

    // For small screens (480px - 767px)
    if (windowWidth < 768) {
      return (
        <div className="flex items-center justify-between overflow-x-auto hide-scrollbar">
          <NavButton
            icon={<Sparkles className="h-4 w-4" />}
            label="Features"
            isActive={activeSection === "features"}
            onClick={() => scrollToSection("features")}
            screenSize="sm"
          />
          <NavButton
            icon={<Rocket className="h-4 w-4" />}
            label="How"
            isActive={activeSection === "how-it-works"}
            onClick={() => scrollToSection("how-it-works")}
            screenSize="sm"
          />
          <NavButton
            icon={<MonitorPlay className="h-4 w-4" />}
            label="Tour"
            isActive={activeSection === "producttour"}
            onClick={() => scrollToSection("producttour")}
            screenSize="sm"
          />
          <NavButton
            icon={<MessageSquare className="h-4 w-4" />}
            label="Reviews"
            isActive={activeSection === "testimonials"}
            onClick={() => scrollToSection("testimonials")}
            screenSize="sm"
          />
          <NavButton
            icon={<Award className="h-4 w-4" />}
            label="Pricing"
            isActive={activeSection === "pricing"}
            onClick={() => scrollToSection("pricing")}
            screenSize="sm"
          />
        </div>
      );
    }

    // For medium screens (768px - 1023px)
    if (windowWidth < 1024) {
      return (
        <div className="flex items-center justify-between overflow-x-auto hide-scrollbar">
          <NavButton
            icon={<Sparkles className="h-4 w-4" />}
            label="Features"
            isActive={activeSection === "features"}
            onClick={() => scrollToSection("features")}
            screenSize="md"
          />
          <NavButton
            icon={<Rocket className="h-4 w-4" />}
            label="How It Works"
            isActive={activeSection === "how-it-works"}
            onClick={() => scrollToSection("how-it-works")}
            screenSize="md"
          />
          <NavButton
            icon={<MonitorPlay className="h-4 w-4" />}
            label="Tour"
            isActive={activeSection === "producttour"}
            onClick={() => scrollToSection("producttour")}
            screenSize="md"
          />
          <NavButton
            icon={<MessageSquare className="h-4 w-4" />}
            label="Reviews"
            isActive={activeSection === "testimonials"}
            onClick={() => scrollToSection("testimonials")}
            screenSize="md"
          />
          <NavButton
            icon={<Award className="h-4 w-4" />}
            label="Pricing"
            isActive={activeSection === "pricing"}
            onClick={() => scrollToSection("pricing")}
            screenSize="md"
          />
        </div>
      );
    }

    // For large screens (≥ 1024px)
    return (
      <div className="flex items-center space-x-1">
        <NavButton
          icon={<Sparkles className="h-4 w-4" />}
          label="Features"
          isActive={activeSection === "features"}
          onClick={() => scrollToSection("features")}
          screenSize="lg"
        />
        <NavButton
          icon={<Rocket className="h-4 w-4" />}
          label="How It Works"
          isActive={activeSection === "how-it-works"}
          onClick={() => scrollToSection("how-it-works")}
          screenSize="lg"
        />
        <NavButton
          icon={<MonitorPlay className="h-4 w-4" />}
          label="Product Tour"
          isActive={activeSection === "producttour"}
          onClick={() => scrollToSection("producttour")}
          screenSize="lg"
        />
        <NavButton
          icon={<MessageSquare className="h-4 w-4" />}
          label="Testimonials"
          isActive={activeSection === "testimonials"}
          onClick={() => scrollToSection("testimonials")}
          screenSize="lg"
        />
        <NavButton
          icon={<Award className="h-4 w-4" />}
          label="Pricing"
          isActive={activeSection === "pricing"}
          onClick={() => scrollToSection("pricing")}
          screenSize="lg"
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      {/* Floating Navigation - Responsive for all screen sizes */}
      {windowWidth >= 1260 && (
        <motion.div
          className={`fixed z-50 ${isScrolled ? "opacity-100" : "opacity-0"} 
        bottom-4 left-1/2 -translate-x-1/2 w-[95%] xs:w-[90%] sm:w-[85%] md:w-[80%] lg:w-auto`}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: isScrolled ? 0 : 100, opacity: isScrolled ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-background/90 backdrop-blur-lg border border-border/40 rounded-full px-2 py-1.5 shadow-modern-lg">
            {renderNavigation()}
          </div>
        </motion.div>
      )}

      <main className="flex-1">
        {/* Hero Section with Parallax Effect */}
        <section
          id="hero"
          ref={targetRef}
          className="relative overflow-hidden min-h-[90vh] flex items-center bg-gradient-to-b from-background via-background to-muted/30 dark:from-background dark:via-background/95 dark:to-muted/10"
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <motion.div
              className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
              animate={{
                x: [0, 20, 0],
                y: [0, 30, 0],
              }}
              transition={{
                duration: 15,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
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
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
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
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10 pt-20 pb-16 md:pb-32">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Badge
                  variant="outline"
                  className="mb-4 md:mb-6 px-3 py-1 text-xs md:text-sm font-medium rounded-full"
                >
                  <Star className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1 md:mr-1.5 text-primary" />{" "}
                  Trusted by over 5,000 development teams
                </Badge>
              </motion.div>

              <motion.h1
                className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-foreground/70"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Streamline Your Development Workflow
              </motion.h1>

              <motion.p
                className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-6 md:mb-10 max-w-3xl mx-auto px-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                TMC is a comprehensive task management system designed for
                software development teams to track bugs, develop features, and
                manage documentation with ease.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link href="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto rounded-full shadow-modern group"
                  >
                    Get Started Free
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "reverse",
                      }}
                    >
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </motion.div>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full mt-3 sm:mt-0"
                  onClick={() => scrollToSection("how-it-works")}
                >
                  See How It Works
                </Button>
              </motion.div>
            </div>

            <motion.div
              className="mt-10 md:mt-16 max-w-6xl mx-auto relative"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              style={{ y, opacity }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none rounded-xl"></div>
              <div className="relative bg-card border border-border/40 rounded-xl overflow-hidden shadow-modern-lg">
                <img
                  src="/project-demo.jpg"
                  alt="Project List"
                  className="w-full h-auto transform transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Floating elements for visual interest */}
              <div className="absolute -top-6 -left-6 w-20 h-20 bg-primary/5 rounded-full blur-xl"></div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <AnimatePresence>
            {showScrollHint && (
              <motion.div
                className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2"
                initial={{ opacity: 1, y: 0 }}
                animate={{ y: [0, 10, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  y: { duration: 1.5, repeat: Number.POSITIVE_INFINITY },
                  opacity: { duration: 0.3 },
                }}
              >
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-xs md:text-sm text-muted-foreground">
                    Scroll to explore
                  </span>
                  <div className="w-6 h-10 md:w-8 md:h-12 rounded-full border-2 border-primary/30 flex justify-center">
                    <motion.div
                      className="w-1 h-2 md:w-1.5 md:h-3 bg-primary rounded-full mt-2"
                      animate={{ y: [0, 4, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Stats Section */}
        <section
          ref={statsRef}
          className="py-10 md:py-16 bg-muted/30 dark:bg-muted/10 border-y border-border/20"
        >
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="bg-card border border-border/20 rounded-lg p-2 xs:p-3 md:p-6 shadow-modern"
              >
                <h3 className="text-xl xs:text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-primary">
                  <AnimatedCounter value={5000} />+
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Teams
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-card border border-border/20 rounded-lg p-2 xs:p-3 md:p-6 shadow-modern"
              >
                <h3 className="text-xl xs:text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-primary">
                  <AnimatedCounter value={120000} />+
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Tasks Managed
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-card border border-border/20 rounded-lg p-2 xs:p-3 md:p-6 shadow-modern"
              >
                <h3 className="text-xl xs:text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-primary">
                  <AnimatedCounter value={98} />%
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Satisfaction
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-card border border-border/20 rounded-lg p-2 xs:p-3 md:p-6 shadow-modern"
              >
                <h3 className="text-xl xs:text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-primary">
                  <AnimatedCounter value={35} />%
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Productivity Boost
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="py-8 md:py-12 bg-background overflow-hidden">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs md:text-sm text-muted-foreground mb-6 md:mb-8">
              Trusted by teams from leading companies
            </p>
            <div className="flex flex-nowrap overflow-x-auto md:flex-wrap md:justify-center md:overflow-visible items-center gap-4 xs:gap-6 md:gap-8 lg:gap-16 pb-4 md:pb-0 px-4 hide-scrollbar">
              <motion.img
                src="https://cdn.simpleicons.org/trello/0079BF"
                alt="Trello"
                className="h-5 xs:h-6 md:h-8 w-auto shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img
                src="https://cdn.simpleicons.org/asana/273347"
                alt="Asana"
                className="h-5 xs:h-6 md:h-8 w-auto shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img
                src="https://cdn.simpleicons.org/jira/0052CC"
                alt="Jira"
                className="h-5 xs:h-6 md:h-8 w-auto shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img
                src="https://cdn.simpleicons.org/clickup/7B68EE"
                alt="ClickUp"
                className="h-5 xs:h-6 md:h-8 w-auto shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img
                src="https://cdn.simpleicons.org/google"
                alt="Notion"
                className="h-5 xs:h-6 md:h-8 w-auto shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img
                src="https://cdn.simpleicons.org/github/181717"
                alt="GitHub"
                className="h-5 xs:h-6 md:h-8 w-auto shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img
                src="https://cdn.simpleicons.org/firebase/FFCA28"
                alt="Firebase"
                className="h-5 xs:h-6 md:h-8 w-auto shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img
                src="https://cdn.simpleicons.org/slack/4A154B"
                alt="Slack"
                className="h-5 xs:h-6 md:h-8 w-auto shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.img
                src="https://cdn.simpleicons.org/linear/5E6AD2"
                alt="Linear"
                className="h-5 xs:h-6 md:h-8 w-auto shrink-0"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="py-12 sm:py-16 md:py-24 bg-gradient-to-b from-background to-muted/30 dark:from-background dark:to-muted/10"
        >
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-8 sm:mb-10 md:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge
                variant="outline"
                className="mb-3 md:mb-4 px-2 py-1 text-xs md:text-sm font-medium rounded-full"
              >
                Key Features
              </Badge>
              <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
                Everything you need to manage projects efficiently
              </h2>
              <p className="text-xs xs:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                TMC provides a comprehensive set of tools to help your team
                collaborate, track progress, and deliver high-quality software
                on time.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              <FeatureCard
                icon={
                  <Users className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary" />
                }
                title="Team Collaboration"
                description="Create and manage projects with customized roles (Admin, Developer, Tester, Document Writer) to ensure everyone has the right access."
                delay={0}
              />
              <FeatureCard
                icon={
                  <GitBranch className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary" />
                }
                title="GitHub Integration"
                description="Link commits manually and configure webhooks to track repository events in real-time, keeping your code and tasks in sync."
                delay={0.1}
              />
              <FeatureCard
                icon={
                  <Layers className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary" />
                }
                title="Task Tracking"
                description="Track bugs, develop features, and manage documentation for tasks in your projects with an intuitive interface."
                delay={0.2}
              />
              <FeatureCard
                icon={
                  <Zap className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary" />
                }
                title="Real-time Notifications"
                description="Receive email and in-browser notifications for important events to stay updated on project activities."
                delay={0.3}
              />
              <FeatureCard
                icon={
                  <Shield className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary" />
                }
                title="Secure Access Control"
                description="Control who can access what with fine-grained permissions and role-based access control for each project."
                delay={0.4}
              />
              <FeatureCard
                icon={
                  <BarChart className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary" />
                }
                title="Detailed Reporting"
                description="View statistics, progress charts, and project reports to make data-driven decisions and keep stakeholders informed."
                delay={0.5}
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="py-12 sm:py-16 md:py-24 bg-muted/30 dark:bg-muted/10 relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <motion.div
              className="absolute top-1/4 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
              animate={{
                x: [0, -30, 0],
                y: [0, 40, 0],
              }}
              transition={{
                duration: 20,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-1/4 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
              animate={{
                x: [0, 40, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 18,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              className="text-center mb-8 sm:mb-10 md:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge
                variant="outline"
                className="mb-3 md:mb-4 px-2 py-1 text-xs md:text-sm font-medium rounded-full"
              >
                How It Works
              </Badge>
              <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
                Simple workflow, powerful results
              </h2>
              <p className="text-xs xs:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                Our intuitive workflow helps your team stay organized and
                focused on what matters most.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              <WorkflowStep
                number="01"
                title="Create Projects"
                description="Set up projects, invite team members, and assign roles based on responsibilities."
                delay={0}
                icon={
                  <Code className="h-4 w-4 xs:h-5 xs:w-5 md:h-6 md:w-6 text-primary" />
                }
              />
              <WorkflowStep
                number="02"
                title="Manage Tasks"
                description="Create, assign, and track tasks with detailed information and real-time updates."
                delay={0.2}
                icon={
                  <Sparkles className="h-4 w-4 xs:h-5 xs:w-5 md:h-6 md:w-6 text-primary" />
                }
              />
              <WorkflowStep
                number="03"
                title="Track Progress"
                description="Monitor project progress, review completed tasks, and generate reports for stakeholders."
                delay={0.4}
                icon={
                  <Rocket className="h-4 w-4 xs:h-5 xs:w-5 md:h-6 md:w-6 text-primary" />
                }
              />
            </div>
          </div>
        </section>

        {/* Product Screenshots Section */}
        <section
          id="producttour"
          className="py-12 sm:py-16 md:py-24 bg-background"
        >
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-8 sm:mb-10 md:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge
                variant="outline"
                className="mb-3 md:mb-4 px-2 py-1 text-xs md:text-sm font-medium rounded-full"
              >
                Product Tour
              </Badge>
              <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
                See TMC in action
              </h2>
              <p className="text-xs xs:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                Explore the key features of our task management system designed
                for software development teams.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-6 md:gap-8 mb-4 xs:mb-6 md:mb-12">
              <motion.div
                className="bg-card border border-border rounded-xl overflow-hidden shadow-modern group"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -5 }}
              >
                <div className="p-2 xs:p-3 md:p-4 border-b border-border bg-muted/50">
                  <h3 className="text-sm xs:text-base md:text-lg font-semibold">
                    Cloudinary Config
                  </h3>
                </div>
                <div className="p-0 overflow-hidden">
                  <img
                    src="/cloudinary.jpg"
                    alt="Cloudinary Config"
                    className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </motion.div>

              <motion.div
                className="bg-card border border-border rounded-xl overflow-hidden shadow-modern group"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -5 }}
              >
                <div className="p-2 xs:p-3 md:p-4 border-b border-border bg-muted/50">
                  <h3 className="text-sm xs:text-base md:text-lg font-semibold">
                    Task Details
                  </h3>
                </div>
                <div className="p-0 overflow-hidden">
                  <img
                    src="/task-detail.jpg"
                    alt="Task Details"
                    className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-6 md:gap-8">
              <motion.div
                className="bg-card border border-border rounded-xl overflow-hidden shadow-modern group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -5 }}
              >
                <div className="p-2 xs:p-3 md:p-4 border-b border-border bg-muted/50">
                  <h3 className="text-sm xs:text-base md:text-lg font-semibold">
                    Team Management
                  </h3>
                </div>
                <div className="p-0 overflow-hidden">
                  <img
                    src="/member-setting.jpg"
                    alt="Team Management"
                    className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </motion.div>

              <motion.div
                className="bg-card border border-border rounded-xl overflow-hidden shadow-modern group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -5 }}
              >
                <div className="p-2 xs:p-3 md:p-4 border-b border-border bg-muted/50">
                  <h3 className="text-sm xs:text-base md:text-lg font-semibold">
                    Webhook support
                  </h3>
                </div>
                <div className="p-0 overflow-hidden">
                  <img
                    src="/webhook.jpg"
                    alt="Webhook support"
                    className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Testimonials Section with Swiper */}
        <section
          id="testimonials"
          className="py-12 sm:py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background dark:from-muted/10 dark:to-background relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <motion.div
              className="absolute top-1/3 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
              animate={{
                x: [0, 30, 0],
                y: [0, -20, 0],
              }}
              transition={{
                duration: 15,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              className="text-center mb-8 sm:mb-10 md:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge
                variant="outline"
                className="mb-3 md:mb-4 px-2 py-1 text-xs md:text-sm font-medium rounded-full"
              >
                <MessageSquare className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1 md:mr-1.5 text-primary" />{" "}
                Testimonials
              </Badge>
              <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
                What our users say
              </h2>
              <p className="text-xs xs:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                Don't just take our word for it. Here's what teams using TMC
                have to say.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              className="max-w-6xl mx-auto"
            >
              <Swiper
                effect={"coverflow"}
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={1}
                breakpoints={{
                  640: {
                    slidesPerView: "auto",
                  },
                }}
                loop={true}
                coverflowEffect={{
                  rotate: 0,
                  stretch: 0,
                  depth: 100,
                  modifier: 2.5,
                  slideShadows: false,
                }}
                pagination={{ clickable: true }}
                navigation={true}
                autoplay={{
                  delay: 5000,
                  disableOnInteraction: false,
                }}
                modules={[Autoplay, Pagination, Navigation, EffectCoverflow]}
                className="testimonial-swiper"
              >
                {testimonials.map((testimonial, index) => (
                  <SwiperSlide
                    key={index}
                    className="py-4 xs:py-6 md:py-8 px-2 md:px-4"
                  >
                    <div className="bg-card border border-border/40 rounded-xl p-3 xs:p-4 md:p-8 shadow-modern h-full">
                      <div className="flex items-center mb-3 xs:mb-4 md:mb-6">
                        <div className="w-8 h-8 xs:w-10 xs:h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center mr-2 xs:mr-3 md:mr-4">
                          {testimonial.avatar ? (
                            <img
                              src={testimonial.avatar || "/placeholder.svg"}
                              alt={testimonial.author}
                              className="w-6 h-6 xs:w-8 xs:h-8 md:w-10 md:h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-base xs:text-lg md:text-xl font-bold text-primary">
                              {testimonial.author.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs xs:text-sm md:text-base font-semibold">
                            {testimonial.author}
                          </h4>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {testimonial.role}, {testimonial.company}
                          </p>
                        </div>
                      </div>

                      <div className="flex mb-2 xs:mb-3 md:mb-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 md:h-4 md:w-4 ${i < testimonial.rating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted"
                              }`}
                          />
                        ))}
                      </div>

                      <p className="italic text-xs xs:text-sm md:text-base lg:text-lg mb-1 xs:mb-2 md:mb-4">
                        "{testimonial.quote}"
                      </p>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section
          id="pricing"
          className="py-12 sm:py-16 md:py-24 bg-muted/30 dark:bg-muted/10"
        >
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-8 sm:mb-10 md:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge
                variant="outline"
                className="mb-3 md:mb-4 px-2 py-1 text-xs md:text-sm font-medium rounded-full"
              >
                Pricing
              </Badge>
              <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
                Choose the perfect plan for your team
              </h2>
              <p className="text-xs xs:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                Flexible pricing options to fit teams of all sizes. All plans
                include core features.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xs:gap-6 md:gap-8 max-w-5xl mx-auto">
              <PricingCard
                title="Basic"
                price="Free"
                description="Perfect for individuals or small teams"
                features={[
                  "Up to 3 projects",
                  "Basic task management",
                  "Email notifications",
                  "1 year validity",
                ]}
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
        <section className="py-12 sm:py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-8 sm:mb-10 md:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Badge
                variant="outline"
                className="mb-3 md:mb-4 px-2 py-1 text-xs md:text-sm font-medium rounded-full"
              >
                FAQ
              </Badge>
              <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xs xs:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                Find answers to common questions about TMC and how it can help
                your team.
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto space-y-3 xs:space-y-4 md:space-y-6">
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
        <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-b from-background to-primary dark:from-background dark:to-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-primary opacity-90 dark:opacity-95"></div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-3 xs:mb-4 md:mb-6">
                Ready to streamline your workflow?
              </h2>
              <p className="text-sm xs:text-base md:text-xl text-primary-foreground/90 mb-4 xs:mb-6 md:mb-8 max-w-2xl mx-auto">
                Join thousands of teams who use TMC to manage their projects
                efficiently
              </p>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full shadow-modern group"
                >
                  Get Started Free
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "reverse",
                    }}
                  >
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </motion.div>
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Navigation Button Component
function NavButton({
  icon,
  label,
  isActive,
  onClick,
  screenSize = "lg",
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  screenSize?: "xs" | "sm" | "md" | "lg";
}) {
  // Adjust styles based on screen size
  const getButtonStyles = () => {
    // Base styles
    const baseStyles = `flex items-center rounded-full ${isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`;

    // Padding and spacing adjustments based on screen size
    switch (screenSize) {
      case "xs":
        return `${baseStyles} justify-center p-2`;
      case "sm":
        return `${baseStyles} space-x-1 px-2 py-1.5 text-xs`;
      case "md":
        return `${baseStyles} space-x-1 px-2.5 py-1.5 text-xs`;
      case "lg":
      default:
        return `${baseStyles} space-x-1 px-3 py-2 text-sm`;
    }
  };

  return (
    <motion.button
      className={getButtonStyles()}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
      {label && screenSize !== "xs" && <span>{label}</span>}
    </motion.button>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  delay = 0,
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
      whileHover={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-100px" }}
      whileHover={{ y: -5 }}
    >
      <Card className="shadow-modern h-full border border-border/40 transition-all duration-300">
        <CardContent className="p-3 xs:p-4 md:p-6">
          <motion.div
            className="mb-2 xs:mb-3 md:mb-4 bg-primary/5 w-10 h-10 xs:w-12 xs:h-12 md:w-16 md:h-16 rounded-lg flex items-center justify-center"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            {icon}
          </motion.div>
          <h3 className="text-base xs:text-lg md:text-xl font-semibold mb-1 xs:mb-2 md:mb-3">
            {title}
          </h3>
          <p className="text-xs xs:text-sm md:text-base text-muted-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function WorkflowStep({
  number,
  title,
  description,
  icon,
  delay = 0,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
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
        className="w-14 h-14 xs:w-16 xs:h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base xs:text-lg md:text-xl mb-2 xs:mb-3 md:mb-4 relative"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {number}
        <div className="absolute -right-1 -bottom-1 bg-background rounded-full p-1 xs:p-1.5 md:p-2 shadow-md">
          {icon}
        </div>
      </motion.div>
      <h3 className="text-base xs:text-lg md:text-xl font-semibold mb-1 md:mb-2">
        {title}
      </h3>
      <p className="text-xs xs:text-sm md:text-base text-muted-foreground">
        {description}
      </p>
    </motion.div>
  );
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
  delay = 0,
}: {
  title: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonLink: string;
  handleClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  highlighted?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-100px" }}
      whileHover={{ y: -5 }}
    >
      <Card
        className={`h-full card-hover ${highlighted
            ? "relative border-primary/20 shadow-modern-lg"
            : "shadow-modern"
          }`}
      >
        {highlighted && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-2 py-0.5 xs:px-3 xs:py-0.5 md:px-4 md:py-1 rounded-full text-xs md:text-sm font-medium">
            Popular
          </div>
        )}
        <CardContent
          className={`p-3 xs:p-4 md:p-8 ${highlighted ? "pt-5 xs:pt-6 md:pt-10" : ""
            }`}
        >
          <h3 className="text-base xs:text-lg md:text-xl font-semibold mb-1 md:mb-2">
            {title}
          </h3>
          <div className="mb-2 md:mb-4">
            <span className="text-xl xs:text-2xl md:text-3xl font-bold">
              {price}
            </span>
            {period && (
              <span className="text-xs xs:text-sm md:text-base text-muted-foreground ml-1">
                {period}
              </span>
            )}
          </div>
          <p className="text-xs xs:text-sm md:text-base text-muted-foreground mb-3 xs:mb-4 md:mb-6">
            {description}
          </p>
          <ul className="space-y-1.5 xs:space-y-2 md:space-y-3 mb-3 xs:mb-4 md:mb-6">
            {features.map((feature, index) => (
              <motion.li
                key={index}
                className="flex items-start"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: delay + index * 0.1 }}
                viewport={{ once: true }}
              >
                <CheckCircle className="h-3.5 w-3.5 xs:h-4 xs:w-4 md:h-5 md:w-5 text-primary mr-1.5 xs:mr-2 shrink-0 mt-0.5" />
                <span className="text-xs xs:text-sm md:text-base">
                  {feature}
                </span>
              </motion.li>
            ))}
          </ul>
          <Link href={buttonLink} onClick={handleClick}>
            <Button
              variant={highlighted ? "default" : "outline"}
              className={`w-full rounded-full ${highlighted ? "shadow-md" : ""
                }`}
            >
              {buttonText}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
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
        <summary className="flex justify-between items-center p-3 xs:p-4 md:p-6 cursor-pointer list-none">
          <h3 className="text-sm xs:text-base md:text-lg font-medium">
            {question}
          </h3>
          <motion.div
            className="transition-transform duration-300 group-open:rotate-180"
            whileTap={{ scale: 0.9 }}
          >
            <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          </motion.div>
        </summary>
        <motion.div
          className="px-3 xs:px-4 md:px-6 pb-3 xs:pb-4 md:pb-6 pt-0"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <p className="text-xs xs:text-sm md:text-base text-muted-foreground">
            {answer}
          </p>
        </motion.div>
      </details>
    </motion.div>
  );
}
