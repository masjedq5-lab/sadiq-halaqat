import { calendarParts, dateObject, daysInMonth, fromCalendar, monthRange, shiftDays } from './calendar.js';

export function dateAllowed(iso, min, max) {
  return Boolean(iso && (!min || iso >= min) && (!max || iso <= max));
}
export function boundedDate(iso, min, max) {
  return min && iso < min ? min : max && iso > max ? max : iso;
}
export function moveCalendarMonth(iso, offset, calendar) {
  const p = calendarParts(iso, calendar);
  const index = p.year * 12 + p.month - 1 + offset;
  const year = Math.floor(index / 12), month = index % 12 + 1;
  return fromCalendar({ year, month, day: Math.min(p.day, daysInMonth(year, month, calendar)) }, calendar);
}
export function calendarMonthGrid(iso, calendar) {
  const period = monthRange(iso, calendar);
  const first = shiftDays(period.start, -dateObject(period.start).getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = shiftDays(first, index);
    return { date, day: calendarParts(date, calendar).day, outside: date < period.start || date >= period.nextStart };
  });
}
