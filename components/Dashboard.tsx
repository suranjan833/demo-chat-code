
import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { UserProfile, Chat, Invitation } from '../types';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import RequestList from './RequestList';
import NewChatModal from './NewChatModal';
import { MessageSquare, Users, LogOut, Plus, Heart } from 'lucide-react';

interface Props {
  profile: UserProfile;
}

const Dashboard: React.FC<Props> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'chats'), where('members', 'array-contains', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Chat[];
      chatList.sort((a, b) => (b.lastMessage?.timestamp?.toMillis() || 0) - (a.lastMessage?.timestamp?.toMillis() || 0));
      setChats(chatList);
    }, (error) => console.error("Chats error:", error));
    return () => unsubscribe();
  }, [profile.uid]);

  useEffect(() => {
    const q = query(collection(db, 'invitations'), where('toUid', '==', profile.uid), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inviteList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invitation[];
      inviteList.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      setInvitations(inviteList);
    }, (error) => console.error("Invitations error:", error));
    return () => unsubscribe();
  }, [profile.uid]);

  const handleLogout = () => auth.signOut();

  const handleAcceptInvite = async (invite: Invitation) => {
    try {
      await updateDoc(doc(db, 'invitations', invite.id), { status: 'accepted' });
      const targetChatRef = doc(db, 'chats', invite.groupId);
      const { getDoc } = await import('firebase/firestore');
      const existingDoc = await getDoc(targetChatRef);
      if (existingDoc.exists()) {
        const members = existingDoc.data().members || [];
        if (!members.includes(profile.uid)) {
          await updateDoc(targetChatRef, {
            members: [...members, profile.uid],
            [`membersData.${profile.uid}`]: { displayName: profile.displayName, photoURL: profile.photoURL }
          });
        }
      }
      setActiveTab('chats');
      setActiveChatId(invite.groupId);
    } catch (err) { console.error("Accept error:", err); }
  };

  const handleRejectInvite = async (inviteId: string) => {
    await updateDoc(doc(db, 'invitations', inviteId), { status: 'rejected' });
  };

  const currentChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex h-screen h-[100dvh] w-full bg-gray-50 overflow-hidden fixed inset-0">
      {(!isMobileView || !activeChatId) && (
        <div className={`flex flex-col border-r border-gray-200 bg-white ${isMobileView ? 'w-full' : 'w-80 lg:w-96'} h-full transition-all relative shrink-0`}>
          <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-200">B</div>
              <div>
                <h1 className="font-black text-gray-900 leading-none tracking-tight">SuranjanDemoChat</h1>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Premium Messaging</span>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>

          <div className="p-4 bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img src={profile.photoURL} alt="Me" className="w-10 h-10 rounded-full border border-white shadow-sm" />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-gray-900 truncate">{profile.displayName}</h2>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  <span className="text-[10px] text-gray-500 font-medium">Online</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'chats' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <MessageSquare size={16} />
              Chats
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <Users size={16} />
              Requests
              {invitations.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full ring-2 ring-white">{invitations.length}</span>}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-32">
            {activeTab === 'chats' ? (
              <Sidebar chats={chats} activeChatId={activeChatId} onSelectChat={setActiveChatId} currentUserId={profile.uid} />
            ) : (
              <RequestList invitations={invitations} onAccept={handleAcceptInvite} onReject={handleRejectInvite} />
            )}
          </div>

          <div className="absolute bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex flex-col gap-1 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium">
              Made with <Heart size={10} className="text-red-500 fill-red-500" /> by
            </div>
            <div className="flex justify-center gap-4 text-[11px] font-bold text-gray-700">
              <span className="hover:text-blue-600 transition-colors cursor-default">Suranjan Bhattacharjee</span>
            </div>
          </div>

          <button
            onClick={() => setIsNewChatModalOpen(true)}
            className="absolute bottom-24 right-6 flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all z-20"
          >
            <Plus size={28} />
          </button>
        </div>
      )}

      {(activeChatId || !isMobileView) && (
        <div className="flex-1 flex flex-col relative bg-gray-50 h-full overflow-hidden">
          {activeChatId && currentChat ? (
            <ChatWindow chat={currentChat} onBack={isMobileView ? () => setActiveChatId(null) : undefined} currentUser={profile} />
          ) : activeChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white h-full">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-400 bg-white h-full">
              <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-200">
                <MessageSquare size={64} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Welcome to SuranjanDemoChat</h3>
              <p className="mt-2 text-gray-500 max-w-xs text-center font-medium">Select a conversation from the sidebar to start premium messaging experience.</p>
            </div>
          )}
        </div>
      )}

      {isNewChatModalOpen && (
        <NewChatModal onClose={() => setIsNewChatModalOpen(false)} currentUser={profile} onChatCreated={(id) => { setActiveChatId(id); setIsNewChatModalOpen(false); }} />
      )}
    </div>
  );
};

export default Dashboard;
