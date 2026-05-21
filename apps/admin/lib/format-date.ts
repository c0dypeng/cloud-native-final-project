const TAIPEI_TIME_ZONE = "Asia/Taipei";

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("zh-TW", {
    timeZone: TAIPEI_TIME_ZONE,
  });
}

export function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString("zh-TW", {
    timeZone: TAIPEI_TIME_ZONE,
  });
}
