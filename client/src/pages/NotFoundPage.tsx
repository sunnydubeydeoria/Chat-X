import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Ghost } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10
          border border-indigo-500/10 flex items-center justify-center mx-auto mb-6">
          <Ghost className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
        </div>
        <h1 className="text-4xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
          404
        </h1>
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Nothing to see here
        </h2>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          This page doesn't exist — or it was a temporary room that has already been destroyed.
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary px-6 py-3 flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to ChatX
        </button>
      </motion.div>
    </div>
  );
}
