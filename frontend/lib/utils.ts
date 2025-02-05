// condiitonally applies Tailwind CSS styling + merges/resolves conflicting Tailwind CSS classes

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
