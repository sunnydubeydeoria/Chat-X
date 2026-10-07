import { Shield, Users } from 'lucide-react';
import { getInitials } from '../../lib/utils';
import type { Participant } from '@chatx/shared';

interface Props {
  participants: Participant[];
  currentSessionId: string;
}

export function ParticipantSidebar({ participants, currentSessionId }: Props) {
  const online = participants.filter(p => p.isConnected);
  const offline = participants.filter(p => !p.isConnected);

  return (
    <div className="flex flex-col h-full w-60">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Participants
        </span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
          {online.length}
        </span>
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto py-2">
        {online.length > 0 && (
          <>
            <p className="text-xs font-semibold px-4 py-1 uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              Online — {online.length}
            </p>
            {online.map(p => (
              <ParticipantItem
                key={p.sessionId}
                participant={p}
                isSelf={p.sessionId === currentSessionId}
                isOnline={true}
              />
            ))}
          </>
        )}

        {offline.length > 0 && (
          <>
            <p className="text-xs font-semibold px-4 py-2 uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              Offline — {offline.length}
            </p>
            {offline.map(p => (
              <ParticipantItem
                key={p.sessionId}
                participant={p}
                isSelf={false}
                isOnline={false}
              />
            ))}
          </>
        )}
      </div>

      {/* Privacy footer */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="rounded-xl p-3"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3 h-3 text-green-400" />
            <span className="text-xs font-semibold text-green-400">Encrypted Room</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Room data deleted when everyone leaves.
          </p>
        </div>
      </div>
    </div>
  );
}

function ParticipantItem({ participant, isSelf, isOnline }: {
  participant: Participant; isSelf: boolean; isOnline: boolean;
}) {
  return (
    <div className="participant-item">
      <div className="relative">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{
            background: participant.avatarColor,
            opacity: isOnline ? 1 : 0.5,
          }}
        >
          {getInitials(participant.displayName)}
        </div>
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
          style={{
            background: isOnline ? '#22c55e' : 'var(--text-muted)',
            borderColor: 'var(--bg-secondary)',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{
          color: isOnline ? 'var(--text-primary)' : 'var(--text-muted)',
        }}>
          {participant.displayName}
          {isSelf && <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(you)</span>}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {isOnline ? 'Online' : 'Away'}
        </p>
      </div>
    </div>
  );
}
