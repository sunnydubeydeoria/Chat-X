import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useChatStore } from './store/chatStore';
import { Notifications } from './components/ui/Notifications';

export default function App() {
  const theme = useChatStore((s) => s.theme);

  return (
    <div className={theme === 'light' ? 'light' : ''}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
        <Notifications />
      </BrowserRouter>
    </div>
  );
}
