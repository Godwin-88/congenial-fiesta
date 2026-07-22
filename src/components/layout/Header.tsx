"use client"

import { useState } from "react"
import { Moon, Sun, Menu, Search } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import SearchBar from "@/components/search/SearchBar"
import AuthButton from "@/components/auth/AuthButton"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/devices", label: "Devices" },
  { href: "/videos", label: "Videos" },
  { href: "/articles", label: "Articles" },
  { href: "/about", label: "About" },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="font-heading text-xl font-bold text-brand-primary">
          FweezyTech
        </a>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Desktop search bar */}
          <div className="hidden md:block w-56">
            <SearchBar placeholder="Search..." className="w-full" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Mobile search trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          <AuthButton />

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Menu" />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              {/* Mobile search inside sheet */}
              <div className="mb-6">
                <SearchBar placeholder="Search..." autoFocus />
              </div>
              <nav className="flex flex-col gap-4 mt-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-lg font-medium text-foreground/70 hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden border-t border-border bg-background p-4">
          <SearchBar placeholder="Search..." autoFocus className="w-full" />
          <button
            onClick={() => setSearchOpen(false)}
            className="mt-2 text-sm text-foreground/50 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </header>
  )
}