import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Authentication Error
      </h1>
      <p className="mt-4 text-muted-foreground">
        Something went wrong signing you in. Please try again.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 mt-6"
      >
        Back to Home
      </Link>
    </div>
  )
}
