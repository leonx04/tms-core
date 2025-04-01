"use client"

import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { ChevronDown, Folder, Home, LogOut, Menu, User, X } from 'lucide-react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Header() {
  const { user, userData, signOut } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [router])

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled ? "bg-background/80 backdrop-blur-md shadow-sm" : "bg-background"
      }`}
    >
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href={"/"} className="flex items-center">
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground w-8 h-8 rounded-md flex items-center justify-center font-bold text-lg">
              T
            </div>
            <span className="text-xl font-bold ml-2">TMC</span>
            <span className="text-xs text-muted-foreground ml-1 mt-1">v1</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {user ? (
            <>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="rounded-md">
                  <Folder className="h-4 w-4 mr-2" />
                  Projects
                </Button>
              </Link>

              <ThemeToggle className="mr-2" />

              <NotificationDropdown />

              <div className="relative">
                <button
                  className="flex items-center space-x-2 rounded-full px-2 py-1.5 hover:bg-muted/50 transition-colors"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <Avatar className="h-8 w-8 border border-border/30">
                    <AvatarImage src={user?.photoURL || undefined} alt={userData?.displayName || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {userData?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-modern border border-border/5 overflow-hidden animate-fadeIn">
                    <div className="p-2">
                      <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                        {userData?.displayName || user.email}
                      </div>
                      <div className="h-px bg-border my-1"></div>
                      <Link
                        href="/profile"
                        className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                      <div className="h-px bg-border my-1"></div>
                      <button
                        className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-destructive/10 hover:text-destructive w-full text-left transition-colors"
                        onClick={() => {
                          handleSignOut()
                          setUserMenuOpen(false)
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/#features">
                <Button variant="ghost" size="sm" className="rounded-md">
                  Features
                </Button>
              </Link>
              <Link href="/#pricing">
                <Button variant="ghost" size="sm" className="rounded-md">
                  Pricing
                </Button>
              </Link>
              <ThemeToggle className="mr-2" />
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-md">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-md">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Header Actions */}
        <div className="md:hidden flex items-center space-x-2">
          {user && (
            <NotificationDropdown isMobile={true} />
          )}
          <ThemeToggle />
          <button
            className="text-foreground p-1 rounded-md hover:bg-muted/50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Slide from top with improved animation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[57px] bottom-0 z-40 bg-background/95 backdrop-blur-sm animate-in slide-in-from-top duration-300 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 space-y-4">
            {user ? (
              <>
                <div className="flex items-center space-x-3 py-2 border border-border/30 rounded-lg p-3 bg-card/50">
                  <Avatar className="h-12 w-12 border border-border/30">
                    <AvatarImage src={user?.photoURL || undefined} alt={userData?.displayName || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {userData?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{userData?.displayName || "User"}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</div>
                  </div>
                </div>
                
                <nav className="grid gap-1 pt-2">
                  <Link
                    href="/projects"
                    className="flex items-center p-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                  >
                    <Folder className="mr-3 h-5 w-5" />
                    Projects
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center p-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                  >
                    <User className="mr-3 h-5 w-5" />
                    Profile
                  </Link>
                </nav>
                
                <div className="pt-4 mt-4 border-t border-border">
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                <nav className="grid gap-1 pt-2">
                  <Link
                    href="/"
                    className="flex items-center p-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                  >
                    <Home className="mr-3 h-5 w-5" />
                    Home
                  </Link>
                  <Link
                    href="/#features"
                    className="flex items-center p-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                  >
                    Features
                  </Link>
                  <Link
                    href="/#pricing"
                    className="flex items-center p-3 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                  >
                    Pricing
                  </Link>
                </nav>
                
                <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-border">
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
