export function getBusinessInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "B";

  return words.slice(0, 2).map((word) => Array.from(word)[0]).join("").toUpperCase();
}
