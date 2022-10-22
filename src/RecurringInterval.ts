import { Duration, Interval } from 'luxon';
import { RRule } from 'rrule';

/** A recurring interval combines an RRULE defining the instance start dates with a duration and optional timezone */
export interface RecurringInterval {
  /** The recurrence rule defining the start dates of each interval */
  rrule: RRule;
  /** The duration of each interval */
  duration: Duration;
  /** The timezone to apply to the recurrence rule (if it doesn't contain one) */
  zone?: string;
}

/** A single or recurring interval */
export type GenericInterval = Interval | RecurringInterval;

/** Returns whether the given value is a RecurringInterval object */
export function isRecurringInterval(i: GenericInterval): i is RecurringInterval {
  return !(i instanceof Interval);
}

/** Returns the duration of a generic interval */
export function getIntervalDuration(i: GenericInterval): Duration {
  return isRecurringInterval(i) ? i.duration : i.toDuration(['hours', 'minutes', 'seconds']);
}
