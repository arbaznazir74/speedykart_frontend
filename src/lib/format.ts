export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getImageSrc(image: string | null | undefined): string {
  if (!image) return "";
  if (
    image.startsWith("data:") ||
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }
  // If it looks like a file path (contains / or \), treat as relative URL on backend
  if (image.includes("/") || image.includes("\\")) {
    const { API_BASE_URL } = require("@/lib/constants");
    const cleaned = image.replace(/^(wwwroot[/\\]?|content[/\\]?)/, "");
    return `${API_BASE_URL}/${cleaned}`;
  }
  return `data:image/jpeg;base64,${image}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
