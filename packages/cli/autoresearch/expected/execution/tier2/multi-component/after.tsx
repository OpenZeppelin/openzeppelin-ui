import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@openzeppelin/ui-components';

export function LoginForm() {
  const [email, setEmail] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <Button type="submit">Sign In</Button>
      </CardContent>
    </Card>
  );
}
