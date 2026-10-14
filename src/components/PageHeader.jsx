import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CompactPageHeader from './CompactPageHeader';

export default function PageHeader({ title, backTo = '/admin', backText = 'العودة للوحة المشرف', actions = null }) {
  const navigate = useNavigate();
  return <CompactPageHeader title={title} actions={<>
    {backTo && <button type="button" onClick={() => navigate(backTo)} title={backText} aria-label={backText}>
      <ArrowRight size={17} />{backText}
    </button>}
    {actions}
  </>} />;
}
