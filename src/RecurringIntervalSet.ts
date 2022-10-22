import { DateTime, Duration, Interval } from 'luxon';
import { RRule } from 'rrule';
import { parseProperty, validatePropertyParameters } from './CalProperty';
import { formatDateTime, parseDateTime, parsePeriod } from './parseUtil';
import { GenericInterval, getIntervalDuration, isRecurringInterval, RecurringInterval } from './RecurringInterval';
import { dateTimeToRRuleDate, rruleDateToDateTime } from './rruleUtil';

const defaultIterationLimit = 1000;

export interface ConstructorOptions {
  /** Intervals to include in the set */
  intervals: GenericInterval[];
  /** Interval start times to exclude from the given intervals */
  exclusions?: DateTime[];
  /** Maximum number of iterations to search for actual last interval */
  iterationLimit?: number;
}

/** Default values for RecurringIntervalSet.parse */
export interface ParseDefaults {
  /** Default DTSTART value */
  start?: DateTime;
  /** Default UNTIL value */
  until?: DateTime;
  /** Default DURATION value */
  duration?: Duration;
  /** Default TZID (for non-UTC values) */
  zone?: string;
}

/** Options supported by RecurringIntervalSet.parse */
export interface ParseOptions {
  /** Default values for parsing incomplete rules */
  defaults?: ParseDefaults;
  /** Maximum number of iterations to search for actual last interval */
  iterationLimit?: number;
}

interface RecurringIntervalInfo extends RecurringInterval {
  lastEnd: DateTime | null;
}

type GenericIntervalInfo = Interval | RecurringIntervalInfo;

function isRecurringIntervalInfo(i: GenericIntervalInfo): i is RecurringIntervalInfo {
  return !(i instanceof Interval);
}

function getIntervalEnd(i: GenericIntervalInfo): DateTime | null {
  return isRecurringIntervalInfo(i) ? i.lastEnd : i.end;
}

/** Represents a (possibly empty or unbounded) set of recurring recurring intervals */
export class RecurringIntervalSet {
  // sorted first start time value to interval info
  private readonly intervalMap: Map<number, GenericIntervalInfo>;
  // sorted excluded start time value to excluded DateTime
  private readonly exclusionMap: Map<number, DateTime>;

  /** Constructs a RecurringIntervalSet from the given intervals and exclusions */
  public constructor({ intervals, exclusions = [], iterationLimit = defaultIterationLimit }: ConstructorOptions) {
    this.exclusionMap = new Map(
      exclusions
        .map<[number, DateTime]>(e => [e.valueOf(), e])
        .sort((a, b) => a[0] - b[0])
    );

    const intervalEntries: [number, GenericIntervalInfo][] = [];
    let hasRules = false;
    for (const interval of intervals) {
      if (isRecurringInterval(interval)) {
        const firstStart = this.getFirstStartDate(interval);
        if (firstStart) {
          // getLastEndDateTime can change rrule so must be called before destructuring
          const lastEnd = this.getLastEndDateTime(interval, iterationLimit);
          intervalEntries.push([firstStart.valueOf(), { ...interval, lastEnd }]);
          hasRules = true;
        }
      } else {
        const start = interval.start.valueOf();
        if (!this.exclusionMap.has(start)) {
          intervalEntries.push([start, interval]);
        }
      }
    }

    // exclusions are extraneous without rules
    if (!hasRules) {
      this.exclusionMap.clear();
    }

    this.intervalMap = new Map(intervalEntries.sort((a, b) => a[0] - b[0]));
  }

  private getFirstStartDate(rule: RecurringInterval): Date | null {
    const { rrule } = rule;
    const { dtstart } = rrule.options;
    for (let from = dtstart, inc = true; ; ) {
      const next = rrule.after(from, inc);
      if (!next) {
        // empty rule
        return null;
      }
      if (inc && next > dtstart) {
        // fix rule if dtstart is not first instance of recurrence set (ignoring exclusions)
        rule.rrule = rrule.clone();
        rule.rrule.origOptions.dtstart = rule.rrule.options.dtstart = next;
      }
      if (!this.exclusionMap.has(next.valueOf())) {
        // found non-excluded date
        return next;
      }
      // date was excluded, keep searching
      from = next;
      inc = false;
    }
  }

  private getLastEndDateTime(rule: RecurringInterval, limit: number): DateTime | null {
    const { rrule, duration, zone } = rule;
    const { dtstart, count, until } = rrule.options;
    if ((count == null || count > limit) && until == null) {
      // rule is trivially unbounded
      return null;
    }
    // RRULE has reasonable COUNT or UNTIL (but we don't know if the UNTIL time is
    // actually included by the rule) so we need to iterate from the beginning to
    // find the last interval (and we can't use RRule.before because it isn't bounded)
    let lastStart: Date | undefined;
    for (let from = dtstart, inc = true, i = 0; i < limit; ++i) {
      const next = rule.rrule.after(from, inc);
      if (!next) {
        // istanbul ignore else
        if (lastStart) {
          if (until != null && until.valueOf() !== lastStart.valueOf()) {
            // fix rule if until is not last instance of recurrence set
            rule.rrule = rrule.clone();
            rule.rrule.origOptions.until = rule.rrule.options.until = lastStart;
          }
          return rruleDateToDateTime(lastStart, zone).plus(duration);
        }
        // empty rule (should never occur since we got the first start)
        // istanbul ignore next
        return null;
      }
      if (!this.exclusionMap.has(next.valueOf())) {
        // found non-excluded candidate date
        lastStart = next;
      }
      // keep searching until rule is exhausted or limit is reached
      from = next;
      inc = false;
    }
    // hit iteration limit without reaching UNTIL: treat as unbounded
    return null;
  }

