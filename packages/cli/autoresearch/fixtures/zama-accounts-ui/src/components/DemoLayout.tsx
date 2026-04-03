import DemoSidebar, { type DemoSidebarProps } from './DemoSidebar';

export type { SidebarStep, StepGroup, SidebarStepStatus } from './DemoSidebar';

type DemoLayoutProps = DemoSidebarProps & {
  children: React.ReactNode;
};

export default function DemoLayout({ children, ...sidebarProps }: DemoLayoutProps) {
  return (
    <div className="flex gap-6 min-h-[calc(100vh-4rem)]">
      <DemoSidebar {...sidebarProps} />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
