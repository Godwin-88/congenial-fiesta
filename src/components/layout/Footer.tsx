import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { YoutubeIcon, TiktokIcon, InstagramIcon, FacebookIcon } from "@/components/icons/SocialIcons"

const socials = [
  { name: "YouTube", icon: YoutubeIcon, href: "#" },
  { name: "TikTok", icon: TiktokIcon, href: "#" },
  { name: "Instagram", icon: InstagramIcon, href: "#" },
  { name: "Facebook", icon: FacebookIcon, href: "#" },
]

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:justify-between gap-8">
          <div className="max-w-sm">
            <Link href="/" className="font-heading text-xl font-bold text-brand-primary">
              FweezyTech
            </Link>
            <p className="mt-2 text-sm text-foreground/60">
              Honest device reviews, comparisons, and tech insights for Kenya and beyond.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">Company</h3>
              <nav className="flex flex-col gap-2">
                <Link href="/about" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
                  About
                </Link>
                <Link href="/press" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
                  Press
                </Link>
                <Link href="/advertise" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
                  Advertise
                </Link>
                <Link href="/privacy" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">Social</h3>
              <div className="flex gap-4">
                {socials.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    aria-label={social.name}
                    className="text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-center text-xs text-foreground/40">
          © {new Date().getFullYear()} FweezyTech. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
