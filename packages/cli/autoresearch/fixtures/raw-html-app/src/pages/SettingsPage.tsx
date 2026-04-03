import React, { useState } from 'react';

export function SettingsPage() {
  const [theme, setTheme] = useState('light');
  const [bio, setBio] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [language, setLanguage] = useState('en');

  return (
    <div>
      <h2>Settings</h2>

      <section>
        <label htmlFor="theme">Theme</label>
        <select
          id="theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </section>

      <section>
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
        />
      </section>

      <section>
        <label>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
          />
          Enable notifications
        </label>
      </section>

      <section>
        <p>Language</p>
        <label>
          <input
            type="radio"
            name="language"
            value="en"
            checked={language === 'en'}
            onChange={() => setLanguage('en')}
          />
          English
        </label>
        <label>
          <input
            type="radio"
            name="language"
            value="es"
            checked={language === 'es'}
            onChange={() => setLanguage('es')}
          />
          Spanish
        </label>
      </section>

      <button onClick={() => alert('saved')}>Save</button>
    </div>
  );
}
