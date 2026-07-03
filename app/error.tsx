"use client";

import { useEffect } from "react";
import Link from "next/link";
import { OrvixLogo } from "@/components/brand/orvix-logo";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center font-sans">
        <OrvixLogo variant="symbol" className="mb-8 h-10 w-10" />
        <p className="type-label text-muted-foreground">Error</p>
        <h1 className="type-display mt-2">Something went wrong</h1>
        <p className="type-body mt-3 max-w-md text-muted-foreground">
          An unexpected error occurred. Try again or return to the dashboard.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => reset()} className="min-h-11">
            Try again
          </Button>
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/ru/dashboard">Mission Control</Link>
          </Button>
        </div>
      </body>
    </html>
  );
}
