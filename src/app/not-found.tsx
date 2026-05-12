import Link from "next/link";

import { Button } from "@/shared/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Extraction not found</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The result may have expired or the identifier is incorrect.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Start again</Link>
      </Button>
    </main>
  );
}
