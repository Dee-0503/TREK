import { mapReservations } from '../../../../src/nest/booking-import/kitinerary-mapper';
import type { KiFlight } from '../../../../src/nest/booking-import/kitinerary.types';
import { parseQunarItinerary } from '../../../../src/nest/booking-import/qunar-itinerary';

import { describe, expect, it } from 'vitest';

// Synthetic booking reference only; no passenger, ticket or identity data from a real document.
const page = `ITINERARY
AIRLINE PNR: TEST12
DATE OF ISSUE: 2026-10-21
ORIGIN/DES FLIGHT CLASS DATE TIME ARRTIME PERIOD STATUS TERMINAL
SZX-shenzhen
PKX-Beijing MU6662 Economy 5FEB 07:20 10:25 2027-02-05 OK T3-
PKX-Beijing
SVO-MOSCOW MU2075 Economy 5FEB 11:55 15:30 2027-02-05 OK -C
SVO-MOSCOW
PKX-Beijing MU2076 Economy 19FEB 17:15 05:50 2027-02-19 OK C-
PKX-Beijing
SZX-shenzhen MU6661 Economy 20FEB 09:05 12:35 2027-02-20 OK -T3
Baggage(Adult)
FARE: CNY 997.00 TAX: CNY 2741.00
QUNAR.COM`;

describe('Qunar bilingual itinerary', () => {
  it('uses flight year, resolves overnight arrival and deduplicates passenger copies', () => {
    const reservations = parseQunarItinerary(`${page}\n${page}`);
    expect(reservations).toHaveLength(4);
    const inbound = reservations[2].reservationFor as KiFlight;
    expect(inbound.departureTime).toEqual({
      '@type': 'QDateTime',
      '@value': '2027-02-19T17:15:00',
      timezone: 'Europe/Moscow',
    });
    expect(inbound.arrivalTime).toMatchObject({ '@value': '2027-02-20T05:50:00', timezone: 'Asia/Shanghai' });
    const { items, warnings } = mapReservations(reservations, 'test.pdf');
    expect(warnings).toEqual([]);
    expect(items).toHaveLength(2);
    expect(items.map((item) => [item.reservation_time, item.reservation_end_time])).toEqual([
      ['2027-02-05T07:20:00', '2027-02-05T15:30:00'],
      ['2027-02-19T17:15:00', '2027-02-20T12:35:00'],
    ]);
    expect(items.map((item) => item.endpoints?.map((ep) => ep.code))).toEqual([
      ['SZX', 'PKX', 'SVO'],
      ['SVO', 'PKX', 'SZX'],
    ]);
    expect(items.every((item) => item.metadata?.price == null)).toBe(true);
  });

  it('does not invent an extra day for a westbound arrival with an earlier local clock', () => {
    const input = page.replace('11:55 15:30', '11:55 10:30');
    const flight = parseQunarItinerary(input)[1].reservationFor as KiFlight;
    expect(flight.arrivalTime).toMatchObject({ '@value': '2027-02-05T10:30:00' });
  });

  it('rejects unrelated documents, inconsistent dates, impossible times and unknown airports', () => {
    expect(parseQunarItinerary(page.replaceAll('QUNAR.COM', 'OTHER.COM'))).toEqual([]);
    for (const replacement of ['2027-02-30', '2027-03-05']) {
      expect(parseQunarItinerary(page.replaceAll('2027-02-05', replacement))).toEqual([]);
    }
    expect(parseQunarItinerary(page.replace('07:20', '29:20'))).toEqual([]);
    expect(parseQunarItinerary(page.replace('07:20', 'invalid'))).toEqual([]);
    expect(parseQunarItinerary(page.replace('SZX-shenzhen', 'ZZZ-nowhere'))).toEqual([]);
  });
});
