import CompactPageHeader from '../CompactPageHeader';

export default function StudentPage({ title, action, children, className = '' }) {
  return <div className={`student-page ${className}`}>
    <CompactPageHeader title={title} actions={action} />
    {children}
  </div>;
}
