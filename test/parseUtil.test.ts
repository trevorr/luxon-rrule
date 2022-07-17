import { expect } from 'chai';
import { parsePeriod } from '../src/parseUtil';

describe('parseUtil', () => {
  describe('parsePeriod', () => {
    it('throws if no slash', () => {
      expect(() => parsePeriod('')).throws('Invalid PERIOD value: ');
    });
    it('throws if no multiple slashes', () => {
      expect(() => parsePeriod('//')).throws('Invalid PERIOD value: //');
    });
    it('throws if invalid start date', () => {
      expect(() => parsePeriod('A/B')).throws('Invalid start date in PERIOD value: A');
    });
    it('throws if invalid end date', () => {
      expect(() => parsePeriod('20000101T000000Z/B')).throws('Invalid end date in PERIOD value: B');
    });
    it('throws if invalid duration', () => {
      expect(() => parsePeriod('20000101T000000Z/PX')).throws('Invalid duration in PERIOD value: PX');
    });
    it('throws if end date is before start date', () => {
      expect(() => parsePeriod('20000102T000000Z/20000101T000000Z')).throws('End date is before start date in PERIOD value');
    });
  });
});
