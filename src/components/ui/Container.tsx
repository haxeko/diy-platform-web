import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const sizes = { sm: "max-w-3xl", md: "max-w-5xl", lg: "max-w-6xl", xl: "max-w-7xl" };

export function Container({ size = "lg", className, ...rest }: HTMLAttributes<HTMLDivElement> & { size?: keyof typeof sizes }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", sizes[size], className)} {...rest} />;
}
