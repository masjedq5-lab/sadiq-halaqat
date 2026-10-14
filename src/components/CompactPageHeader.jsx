import { CalendarDays } from 'lucide-react';
import { dateKey, formatDate } from '../lib/calendar';
import './CompactPageHeader.css';

export function PageHeaderDate({ label }) {
  const today = dateKey();
  const text = label || formatDate(today, { month: 'long' });
  return <time className="sadiq-heading-date" dateTime={today} aria-label={`تاريخ اليوم: ${text}`}>
    <CalendarDays size={15} aria-hidden="true" />
    <span>{text}</span>
  </time>;
}

export default function CompactPageHeader({ title, actions, children, dateLabel, level = 1, showDate = true }) {
  const Heading = level === 2 ? 'h2' : 'h1';
  return <>
    <header className="sadiq-page-heading">
      <div className="sadiq-heading-line">
        {title && <Heading className="sadiq-heading-title">{title}</Heading>}
        {showDate && <PageHeaderDate label={dateLabel} />}
        {actions && <div className="sadiq-heading-actions">{actions}</div>}
      </div>
    </header>
    {children && <div className="sadiq-heading-context">{children}</div>}
  </>;
}
