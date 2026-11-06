import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useActivePill } from './useActivePill';

describe('useActivePill measured geometry', () => {
  it.each(['ltr', 'rtl'])('keeps the pill under the measured item in %s', (direction) => {
    const track = document.createElement('div');
    track.style.direction = direction;
    const active = document.createElement('button');
    active.dataset.active = 'true';
    track.append(active);
    Object.defineProperties(active, { offsetLeft: { value: 60 }, offsetWidth: { value: 20 }, offsetHeight: { value: 12 } });
    const { result } = renderHook(() => useActivePill(track, '[data-active="true"]', []));
    expect(result.current).toMatchObject({
      insetInlineStart: direction === 'rtl' ? 'auto' : 0,
      insetInlineEnd: direction === 'rtl' ? 0 : 'auto',
      width: 20,
      transform: 'translateX(60px)',
    });
  });
});
