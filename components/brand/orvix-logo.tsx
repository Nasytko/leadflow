import Image from "next/image";
import { cn } from "@/lib/utils";

const ASSETS = {
  symbol: { src: "/brand/orvix-symbol.svg", width: 32, height: 32 },
  wordmark: { src: "/brand/orvix-wordmark.svg", width: 120, height: 24 },
  logo: { src: "/brand/orvix-logo.svg", width: 152, height: 32 },
} as const;

type OrvixLogoVariant = keyof typeof ASSETS;

type OrvixLogoProps = {
  variant?: OrvixLogoVariant;
  className?: string;
  priority?: boolean;
};

export function OrvixLogo({ variant = "logo", className, priority }: OrvixLogoProps) {
  const asset = ASSETS[variant];

  return (
    <Image
      src={asset.src}
      alt="ORVIX"
      width={asset.width}
      height={asset.height}
      className={cn("h-auto w-auto", className)}
      priority={priority}
    />
  );
}
