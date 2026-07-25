import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import config from '@payload-config'
import { importMap } from './admin/importMap'
import '@payloadcms/next/css'
import '@/styles/globals.css'

const serverFunction = async (args: {
  args: Record<string, unknown>
  name: string
}) => {
  'use server'
  return handleServerFunctions({
    name: args.name,
    args: args.args,
    config,
    importMap,
  })
}

const Layout = ({ children }: { children: React.ReactNode }) =>
  RootLayout({
    config,
    importMap,
    serverFunction,
    children: (
      <>
        <style>{`
          /* Apply Raleway to Payload admin via Google Fonts */
          @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;700&display=swap');
          :root {
            --font-sans: 'Raleway', sans-serif;
            --font-heading: 'Raleway', sans-serif;
          }
          body, .payload-admin, .app-header, .nav, .nav__label,
          .dashboard, .collection-list, .edit-view,
          .field-type, .btn, input, select, textarea, button {
            font-family: 'Raleway', sans-serif !important;
          }

          /* FweezyTech brand CSS variables */
          :root {
            --theme-elevation-0: #0a0f1a;
            --theme-elevation-50: #111827;
            --theme-elevation-100: #1f2937;
            --theme-elevation-150: #374151;
            --theme-success: #22c55e;
            --theme-warning: #f59e0b;
            --theme-error: #ef4444;
          }

          /* Sidebar brand accent line */
          .nav__wrap {
            border-right: 2px solid #0066FF !important;
          }

          /* Active nav item highlight */
          .nav__link--active {
            background-color: rgba(0, 102, 255, 0.15) !important;
            color: #0066FF !important;
          }

          /* Save button brand colour */
          .btn--style-primary {
            background-color: #0066FF !important;
          }

          /* Collection list header */
          .collection-list__header {
            border-bottom: 2px solid #0066FF !important;
          }

          /* Map Payload's data-theme attribute to our dark CSS variables */
          html[data-theme="dark"] {
            --background: oklch(0.145 0 0);
            --foreground: oklch(0.985 0 0);
            --card: oklch(0.205 0 0);
            --card-foreground: oklch(0.985 0 0);
            --popover: oklch(0.205 0 0);
            --popover-foreground: oklch(0.985 0 0);
            --primary: oklch(0.922 0 0);
            --primary-foreground: oklch(0.205 0 0);
            --secondary: oklch(0.269 0 0);
            --secondary-foreground: oklch(0.985 0 0);
            --muted: oklch(0.269 0 0);
            --muted-foreground: oklch(0.708 0 0);
            --accent: oklch(0.269 0 0);
            --accent-foreground: oklch(0.985 0 0);
            --destructive: oklch(0.704 0.191 22.216);
            --border: oklch(1 0 0 / 10%);
            --input: oklch(1 0 0 / 15%);
            --ring: oklch(0.556 0 0);
            --brand-bg: #111827;
            --brand-fg: #F9FAFB;
            color-scheme: dark;
          }
        `}</style>
        {children}
      </>
    ),
  })

export default Layout