import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => (
  <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
    <h1>Bienvenue dans MANAGER</h1>
    <p>L'application est déployée avec succès 🎉</p>
    <p>Les routes API sont opérationnelles :</p>
    <ul>
      <li><code>/api/send-invite</code> (invitations RDV)</li>
      <li><code>/api/run-checks-live</code> (qualité des cuvées en ligne)</li>
    </ul>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);