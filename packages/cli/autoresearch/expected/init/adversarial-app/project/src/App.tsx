import { Overview } from './views/Overview';
import { Configuration } from './views/Configuration';
import { LegacyForm } from './views/LegacyForm';

export function App() {
  return (
    <div>
      <Overview />
      <Configuration />
      <LegacyForm />
    </div>
  );
}
