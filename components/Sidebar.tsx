
import React, { useState, useEffect } from 'react';
import { Chat } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface Props {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  currentUserId: string;
}

const UnreadBadge: React.FC<{ chatId: string; userId: string }> = ({ chatId, userId }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unread = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.senderId !== userId && (!data.readBy || !data.readBy[userId]);
      });
      setCount(unread.length);
    });

    return () => unsubscribe();
  }, [chatId, userId]);

  if (count === 0) return null;

  return (
    <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full ring-2 ring-white">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const Sidebar: React.FC<Props> = ({ chats, activeChatId, onSelectChat, currentUserId }) => {
  if (chats.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No active chats yet.</p>
        <p className="text-sm">Start a conversation using the button below.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {chats.map(chat => {
        const isGroup = chat.type === 'group';
        const otherMemberId = chat.members.find(id => id !== currentUserId);
        const otherMember = chat.membersData?.[otherMemberId || ''];
        
        const displayName = isGroup ? chat.name : (otherMember?.displayName || 'Chat');
        const photoURL = isGroup 
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'G')}&background=random`
          : (otherMember?.photoURL || `https://ui-avatars.com/api/?name=${displayName}`);

        const lastMessage = chat.lastMessage;
        const isActive = activeChatId === chat.id;

        return (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-blue-50/50 ${isActive ? 'bg-blue-50' : 'bg-white'}`}
          >
            <div className="relative flex-shrink-0">
              <img src={photoURL} alt={displayName} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
              {!isGroup && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="font-bold text-gray-900 truncate">{displayName}</h3>
                {lastMessage?.timestamp && (
                  <span className="text-[10px] text-gray-400 uppercase font-medium">
                    {formatDistanceToNow(lastMessage.timestamp.toDate(), { addSuffix: false })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500 truncate flex-1">
                  {lastMessage ? (
                    <>
                      <span className="font-medium text-gray-700">{lastMessage.senderId === currentUserId ? 'You: ' : ''}</span>
                      {lastMessage.text}
                    </>
                  ) : (
                    <span className="italic text-gray-400">No messages yet</span>
                  )}
                </p>
                <UnreadBadge chatId={chat.id} userId={currentUserId} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default Sidebar;