  public get rules(): Iterable<GenericInterval> {
    return this.intervalMap.values();
  }

  /** Returns whether this set is empty (i.e. contains no intervals) */
  public get empty(): boolean {
    return !this.intervalMap.size;
  }

  /** Returns whether this set is unbounded (i.e. contains intervals without an end date) */
  public get unbounded(): boolean {
    return Array.from(this.intervalMap.values()).some(r => isRecurringIntervalInfo(r) && r.lastEnd == null);
  }

  /** Returns the start date/time of the first interval in this set, or null if the set is empty */
  public get firstStart(): DateTime | null {
    const first = this.intervalMap.values().next();
    if (!first.done) {
      const { value } = first;
      if (isRecurringInterval(value)) {
        const { rrule, zone } = value;
        return rruleDateToDateTime(rrule.options.dtstart, zone);
      }
      return value.start;
    }
    return null;
  }

  /** Returns the end date/time of the last interval in this set, or null if the set is empty or unbounded */
  public get lastEnd(): DateTime | null {
    return Array.from(this.intervalMap.values(), i => getIntervalEnd(i)).reduce(
      (max, cur) => (!max || (cur != null && cur > max) ? cur : max),
      null
    );
  }

  /** Returns the minimum duration of any interval in this set, or null if the set is empty */
  public get minimumDuration(): Duration | null {
    if (!this.intervalMap.size) return null;
    return Array.from(this.intervalMap.values(), i => getIntervalDuration(i)).reduce((min, cur) =>
      cur < min ? cur : min
    );
  }

  /** Returns the maximum duration of any interval in this set, or null if the set is empty */
  public get maximumDuration(): Duration | null {
    if (!this.intervalMap.size) return null;
    return Array.from(this.intervalMap.values(), i => getIntervalDuration(i)).reduce((max, cur) =>
      cur > max ? cur : max
    );
  }

  /** Returns the all of the intervals starting between the given date/times (inclusive) */
  public between(from: DateTime, until: DateTime): Interval[] {
    const startIntervals: [number, Interval][] = [];

    const fromValue = from.valueOf();
    const untilValue = until.valueOf();
    for (const [start, interval] of this.intervalMap.entries()) {
      if (start > untilValue) break;
      if (isRecurringInterval(interval)) {
        const { zone } = interval;
        for (const date of interval.rrule.between(
          dateTimeToRRuleDate(from, zone),
          dateTimeToRRuleDate(until, zone),
          true
        )) {
          const dateValue = date.valueOf();
          if (!this.exclusionMap.has(dateValue)) {
            const startDateTime = rruleDateToDateTime(date, zone);
            const endDateTime = startDateTime.plus(interval.duration);
            startIntervals.push([dateValue, Interval.fromDateTimes(startDateTime, endDateTime)]);
          }
        }
      } else if (start >= fromValue) {
        startIntervals.push([start, interval]);
      }
    }

    startIntervals.sort((a, b) => a[0] - b[0]);

    return startIntervals.map(e => e[1]);
  }

  /** Returns the first interval starting after the given date/time, or null if there is none */
  public firstAfter(from: DateTime): Interval | null {
    const startIntervals: [number, Interval][] = [];

    const fromValue = from.valueOf();
    for (const [start, interval] of this.intervalMap.entries()) {
      if (isRecurringInterval(interval)) {
        const { zone } = interval;
        for (let fromDate = dateTimeToRRuleDate(from, zone); ; ) {
          const nextDate = interval.rrule.after(fromDate, false);
          if (!nextDate) break;
          const nextValue = nextDate.valueOf();
          if (!this.exclusionMap.has(nextValue)) {
            const startDateTime = rruleDateToDateTime(nextDate, zone);
            const endDateTime = startDateTime.plus(interval.duration);
            startIntervals.push([nextValue, Interval.fromDateTimes(startDateTime, endDateTime)]);
            break;
          }
          fromDate = nextDate;
        }
      } else if (start > fromValue) {
        startIntervals.push([start, interval]);
      }
    }

    if (!startIntervals.length) return null;

    startIntervals.sort((a, b) => a[0] - b[0]);

    return startIntervals[0][1];
  }

