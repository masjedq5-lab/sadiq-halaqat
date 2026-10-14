import CompactPageHeader from '../CompactPageHeader';

export default function StudentPage({ title, action, context, children, className = '' }) {
  return <div className={`student-page ${className}`}>
    <CompactPageHeader title={title} actions={action}>{context}</CompactPageHeader>
    {children}
  </div>;
}
