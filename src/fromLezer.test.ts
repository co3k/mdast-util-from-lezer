import { describe, test, it, expect } from 'vitest';
import { fromLezer } from './fromLezer.js';

test('fromLezer', () => {
  describe('get an empty array', () => {
    it('return root', () => {
      expect(fromLezer([])).toEqual({});
    });
  });
});
