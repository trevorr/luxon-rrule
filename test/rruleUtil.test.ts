import { expect } from 'chai';
import { dateTimeToRRuleDate, rruleDateToDateTime } from '../src/rruleUtil';
import { DateTime } from 'luxon';

describe('CalProperty', () => {
  describe('rruleDateToDateTime', () => {
    it('uses UTC if zone argument is omitted', () => {
      const dt = rruleDateToDateTime(new Date(Date.UTC(2000, 0, 1, 0, 0, 0)));
      expect(dt.toString()).to.equal('2000-01-01T00:00:00.000Z');
    });
  });
  describe('dateTimeToRRuleDate', () => {
    it('uses UTC if zone argument is omitted', () => {
      const dt = DateTime.fromObject({ year: 2000, month: 1, day: 1 });
      const d = dateTimeToRRuleDate(dt);
      expect(d.toISOString()).to.equal('2000-01-01T00:00:00.000Z');
    });
  });
});
