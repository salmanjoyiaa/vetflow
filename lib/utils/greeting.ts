/** Time-of-day greeting — pass a fixed `date` on the server to avoid hydration drift. */
export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