  /** Returns an iCalendar-like string representation of this object */
  public toString(): string {
    const lines: string[] = [];
    let lastDuration: Duration | undefined;
    for (const interval of this.intervalMap.values()) {
      const duration = getIntervalDuration(interval);
      if (!lastDuration || lastDuration.valueOf() !== duration.valueOf()) {
        lines.push(`DURATION:${duration.toISO()}`);
        lastDuration = duration;
      }
      if (isRecurringInterval(interval)) {
        const { rrule, zone } = interval;
        const start = rruleDateToDateTime(rrule.options.dtstart, zone);
        lines.push(`DTSTART${formatDateTime(start)}`);
        let rruleStr = rrule.toString().replace(/^DTSTART.*\n/, '');
        // rrule.js uses UTC Z suffix for UNTIL if TZID is not specified (and TZID is broken)
        if (zone?.toLowerCase() !== 'utc') {
          // Safari doesn't support lookbehind so we must use a replacer function
          rruleStr = rruleStr.replace(/(;UNTIL=[0-9T]+)Z/, (_, p1) => p1);
        }
        lines.push(rruleStr);
      } else {
        lines.push(`RDATE${formatDateTime(interval.start)}`);
      }
    }
    for (const dateTime of this.exclusionMap.values()) {
      lines.push(`EXDATE${formatDateTime(dateTime)}`);
    }
    return lines.join('\n');
  }

  /*
   * Parses an iCalendar-like recurring interval set into a new RecurringIntervalSet object.
   * The supported format is based on RFC 5545 (https://tools.ietf.org/html/rfc5545) events
   * with these simplifications and extensions:
   *
   * 1. Only the following properties are supported: DTSTART, DURATION, RRULE, RDATE, EXDATE
   * 2. Only the following parameters are allowed:
   *    - DTSTART/EXDATE/RDATE: TZID
   *    - RDATE: VALUE must be DATE-TIME or PERIOD
   * 3. Only DAILY and larger frequencies are supported
   * 4. Multiple DTSTART, DURATION, RRULE stanzas are allowed
   */
  public static parse(rule: string, options: ParseOptions = {}): RecurringIntervalSet {
    const intervals: GenericInterval[] = [];
    const exclusions: DateTime[] = [];
    const lines = rule.replace(/\r\n[ \t]/g, '').split(/\n+/);
    const { defaults = {} } = options;
    let { start, duration, zone } = defaults;
    const { until } = defaults;
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      const prop = parseProperty(line);
      switch (prop.name) {
        case 'DTSTART': {
          const [tzid = zone] = validatePropertyParameters(prop, ['TZID']);
          start = parseDateTime(prop.value, tzid);
          if (!start.isValid) {
            throw new Error(`Invalid DTSTART value: ${prop.value}`);
          }
          zone = start.zoneName;
          break;
        }

        case 'DURATION':
          validatePropertyParameters(prop);
          duration = Duration.fromISO(prop.value);
          if (!duration.isValid) {
            throw new Error(`Invalid DURATION value: ${prop.value}`);
          }
          break;

        case 'RRULE':
          validatePropertyParameters(prop);
          if (!start) {
            throw new Error(`No start specified for RRULE: ${prop.value}`);
          }
          if (!duration) {
            throw new Error(`No duration specified for RRULE: ${prop.value}`);
          }
          const rruleOpts = RRule.parseString(prop.value);
          switch (rruleOpts.freq) {
            case RRule.YEARLY:
            case RRule.MONTHLY:
            case RRule.WEEKLY:
            case RRule.DAILY:
              break;
            default:
              throw new Error(`Unsupported frequency in RRULE: ${prop.value}`);
          }
          rruleOpts.dtstart = dateTimeToRRuleDate(start);
          if (!rruleOpts.until && until) {
            rruleOpts.until = dateTimeToRRuleDate(until);
          }
          const rrule = new RRule(rruleOpts);
          intervals.push({ rrule, duration, zone: start.zoneName });
          break;

        case 'RDATE': {
          const [tzid = zone, valueType = 'DATE-TIME'] = validatePropertyParameters(prop, ['TZID', 'VALUE']);
          switch (valueType) {
            case 'DATE-TIME':
              if (!duration) {
                throw new Error(`No duration specified for RDATE: ${prop.value}`);
              }
              for (const value of prop.value.split(',')) {
                const start = parseDateTime(value, tzid);
                if (!start.isValid) {
                  throw new Error(`Invalid RDATE value: ${value}`);
                }
                const end = start.plus(duration);
                intervals.push(Interval.fromDateTimes(start, end));
              }
              break;
            case 'PERIOD':
              for (const value of prop.value.split(',')) {
                const period = parsePeriod(value, tzid);
                intervals.push(period);
              }
              break;
            default:
              throw new Error(`Invalid RDATE VALUE type: ${valueType}`);
          }
          break;
        }

        case 'EXDATE':
          const [tzid = zone] = validatePropertyParameters(prop, ['TZID']);
          for (const value of prop.value.split(',')) {
            const exclusion = parseDateTime(value, tzid);
            if (!exclusion.isValid) {
              throw new Error(`Invalid EXDATE value: ${value}`);
            }
            exclusions.push(exclusion);
          }
          break;

        default:
          throw new Error(`Unrecognized recurrence rule property: ${prop.name}`);
      }
    }
    return new RecurringIntervalSet({ intervals, exclusions, iterationLimit: options.iterationLimit });
  }
}
