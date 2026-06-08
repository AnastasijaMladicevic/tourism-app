export interface BanCountdownParts {
  months: number;
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
}

export function computeBanCountdown(expiresAtUtc: string | null | undefined, now = new Date()): BanCountdownParts | null {
  if (!expiresAtUtc?.trim()) {
    return null;
  }

  const end = new Date(expiresAtUtc);
  if (Number.isNaN(end.getTime())) {
    return null;
  }

  if (end.getTime() <= now.getTime()) {
    return { months: 0, days: 0, hours: 0, minutes: 0, expired: true };
  }

  let cursor = new Date(now.getTime());
  let months = 0;

  while (true) {
    const nextMonth = new Date(cursor.getTime());
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    if (nextMonth.getTime() > end.getTime()) {
      break;
    }
    months += 1;
    cursor = nextMonth;
  }

  let days = 0;
  while (true) {
    const nextDay = new Date(cursor.getTime());
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    if (nextDay.getTime() > end.getTime()) {
      break;
    }
    days += 1;
    cursor = nextDay;
  }

  const remainderMs = end.getTime() - cursor.getTime();
  const hours = Math.floor(remainderMs / 3_600_000);
  const minutes = Math.floor((remainderMs % 3_600_000) / 60_000);

  return { months, days, hours, minutes, expired: false };
}
