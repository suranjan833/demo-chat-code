
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile } from '../types';
import { Search, X, Users, Check, User } from 'lucide-react';

interface Props {
  onClose: () => void;
  currentUser: UserProfile;
  onChatCreated: (id: string) => void;
}

const NewChatModal: React.FC<Props> = ({ onClose, currentUser, onChatCreated }) => {
  const [mode, setMode] = useState<'select' | 'group'>('select');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch all users once and filter client-side for better performance/no index requirement
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        const userList = snapshot.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => u.uid !== currentUser.uid);
        setUsers(userList);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser.uid]);

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startOneToOneChat = async (otherUser: UserProfile) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef, 
        where('type', '==', 'one-to-one'),
        where('members', 'array-contains', currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(doc => {
        const members = doc.data().members as string[];
        return members.includes(otherUser.uid);
      });

      if (existing) {
        onChatCreated(existing.id);
        return;
      }

      const chatData = {
        type: 'one-to-one',
        members: [currentUser.uid, otherUser.uid],
        membersData: {
          [currentUser.uid]: { displayName: currentUser.displayName, photoURL: currentUser.photoURL },
          [otherUser.uid]: { displayName: otherUser.displayName, photoURL: otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName}` }
        },
        createdAt: serverTimestamp(),
        lastMessage: {
          text: 'Started a new conversation',
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          timestamp: serverTimestamp()
        }
      };
      
      const docRef = await addDoc(chatsRef, chatData);
      onChatCreated(docRef.id);
    } catch (err) {
      console.error("Error creating one-to-one chat:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || isCreating) return;
    setIsCreating(true);
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        type: 'group',
        name: groupName.trim(),
        creatorId: currentUser.uid,
        members: [currentUser.uid],
        membersData: {
          [currentUser.uid]: { displayName: currentUser.displayName, photoURL: currentUser.photoURL }
        },
        createdAt: serverTimestamp(),
        lastMessage: {
          text: 'Group created. Invitations sent.',
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          timestamp: serverTimestamp()
        }
      });

      const invitationsRef = collection(db, 'invitations');
      const promises = selectedUsers.map(uid => {
        return addDoc(invitationsRef, {
          groupId: chatRef.id,
          groupName: groupName.trim(),
          toUid: uid,
          fromUid: currentUser.uid,
          fromName: currentUser.displayName,
          status: 'pending',
          timestamp: serverTimestamp()
        });
      });

      await Promise.all(promises);
      onChatCreated(chatRef.id);
    } catch (err) {
      console.error("Error creating group:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserSelection = (uid: string) => {
    setSelectedUsers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'select' ? 'New Message' : 'Create Group'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
            <X size={20} />
          </button>
        </header>

        <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
          {mode === 'group' && (
            <div className="relative">
              <input 
                type="text" 
                placeholder="Group Name" 
                className="w-full py-2 px-4 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search people..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex justify-center gap-2">
            <button 
              onClick={() => setMode('select')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'select' ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 hover:text-gray-600'}`}
            >
              <User size={14} className="inline mr-1" /> Single Chat
            </button>
            <button 
              onClick={() => setMode('group')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'group' ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 hover:text-gray-600'}`}
            >
              <Users size={14} className="inline mr-1" /> Group Chat
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {filteredUsers.map(user => (
                <button
                  key={user.uid}
                  disabled={isCreating}
                  onClick={() => mode === 'select' ? startOneToOneChat(user) : toggleUserSelection(user.uid)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="relative">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`} 
                      alt={user.displayName} 
                      className="w-10 h-10 rounded-full object-cover" 
                    />
                    {selectedUsers.includes(user.uid) && mode === 'group' && (
                      <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                        <Check size={10} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{user.displayName}</h4>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              No users found matching "{searchQuery}"
            </div>
          )}
        </div>

        {mode === 'group' && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <button 
              disabled={isCreating || !groupName.trim() || selectedUsers.length === 0}
              onClick={createGroupChat}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? 'Creating Group...' : 'Create and Send Invites'}
              {!isCreating && <span className="text-xs opacity-70">({selectedUsers.length} selected)</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewChatModal;
