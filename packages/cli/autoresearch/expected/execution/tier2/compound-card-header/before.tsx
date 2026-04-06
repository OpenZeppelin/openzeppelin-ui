import { Clock, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TeamCardProps {
  team: {
    name: string;
    role: string;
    memberCount: number;
    lastActive: string;
    status: 'online' | 'away' | 'offline';
  };
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{team.name}</CardTitle>
          <Badge>{team.status}</Badge>
        </div>
        <CardDescription>{team.role}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {team.memberCount} members
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {team.lastActive}
        </span>
      </CardContent>
    </Card>
  );
}
