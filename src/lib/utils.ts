import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- ADD THIS NEW FUNCTION ---
/**
 * Calculates the duration between two dates and formats it as MM:SS.
 * @param start - The start date.
 * @param end - The end date.
 * @returns A formatted string 'MM:SS' or '--:--' if dates are invalid.
 */
export function formatDuration(start: Date, end: Date | null): string {
  if (!end) {
    return '--:--';
  }
  const diffInSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
  if (diffInSeconds < 0) return '00:00';
  
  const minutes = Math.floor(diffInSeconds / 60);
  const seconds = diffInSeconds % 60;
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}