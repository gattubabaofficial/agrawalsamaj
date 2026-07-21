/**
 * Formats a date string or Date object into "DD MMM YYYY" format.
 * Example: "21 Jul 2026", "01 Jan 2020", "15 Oct 2026"
 */
export function formatDateDDMonthYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return "";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Handle YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss string directly to prevent timezone shifts
  if (typeof dateInput === "string") {
    const cleanStr = dateInput.split("T")[0].trim();
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, "0");
      if (monthIdx >= 0 && monthIdx < 12 && year.length === 4 && !isNaN(parseInt(day, 10))) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, "0");
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${monthName} ${year}`;
}
