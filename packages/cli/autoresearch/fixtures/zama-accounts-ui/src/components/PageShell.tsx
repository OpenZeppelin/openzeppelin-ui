import Breadcrumb, { type BreadcrumbSegment } from './Breadcrumb';

interface PageShellProps {
  breadcrumbs: BreadcrumbSegment[];
  /** Optional right-side content (e.g. ConnectButton) */
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Max width class for content. Defaults to max-w-2xl */
  maxWidth?: string;
}

export default function PageShell({ breadcrumbs, actions, children, maxWidth = 'max-w-2xl' }: PageShellProps) {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className={`${maxWidth} mx-auto flex items-center justify-between px-4 py-2`}>
          <Breadcrumb segments={breadcrumbs} />
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
      <div className={`${maxWidth} mx-auto p-4 md:p-8`}>
        {children}
      </div>
    </div>
  );
}
