import { OrvixLogo } from "@/components/brand/orvix-logo";

export function AuthBrandMark() {
  return (
    <div
      className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background"
      aria-hidden
    >
      <OrvixLogo variant="symbol" className="h-7 w-7" priority />
    </div>
  );
}
