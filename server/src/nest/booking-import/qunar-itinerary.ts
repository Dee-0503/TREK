import { findByIata } from '../airports/airports.data';
import type { KiReservation } from './kitinerary.types';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function localInstant(date: string, time: string, timezone: string): number {
  const wall = Date.parse(`${date}T${time}:00Z`);
  let instant = wall;
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' });
  for (let i = 0; i < 2; i++) {
    const offset = formatter.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value;
    const match = offset?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
    const minutes = match ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '+' ? 1 : -1) : 0;
    instant = wall - minutes * 60_000;
  }
  return instant;
}

/** Qunar's bilingual table places both airports before the flight row in PDF text order. */
export function parseQunarItinerary(text: string): KiReservation[] {
  if (!text.includes('QUNAR.COM') || !text.includes('AIRLINE PNR:') || !text.includes('ORIGIN/DES')) return [];
  const reservations = new Map<string, KiReservation>();
  for (const page of text.split(/\bITINERARY\b/).slice(1)) {
    const reference = page.match(/AIRLINE PNR:\s*([A-Z0-9]{5,8})\b/)?.[1];
    const table = page.split('ORIGIN/DES')[1]?.split(/行李|Baggage/)[0];
    if (!reference || !table || !table.includes('ARRTIME') || !table.includes('PERIOD')) continue;
    const row =
      /\b([A-Z]{3})-\S+\s+([A-Z]{3})-\S+\s+([A-Z0-9]{2})(\d{2,4})\s+(Economy|Business|First|Premium\s+Economy)\s+(\d{1,2})([A-Z]{3})\s+([0-2]\d:[0-5]\d)\s+([0-2]\d:[0-5]\d)\s+(\d{4}-\d{2}-\d{2})\s+OK\b/g;
    const rows = [...table.matchAll(row)];
    const flightRows = [...table.matchAll(/\b[A-Z0-9]{2}\d{2,4}\s+(?:Economy|Business|First|Premium\s+Economy)\b/g)];
    // A partial table must remain an unsuccessful import, so missing legs cannot go unnoticed.
    if (rows.length !== flightRows.length) return [];
    for (const match of rows) {
      const [, from, to, airline, flight, cabin, day, month, departure, arrival, date] = match;
      const origin = findByIata(from);
      const destination = findByIata(to);
      const calendar = new Date(`${date}T00:00:00Z`);
      if (
        !origin?.tz ||
        !destination?.tz ||
        from === to ||
        !Number.isFinite(calendar.getTime()) ||
        calendar.toISOString().slice(0, 10) !== date ||
        calendar.getUTCDate() !== Number(day) ||
        MONTHS[calendar.getUTCMonth()] !== month ||
        Number(departure.slice(0, 2)) > 23 ||
        Number(arrival.slice(0, 2)) > 23
      )
        return [];

      // PERIOD is the departure date. Infer an overnight arrival using airport timezones.
      let arrivalDate = date;
      const departureMs = localInstant(date, departure, origin.tz);
      if (localInstant(arrivalDate, arrival, destination.tz) <= departureMs) {
        calendar.setUTCDate(calendar.getUTCDate() + 1);
        arrivalDate = calendar.toISOString().slice(0, 10);
      }
      const duration = localInstant(arrivalDate, arrival, destination.tz) - departureMs;
      if (duration <= 0 || duration > 24 * 3600_000) return [];
      const key = [reference, airline, flight, from, to, date, departure, arrivalDate, arrival].join('|');
      // A multi-passenger document repeats the same journey, not additional flights.
      reservations.set(key, {
        '@type': 'FlightReservation',
        reservationNumber: reference,
        class: cabin,
        reservationFor: {
          '@type': 'Flight',
          airline: { '@type': 'Airline', iataCode: airline },
          flightNumber: flight,
          departureAirport: { '@type': 'Airport', iataCode: from },
          arrivalAirport: { '@type': 'Airport', iataCode: to },
          departureTime: { '@type': 'QDateTime', '@value': `${date}T${departure}:00`, timezone: origin.tz },
          arrivalTime: { '@type': 'QDateTime', '@value': `${arrivalDate}T${arrival}:00`, timezone: destination.tz },
        },
      });
    }
  }
  // Fares in this template are per passenger and cover the round trip; leave amounts for review.
  return [...reservations.values()];
}
