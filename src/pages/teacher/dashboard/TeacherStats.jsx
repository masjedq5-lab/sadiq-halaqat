import { Award, ClipboardCheck, UserX } from 'lucide-react';

const DAILY_ITEMS = [
  { key: 'presentCount', title: 'حاضر اليوم', icon: ClipboardCheck },
  { key: 'absentCount', title: 'غائب اليوم', icon: UserX },
  { key: 'recitationsCount', title: 'تسميع اليوم', icon: Award },
];

export default function TeacherStats({ stats = {} }) {
  return <section className="td-daily-summary" aria-label="ملخص العمل اليومي">
    <dl>
      {DAILY_ITEMS.map(({ key, title, icon: Icon }) => <div key={key}>
        <dt><Icon size={14} aria-hidden="true" />{title}</dt>
        <dd>{stats[key] ?? 0}</dd>
      </div>)}
    </dl>
  </section>;
}
