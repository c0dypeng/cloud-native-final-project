const TAIPEI_TIME_ZONE = "Asia/Taipei";

export function formatDateTime(value: string | Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TAIPEI_TIME_ZONE,
  }).format(new Date(value));
}
