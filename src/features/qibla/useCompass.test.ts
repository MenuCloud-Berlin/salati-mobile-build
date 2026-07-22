import { angleLerp, headingFromOrientationEvent } from './useCompass';

describe('headingFromOrientationEvent', () => {
  it('nutzt webkitCompassHeading direkt (iOS Safari, 0° = Norden im Uhrzeigersinn)', () => {
    expect(headingFromOrientationEvent({ webkitCompassHeading: 137, alpha: 20 })).toBe(137);
    expect(headingFromOrientationEvent({ webkitCompassHeading: 370, alpha: null })).toBe(10);
  });

  it('wandelt absolutes alpha (gegen Uhrzeigersinn) in Kompass-Heading um', () => {
    expect(headingFromOrientationEvent({ absolute: true, alpha: 0 })).toBe(0);
    expect(headingFromOrientationEvent({ absolute: true, alpha: 90 })).toBe(270);
    expect(headingFromOrientationEvent({ absolute: true, alpha: 350 })).toBe(10);
  });

  it('verwirft relative (nicht-absolute) alpha-Werte — kein irreführender Kompass', () => {
    expect(headingFromOrientationEvent({ absolute: false, alpha: 90 })).toBeNull();
    expect(headingFromOrientationEvent({ alpha: 90 })).toBeNull();
    expect(headingFromOrientationEvent({ absolute: true, alpha: null })).toBeNull();
  });
});

describe('angleLerp', () => {
  it('interpolates linearly for a normal (non-wrapping) case', () => {
    expect(angleLerp(0, 90, 0.5)).toBeCloseTo(45, 5);
  });

  it('takes the short way across the 0/360 boundary', () => {
    // von 350 nach 10 ist die kürzeste Route +20 (über 0), nicht -340
    expect(angleLerp(350, 10, 0.5)).toBeCloseTo(0, 5);
  });

  it('is a no-op at t=0', () => {
    expect(angleLerp(123, 45, 0)).toBeCloseTo(123, 5);
  });
});
