
import React from 'react';
import { Invitation } from '../types';
import { Check, X, Users } from 'lucide-react';

interface Props {
  invitations: Invitation[];
  onAccept: (invite: Invitation) => void;
  onReject: (id: string) => void;
}

const RequestList: React.FC<Props> = ({ invitations, onAccept, onReject }) => {
  if (invitations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users size={32} />
        </div>
        <p className="font-medium">No pending requests</p>
        <p className="text-sm">Group invites will appear here.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {invitations.map(invite => (
        <div key={invite.id} className="p-4 bg-white">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              {invite.groupName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 leading-tight">Join "{invite.groupName}"?</h4>
              <p className="text-xs text-gray-500">Invited by <span className="font-medium">{invite.fromName}</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onAccept(invite)}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <Check size={16} />
              Accept
            </button>
            <button 
              onClick={() => onReject(invite.id)}
              className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-md text-sm font-semibold transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RequestList;
