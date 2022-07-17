import { DateTime, Duration, Interval } from 'luxon';

const LocalDateTimeFormat = "yyyyMMdd'T'HHmmss";
const UtcDateTimeFormat = `${LocalDateTimeFormat}'Z'`;

export function formatDateTime(dt: DateTime): string {
  if (dt.zoneName === 'UTC') {
    return ':' + dt.toFormat(UtcDateTimeFormat);
  }
  return `;TZID=${dt.zoneName}:` + dt.toFormat(LocalDateTimeFormat);
}

export function parseDateTime(s: string, zone?: string): DateTime {
  if (s.endsWith('Z')) {
    return DateTime.fromFormat(s, UtcDateTimeFormat, { zone: 'utc' });
  }
  return DateTime.fromFormat(s, LocalDateTimeFormat, { zone });
}

export function parsePeriod(s: string, zone?: string): Interval {
  const parts = s.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid PERIOD value: ${s}`);
  }
  const start = parseDateTime(parts[0], zone);
  if (!start.isValid) {
    throw new Error(`Invalid start date in PERIOD value: ${parts[0]}`);
  }
  let end: DateTime;
  if (parts[1].startsWith('P')) {
    const duration = Duration.fromISO(parts[1]);
    if (!duration.isValid) {
      throw new Error(`Invalid duration in PERIOD value: ${parts[1]}`);
    }
    end = start.plus(duration);
  } else {
    end = parseDateTime(parts[1], zone);
    if (!end.isValid) {
      throw new Error(`Invalid end date in PERIOD value: ${parts[1]}`);
    }
    if (end < start) {
      throw new Error(`End date is before start date in PERIOD value: ${s}`);
    }
  }
  return Interval.fromDateTimes(start, end);
}
