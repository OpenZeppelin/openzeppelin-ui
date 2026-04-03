import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbSegment {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  /** Optional callback before navigation. Return false to prevent default navigate(). */
  onNavigate?: (to: string) => void;
}

export default function Breadcrumb({ segments, onNavigate }: BreadcrumbProps) {
  const navigate = useNavigate();

  const handleClick = (to: string) => {
    if (onNavigate) {
      onNavigate(to);
    }
    navigate(to);
  };

  return (
    <nav className="flex items-center gap-1 text-sm">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
            {isLast || !seg.to ? (
              <span className={isLast ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                {seg.label}
              </span>
            ) : (
              <button
                onClick={() => handleClick(seg.to!)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {seg.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
