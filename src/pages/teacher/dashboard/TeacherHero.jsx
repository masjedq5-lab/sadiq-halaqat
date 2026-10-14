import { displayDateFormatter } from '../../../lib/calendar';
import CompactPageHeader from '../../../components/CompactPageHeader';
import { BookOpen, Building2, Users } from 'lucide-react';

const PERIOD_LABELS = {
  after_fajr: 'بعد الفجر', after_dhuhr: 'بعد الظهر', after_asr: 'بعد العصر',
  after_maghrib: 'بعد المغرب', after_isha: 'بعد العشاء',
};

export default function TeacherHero({ teacher, assignments = [], activeHalaqaId, onHalaqaChange, assignment, stats = {}, actions }) {
  const todayLabel = displayDateFormatter({ timeZone: 'Asia/Riyadh', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return <>
    <CompactPageHeader title={`حيّاك الله، ${teacher?.full_name || 'المعلم'}`} dateLabel={todayLabel} actions={actions} />
    <div className="teacher-heading-tools">
      <label className="teacher-heading-halaqa">
        <BookOpen size={16} aria-hidden="true" />
        <span>الحلقة الحالية</span>
        <select value={activeHalaqaId ?? ''} onChange={(event) => onHalaqaChange(Number(event.target.value))}>
          {assignments.map((item) => <option value={item.halaqa_id} key={item.halaqa_id}>
            {item.halaqa_name} — {item.mosque_name}
          </option>)}
        </select>
      </label>
      <div className="teacher-heading-summary">
        <span><Building2 size={14} />{assignment?.mosque_name || '—'}</span>
        <span>{assignment?.teacher_role === 'main' ? 'معلم رئيسي' : 'معلم مساعد'}</span>
        <span>{PERIOD_LABELS[assignment?.halaqa_period] || 'غير محدد'}</span>
        <span><Users size={14} /><strong>{stats.studentsCount ?? 0}</strong> طالب</span>
        <span><strong>{stats.presentCount ?? 0}</strong> حاضر اليوم</span>
        <span><strong>{stats.recitationsCount ?? 0}</strong> تسميع اليوم</span>
        <span>{assignments.length} {assignments.length === 1 ? 'حلقة' : 'حلقات'}</span>
      </div>
    </div>
  </>;
}
