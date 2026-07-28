import { redirect } from 'next/navigation'
import { Raleway } from 'next/font/google'
import { getAdminUser } from '@/lib/admin/require-admin'
import Sidebar from '@/components/admin/Sidebar'
import { AdminProvider } from '@/context/AdminContext'
import { ThemeProvider } from '@ecosy/next-themes'

const ralewaySans = Raleway({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

const ralewayHeading = Raleway({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect('/auth/admin-login?next=/admin')
  }

  return (
    <div className={`${ralewaySans.variable} ${ralewayHeading.variable} font-sans antialiased`}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <AdminProvider adminUser={adminUser}>
          <div className="flex h-screen">
            <Sidebar adminUser={adminUser} />
            <main className="flex-1 overflow-y-auto p-6 lg:p-8 pt-16 lg:pt-8">
              {children}
            </main>
          </div>
        </AdminProvider>
      </ThemeProvider>
    </div>
  )
}