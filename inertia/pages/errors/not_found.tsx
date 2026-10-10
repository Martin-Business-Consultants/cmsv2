import { Head } from '@inertiajs/react'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <Head title="Page not found" />
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The page you’re looking for doesn’t exist.</p>
      <a href="/" className="mt-4 text-sm underline">
        Go home
      </a>
    </div>
  )
}
