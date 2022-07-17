import { DateTime } from 'luxon';

/** Converts a local Date tagged as UTC from RRule to a DateTime */
// https://github.com/jakubroztocil/rrule#important-use-utc-dates
export function rruleDateToDateTime(d: Date, zone?: string): DateTime {
  let dt = DateTime.fromJSDate(d, { zone: 'utc' });
  if (zone) {
    dt = dt.setZone(zone, { keepLocalTime: true });
  }
  return dt;
}

/** Converts a DateTime to a local Date tagged as UTC for use with RRule */
// https://github.com/jakubroztocil/rrule#important-use-utc-dates
export function dateTimeToRRuleDate(dt: DateTime, zone?: string): Date {
  if (zone) {
    dt = dt.setZone(zone);
  }
  return new Date(Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond));
}
