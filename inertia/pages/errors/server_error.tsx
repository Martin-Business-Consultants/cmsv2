import { Head } from '@inertiajs/react'

export default function ServerError() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <Head title="Something went wrong" />
      <p className="text-muted-foreground text-sm font-medium">500</p>
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">Please try again in a moment.</p>
    </div>
  )
}
