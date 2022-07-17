import { expect } from 'chai';
import { DateTime, Duration, Interval } from 'luxon';
import { Frequency, RRule } from 'rrule';
import { ParseOptions, RecurringIntervalSet } from '../src/RecurringIntervalSet';

function isoUtcDateTime(s: string): DateTime {
  return DateTime.fromISO(s, { zone: 'utc' });
}

const m0 = DateTime.fromMillis(0, { zone: 'utc' });
const m9 = isoUtcDateTime('9999-12-31T23:59:59Z');
const pt2h = Duration.fromObject({ hours: 2 });

describe('RecurringIntervalSet', () => {
  it('handles a trivially empty rule', () => {
    const ris = new RecurringIntervalSet({ intervals: [] });
    expect([...ris.rules]).to.have.length(0);
    expect(ris.empty).to.be.true;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.be.null;
    expect(ris.lastEnd).to.be.null;
    expect(ris.minimumDuration).to.be.null;
    expect(ris.maximumDuration).to.be.null;
    expect(ris.between(m0, m9)).to.eql([]);
    expect(ris.firstAfter(m0)).to.be.null;
    expect(ris.toString()).to.equal('');
  });
  it('parses a trivially empty rule', () => {
    const ris = RecurringIntervalSet.parse('');
    expect(ris.empty).to.be.true;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.be.null;
    expect(ris.lastEnd).to.be.null;
    expect(ris.minimumDuration).to.be.null;
    expect(ris.maximumDuration).to.be.null;
    expect(ris.between(m0, m9)).to.eql([]);
    expect(ris.firstAfter(m0)).to.be.null;
    expect(ris.toString()).to.equal('');
  });
  it('handles a somewhat trivially empty rule', () => {
    const ris = RecurringIntervalSet.parse(
      'DTSTART:20200101T090000Z\nDURATION:PT90M\nEXDATE:20200116T110000Z,20200117T110000Z'
    );
    expect(ris.empty).to.be.true;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.be.null;
    expect(ris.lastEnd).to.be.null;
    expect(ris.minimumDuration).to.be.null;
    expect(ris.maximumDuration).to.be.null;
    expect(ris.between(m0, m9)).to.eql([]);
    expect(ris.firstAfter(m0)).to.be.null;
    expect(ris.toString()).to.equal('');
  });
  it('handles a non-trivially empty rule', () => {
    const ris = RecurringIntervalSet.parse(
      'DTSTART:20200116T110000Z\nDURATION:PT90M\nRRULE:FREQ=DAILY;COUNT=1\nRDATE:20200117T110000Z\nEXDATE:20200116T110000Z,20200117T110000Z'
    );
    expect(ris.empty).to.be.true;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.be.null;
    expect(ris.lastEnd).to.be.null;
    expect(ris.minimumDuration).to.be.null;
    expect(ris.maximumDuration).to.be.null;
    expect(ris.between(m0, m9)).to.eql([]);
    expect(ris.firstAfter(m0)).to.be.null;
    expect(ris.toString()).to.equal('');
  });
  it('handles an explicit PERIOD RDATE', () => {
    const ris = RecurringIntervalSet.parse('RDATE;VALUE=PERIOD:20200229T080000Z/20200229T100000Z');
    expect(ris.empty).to.be.false;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.eql(isoUtcDateTime('2020-02-29T08:00:00Z'));
    expect(ris.lastEnd).to.eql(isoUtcDateTime('2020-02-29T10:00:00Z'));
    expect(ris.minimumDuration?.valueOf()).to.eql(pt2h.valueOf());
    expect(ris.maximumDuration?.valueOf()).to.eql(pt2h.valueOf());
    const interval = Interval.fromDateTimes(
      isoUtcDateTime('2020-02-29T08:00:00Z'),
      isoUtcDateTime('2020-02-29T10:00:00Z')
    );
    expect(ris.between(m0, m9)).to.eql([interval]);
    expect(ris.firstAfter(m0)).to.eql(interval);
    expect(ris.firstAfter(m9)).to.be.null;
    expect(ris.toString()).to.equal('DURATION:PT2H\nRDATE:20200229T080000Z');
  });
  const defaultDurationOptions: ParseOptions = { defaults: { duration: pt2h } };
  it('handles an explicit DATE-TIME RDATE', () => {
    const ris = RecurringIntervalSet.parse('RDATE;VALUE=DATE-TIME:20200229T080000Z', defaultDurationOptions);
    expect(ris.empty).to.be.false;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.eql(isoUtcDateTime('2020-02-29T08:00:00Z'));
    expect(ris.lastEnd).to.eql(isoUtcDateTime('2020-02-29T10:00:00Z'));
    expect(ris.minimumDuration?.valueOf()).to.eql(pt2h.valueOf());
    expect(ris.maximumDuration?.valueOf()).to.eql(pt2h.valueOf());
    expect(ris.between(m0, m9)).to.eql([
      Interval.fromDateTimes(isoUtcDateTime('2020-02-29T08:00:00Z'), isoUtcDateTime('2020-02-29T10:00:00Z'))
    ]);
    expect(ris.toString()).to.equal('DURATION:PT2H\nRDATE:20200229T080000Z');
  });
  it('handles RDATE with TZID', () => {
    const ris = RecurringIntervalSet.parse('RDATE;TZID=America/Chicago:20200229T020000', defaultDurationOptions);
    expect(ris.empty).to.be.false;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.eql(DateTime.fromISO('2020-02-29T02:00:00', { zone: 'America/Chicago' }));
    expect(ris.lastEnd).to.eql(DateTime.fromISO('2020-02-29T04:00:00', { zone: 'America/Chicago' }));
    expect(ris.minimumDuration?.valueOf()).to.eql(pt2h.valueOf());
    expect(ris.maximumDuration?.valueOf()).to.eql(pt2h.valueOf());
    expect(ris.between(isoUtcDateTime('2020-02-29T07:00:00Z'), isoUtcDateTime('2020-02-29T09:00:00Z'))).to.eql([
      Interval.fromDateTimes(
        DateTime.fromISO('2020-02-29T02:00:00', { zone: 'America/Chicago' }),
        DateTime.fromISO('2020-02-29T04:00:00', { zone: 'America/Chicago' })
      )
    ]);
    expect(ris.toString()).to.equal('DURATION:PT2H\nRDATE;TZID=America/Chicago:20200229T020000');
  });
  it('excludes RDATEs starting outside of requested range', () => {
    const ris = RecurringIntervalSet.parse('RDATE:20200229T080000Z', defaultDurationOptions);
    expect(ris.empty).to.be.false;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.eql(isoUtcDateTime('2020-02-29T08:00:00Z'));
    expect(ris.lastEnd).to.eql(isoUtcDateTime('2020-02-29T10:00:00Z'));
    expect(ris.minimumDuration?.valueOf()).to.eql(pt2h.valueOf());
    expect(ris.maximumDuration?.valueOf()).to.eql(pt2h.valueOf());
    expect(ris.between(m0, isoUtcDateTime('2020-02-29T07:00:00Z'))).to.eql([]);
    expect(ris.between(isoUtcDateTime('2020-02-29T09:00:00Z'), m9)).to.eql([]);
    expect(ris.toString()).to.equal('DURATION:PT2H\nRDATE:20200229T080000Z');
  });
  it('handles RRULE with TZID', () => {
    const ris = RecurringIntervalSet.parse(
      'DTSTART;TZID=America/Chicago:20191231T090000\nRRULE:FREQ=DAILY;BYDAY=MO,WE,FR;UNTIL=20200110T090000',
      defaultDurationOptions
    );
    expect(ris.empty).to.be.false;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.eql(DateTime.fromISO('2020-01-01T09:00:00', { zone: 'America/Chicago' }));
    expect(ris.lastEnd).to.eql(DateTime.fromISO('2020-01-10T11:00:00', { zone: 'America/Chicago' }));
    expect(ris.minimumDuration?.valueOf()).to.eql(pt2h.valueOf());
    expect(ris.maximumDuration?.valueOf()).to.eql(pt2h.valueOf());
    expect(ris.between(isoUtcDateTime('2019-12-31T00:00:00Z'), isoUtcDateTime('2020-02-01T00:00:00Z'))).to.eql([
      Interval.fromDateTimes(
        DateTime.fromISO('2020-01-01T09:00:00', { zone: 'America/Chicago' }),
        DateTime.fromISO('2020-01-01T11:00:00', { zone: 'America/Chicago' })
      ),
      Interval.fromDateTimes(
        DateTime.fromISO('2020-01-03T09:00:00', { zone: 'America/Chicago' }),
        DateTime.fromISO('2020-01-03T11:00:00', { zone: 'America/Chicago' })
      ),
      Interval.fromDateTimes(
        DateTime.fromISO('2020-01-06T09:00:00', { zone: 'America/Chicago' }),
        DateTime.fromISO('2020-01-06T11:00:00', { zone: 'America/Chicago' })
      ),
      Interval.fromDateTimes(
        DateTime.fromISO('2020-01-08T09:00:00', { zone: 'America/Chicago' }),
        DateTime.fromISO('2020-01-08T11:00:00', { zone: 'America/Chicago' })
      ),
      Interval.fromDateTimes(
        DateTime.fromISO('2020-01-10T09:00:00', { zone: 'America/Chicago' }),
        DateTime.fromISO('2020-01-10T11:00:00', { zone: 'America/Chicago' })
      )
    ]);
    expect(ris.toString()).to.equal(
      'DURATION:PT2H\nDTSTART;TZID=America/Chicago:20200101T090000\nRRULE:FREQ=DAILY;BYDAY=MO,WE,FR;UNTIL=20200110T090000'
    );
  });
  it('formats RRULE UNTIL without TZ', () => {
    const ris = new RecurringIntervalSet({
      intervals: [
        {
          rrule: new RRule({
            dtstart: new Date(Date.UTC(2020, 0, 1)),
            freq: Frequency.DAILY,
            until: new Date(Date.UTC(2020, 1, 1))
          }),
          duration: pt2h
        }
      ]
    });
    expect(ris.toString()).to.equal('DURATION:PT2H\nDTSTART:20200101T000000Z\nRRULE:FREQ=DAILY;UNTIL=20200201T000000');
  });
  it('handles a complex rule', () => {
    const ris = RecurringIntervalSet.parse(
      `DTSTART:\r\n\t20191231T090000Z
RRULE:FREQ=DAILY;BYDAY=MO,WE,FR;UNTIL=20200110T090000Z

DTSTART:20200113T110000Z
DURATION:PT90M
RRULE:FREQ=DAILY;BYDAY=TU,TH;UNTIL=20200124T110000Z
RDATE:20200128T100000Z,20200130T110000Z
RDATE;VALUE=PERIOD:20200131T100000Z/PT3H
EXDATE:20200116T110000Z,20200117T110000Z`,
      defaultDurationOptions
    );
    expect(ris.empty).to.be.false;
    expect(ris.unbounded).to.be.false;
    expect(ris.firstStart).to.eql(isoUtcDateTime('2020-01-01T09:00:00Z'));
    expect(ris.lastEnd).to.eql(isoUtcDateTime('2020-01-31T13:00:00Z'));
    expect(ris.minimumDuration?.valueOf()).to.eql(90 * 60 * 1000);
    expect(ris.maximumDuration?.valueOf()).to.eql(3 * 60 * 60 * 1000);
    expect(ris.between(m0, m9)).to.eql([
      Interval.fromDateTimes(isoUtcDateTime('2020-01-01T09:00:00Z'), isoUtcDateTime('2020-01-01T11:00:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-03T09:00:00Z'), isoUtcDateTime('2020-01-03T11:00:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-06T09:00:00Z'), isoUtcDateTime('2020-01-06T11:00:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-08T09:00:00Z'), isoUtcDateTime('2020-01-08T11:00:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-10T09:00:00Z'), isoUtcDateTime('2020-01-10T11:00:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-14T11:00:00Z'), isoUtcDateTime('2020-01-14T12:30:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-21T11:00:00Z'), isoUtcDateTime('2020-01-21T12:30:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-23T11:00:00Z'), isoUtcDateTime('2020-01-23T12:30:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-28T10:00:00Z'), isoUtcDateTime('2020-01-28T11:30:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-30T11:00:00Z'), isoUtcDateTime('2020-01-30T12:30:00Z')),
      Interval.fromDateTimes(isoUtcDateTime('2020-01-31T10:00:00Z'), isoUtcDateTime('2020-01-31T13:00:00Z'))
    ]);
    expect(ris.firstAfter(isoUtcDateTime('2020-01-13T07:00:00Z'))).to.eql(
      Interval.fromDateTimes(isoUtcDateTime('2020-01-14T11:00:00Z'), isoUtcDateTime('2020-01-14T12:30:00Z'))
    );
    expect(ris.firstAfter(isoUtcDateTime('2020-01-14T11:00:00Z'))).to.eql(
      Interval.fromDateTimes(isoUtcDateTime('2020-01-21T11:00:00Z'), isoUtcDateTime('2020-01-21T12:30:00Z'))
    );
    expect(ris.unbounded).to.be.false;
    expect(ris.minimumDuration?.toMillis()).to.eql(Duration.fromObject({ minutes: 90 }).toMillis());
    expect(ris.maximumDuration?.toMillis()).to.eql(Duration.fromObject({ hours: 3 }).toMillis());
    expect(ris.toString()).to.equal(`DURATION:PT2H
DTSTART:20200101T090000Z
RRULE:FREQ=DAILY;BYDAY=MO,WE,FR;UNTIL=20200110T090000Z
DURATION:PT90M
DTSTART:20200114T110000Z
RRULE:FREQ=DAILY;BYDAY=TU,TH;UNTIL=20200123T110000Z
RDATE:20200128T100000Z
RDATE:20200130T110000Z
DURATION:PT3H
RDATE:20200131T100000Z
EXDATE:20200116T110000Z
EXDATE:20200117T110000Z`);
  });
  it('handles overlapping rules', () => {
    const ris = RecurringIntervalSet.parse(
      `DURATION:PT2H
DTSTART:20200101T090000Z
RRULE:FREQ=DAILY;BYDAY=MO,WE,FR;UNTIL=20200210T090000Z
DURATION:PT90M
DTSTART:20200114T110000Z
RRULE:FREQ=DAILY;BYDAY=TU,TH;UNTIL=20200123T110000Z`
    );
    expect(ris.lastEnd).to.eql(isoUtcDateTime('2020-02-10T11:00:00Z'));
  });
  const start = isoUtcDateTime('2020-01-01T09:00:00Z');
  const parseOptions: ParseOptions = { defaults: { start, duration: pt2h }, iterationLimit: 100 };
  it('detects unbounded sets', () => {
    expect(RecurringIntervalSet.parse('', parseOptions).unbounded).to.be.false;
    expect(RecurringIntervalSet.parse('RDATE:20200128T100000Z', parseOptions).unbounded).to.be.false;
    expect(RecurringIntervalSet.parse('RRULE:FREQ=WEEKLY;UNTIL=20210101T090000Z', parseOptions).unbounded).to.be.false;
    expect(RecurringIntervalSet.parse('RRULE:FREQ=MONTHLY;COUNT=14', parseOptions).unbounded).to.be.false;
    expect(RecurringIntervalSet.parse('RRULE:FREQ=YEARLY', parseOptions).unbounded).to.be.true;
  });
  it('treats more intervals than iteration limit as unbounded', () => {
    expect(RecurringIntervalSet.parse('RRULE:FREQ=DAILY;UNTIL=50200110T090000Z', parseOptions).unbounded).to.be.true;
  });
  it('allows default UNTIL', () => {
    const until = isoUtcDateTime('2020-02-01T09:00:00Z');
    const ris = RecurringIntervalSet.parse('RRULE:FREQ=DAILY', { defaults: { start, duration: pt2h, until } });
    expect(ris.unbounded).to.be.false;
    expect(ris.lastEnd).to.eql(isoUtcDateTime('2020-02-01T11:00:00Z'));
  });
  it('throws on invalid rule property', () => {
    expect(() => RecurringIntervalSet.parse('X:Y')).throws('Unrecognized recurrence rule property: X');
  });
  it('throws on invalid DTSTART', () => {
    expect(() => RecurringIntervalSet.parse('DTSTART:X')).throws('Invalid DTSTART value');
  });
  it('throws on invalid DURATION', () => {
    expect(() => RecurringIntervalSet.parse('DURATION:X')).throws('Invalid DURATION value');
  });
  it('throws on invalid EXDATE', () => {
    expect(() => RecurringIntervalSet.parse('EXDATE:X')).throws('Invalid EXDATE value');
  });
  it('throws on invalid RDATE', () => {
    expect(() => RecurringIntervalSet.parse('RDATE:X', defaultDurationOptions)).throws('Invalid RDATE value');
  });
  it('throws on invalid RDATE VALUE type', () => {
    expect(() => RecurringIntervalSet.parse('RDATE;VALUE=X:X', defaultDurationOptions)).throws(
      'Invalid RDATE VALUE type'
    );
  });
  it('throws on RDATE without duration', () => {
    expect(() => RecurringIntervalSet.parse('RDATE:20200128T100000Z')).throws('No duration specified for RDATE');
  });
  it('throws on RRULE without start', () => {
    expect(() => RecurringIntervalSet.parse('RRULE:FREQ=DAILY')).throws('No start specified for RRULE');
  });
  it('throws on RRULE without duration', () => {
    expect(() => RecurringIntervalSet.parse('RRULE:FREQ=DAILY', { defaults: { start } })).throws(
      'No duration specified for RRULE'
    );
  });
  it('throws on invalid RRULE frequency', () => {
    expect(() => RecurringIntervalSet.parse('RRULE:FREQ=HOURLY', parseOptions)).throws(
      'Unsupported frequency in RRULE'
    );
  });
});
