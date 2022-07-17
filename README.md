# luxon-rrule: Luxon-based Recurring Interval Sets

[![npm](https://img.shields.io/npm/v/luxon-rrule)](https://www.npmjs.com/package/luxon-rrule)
[![CircleCI](https://img.shields.io/circleci/build/github/trevorr/luxon-rrule)](https://circleci.com/gh/trevorr/luxon-rrule)

Recurring interval sets based on [iCalendar](https://tools.ietf.org/html/rfc5545) and [Luxon](https://moment.github.io/luxon).

## Features

- Parses, canonicalizes, and formats recurring interval sets in iCalendar format.
- Supports arbitrary time zones naturally, easily, and safely.
- Safely handles very large or unbounded recurrences (avoiding denial of service).

## Installation

```sh
npm install luxon-rrule
```

## Usage

```ts
import { RecurringIntervalSet } from 'luxon-rrule';

const ris = RecurringIntervalSet.parse(
  `DTSTART:20191231T090000Z
RRULE:FREQ=DAILY;BYDAY=MO,WE,FR;UNTIL=20200110T090000Z
DTSTART:20200113T110000Z
DURATION:PT90M
RRULE:FREQ=DAILY;BYDAY=TU,TH;UNTIL=20200124T110000Z
RDATE:20200128T100000Z,20200130T110000Z
RDATE;VALUE=PERIOD:20200131T100000Z/PT3H
EXDATE:20200116T110000Z,20200117T110000Z`,
  { defaults: { duration: Duration.fromObject({ hours: 2 }) } }
);
console.log('First start:', ris.firstStart?.toISO()); // 2020-01-01T09:00:00.000Z
console.log('Last end:', ris.lastEnd?.toISO()); // 2020-01-31T13:00:00.000Z
console.log('Minimum duration:', ris.minimumDuration?.toISO()); // PT90M
console.log('Maximum duration:', ris.maximumDuration?.toISO()); // PT3H
console.log(
  'Occurrences:',
  ris
    .between(DateTime.fromObject({ year: 2020 }), DateTime.fromObject({ year: 2021 }))
    .map(i => `${i.start.toISO()} - ${i.end.toISO()}`)
    .join('\n')
);
// 2020-01-01T09:00:00.000Z - 2020-01-01T11:00:00.000Z
// 2020-01-03T09:00:00.000Z - 2020-01-03T11:00:00.000Z
// 2020-01-06T09:00:00.000Z - 2020-01-06T11:00:00.000Z
// 2020-01-08T09:00:00.000Z - 2020-01-08T11:00:00.000Z
// 2020-01-10T09:00:00.000Z - 2020-01-10T11:00:00.000Z
// 2020-01-14T11:00:00.000Z - 2020-01-14T12:30:00.000Z
// 2020-01-21T11:00:00.000Z - 2020-01-21T12:30:00.000Z
// 2020-01-23T11:00:00.000Z - 2020-01-23T12:30:00.000Z
// 2020-01-28T10:00:00.000Z - 2020-01-28T11:30:00.000Z
// 2020-01-30T11:00:00.000Z - 2020-01-30T12:30:00.000Z
// 2020-01-31T10:00:00.000Z - 2020-01-31T13:00:00.000Z
```

## License

`luxon-rrule` is available under the [ISC license](LICENSE).
