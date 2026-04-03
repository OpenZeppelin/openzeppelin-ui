import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@openzeppelin/ui-components';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'paused' | 'completed';
    memberCount: number;
    lastActivity: Date;
  };
  onSelect: (id: string) => void;
  className?: string;
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
};

export function ProjectCard({ project, onSelect, className }: ProjectCardProps) {
  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={() => onSelect(project.id)}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <CardDescription className="mt-1">{project.description}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {project.memberCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(project.lastActivity, { addSuffix: true })}
            </span>
          </div>
          <Badge className={statusColors[project.status]}>
            {project.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
