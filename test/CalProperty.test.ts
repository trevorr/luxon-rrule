import { expect } from 'chai';
import { parseProperty, validatePropertyParameters } from '../src/CalProperty';

describe('CalProperty', () => {
  describe('parseProperty', () => {
    it('throws on an empty string', () => {
      expect(() => parseProperty('')).throws('Invalid recurrence property syntax: ');
    });
    it('throws on invalid property name', () => {
      expect(() => parseProperty('1:X')).throws('Invalid recurrence property syntax: 1:X');
    });
    it('throws on invalid parameter name', () => {
      expect(() => parseProperty('A;1=2:X')).throws('Invalid recurrence property parameter syntax: A;1=2:X');
    });
  });
  describe('validatePropertyParameters', () => {
    it('throws on unexpected property', () => {
      expect(() => {
        validatePropertyParameters({ name: 'P', value: 'V', parameters: { A: 'B' } });
      }).throws('Unexpected parameter A for property P');
    });
  });
});
