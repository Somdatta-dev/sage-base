import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateSpaceKey(name: string) {
  // Split into words and take first letter of each word
  const words = name
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);

  if (words.length === 1) {
    // Single word: take first 6 characters
    return words[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  }

  // Multiple words: use initials from each word
  let key = words
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  // If initials are too short, append more chars from first word
  if (key.length < 3) {
    const firstWord = words[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    key = (key + firstWord).slice(0, 6);
  }

  return key.slice(0, 6);
}

