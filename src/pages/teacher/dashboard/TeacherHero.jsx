import CompactPageHeader from '../../../components/CompactPageHeader';
import { BookOpen } from 'lucide-react';

const PERIOD_LABELS = {
  after_fajr: 'بعد الفجر', after_dhuhr: 'بعد الظهر', after_asr: 'بعد العصر',
  after_maghrib: 'بعد المغرب', after_isha: 'بعد العشاء',
};

export default function TeacherHero({ teacher, assignments = [], activeHalaqaId, onHalaqaChange, assignment, actions }) {
  const name = teacher?.full_name?.trim().split(/\s+/)[0] || 'معلمنا';
  return <CompactPageHeader title={`حيّاك الله، ${name}`} actions={actions}>
    <label className="teacher-heading-halaqa">
      <BookOpen size={14} aria-hidden="true" />
      {assignments.length > 1 ? <>
        <span>الحلقة</span>
        <select value={activeHalaqaId ?? ''} onChange={(event) => onHalaqaChange(Number(event.target.value))}>
          {assignments.map((item) => <option value={item.halaqa_id} key={item.halaqa_id}>
            {item.halaqa_name} — {item.mosque_name}
          </option>)}
        </select>
      </> : <strong>{assignment?.halaqa_name || assignments[0]?.halaqa_name || 'الحلقة الحالية'}</strong>}
    </label>
    {PERIOD_LABELS[assignment?.halaqa_period] && <span className="teacher-heading-period">{PERIOD_LABELS[assignment.halaqa_period]}</span>}
  </CompactPageHeader>;
}
