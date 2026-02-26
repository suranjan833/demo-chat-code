
import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Chat, Message, UserProfile } from '../types';
import { uploadFile } from '../services/uploadService';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Download,
  MoreVertical,
  Trash2,
  Reply,
  Forward,
  Smile,
  LogOut,
  UserPlus,
  X,
  Check,
  CheckCheck,
  Ban,
  UserCheck,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  chat: Chat;
  currentUser: UserProfile;
  onBack?: () => void;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const ChatWindow: React.FC<Props> = ({ chat, currentUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [availableChats, setAvailableChats] = useState<Chat[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showSeenTime, setShowSeenTime] = useState<string | null>(null);
  const [showReactors, setShowReactors] = useState<{ msgId: string, emoji: string } | null>(null);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<Message | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const otherMemberId = chat.members.find(id => id !== currentUser.uid);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!chat.id || !currentUser.uid || messages.length === 0) return;

    const unreadMessages = messages.filter(m =>
      m.senderId !== currentUser.uid &&
      (!m.readBy || !m.readBy[currentUser.uid])
    );

    if (!firstUnreadId && unreadMessages.length > 0) {
      setFirstUnreadId(unreadMessages[0].id);
    }

    if (unreadMessages.length > 0) {
      const batch = writeBatch(db);
      unreadMessages.forEach(m => {
        const msgRef = doc(db, 'messages', m.id);
        batch.update(msgRef, {
          [`readBy.${currentUser.uid}`]: serverTimestamp()
        });
      });
      batch.commit().catch(err => console.error("Error marking as read:", err));
    }
  }, [messages, chat.id, currentUser.uid, firstUnreadId]);

  useEffect(() => {
    if (chat.type !== 'one-to-one' || !otherMemberId) return;

    const unsubMe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        setIsBlockedByMe(data.blockedUsers?.includes(otherMemberId) || false);
      }
    });

    const unsubOther = onSnapshot(doc(db, 'users', otherMemberId), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        setHasBlockedMe(data.blockedUsers?.includes(currentUser.uid) || false);
      }
    });

    return () => {
      unsubMe();
      unsubOther();
    };
  }, [chat.id, otherMemberId, currentUser.uid]);

  useEffect(() => {
    if (!chat.id) return;
    setFirstUnreadId(null);
    const q = query(collection(db, 'messages'), where('chatId', '==', chat.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      msgs.sort((a, b) => (a.timestamp?.toMillis() || Date.now()) - (b.timestamp?.toMillis() || Date.now()));
      const visibleMsgs = msgs.filter(m => !m.deletedFor?.includes(currentUser.uid));
      setMessages(visibleMsgs);
    }, (error) => console.error("Messages error:", error));
    return () => unsubscribe();
  }, [chat.id, currentUser.uid]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (forwardingMessage) {
      const q = query(collection(db, 'chats'), where('members', 'array-contains', currentUser.uid));
      getDocs(q).then(snap => {
        setAvailableChats(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Chat));
      });
    }
  }, [forwardingMessage, currentUser.uid]);

  const handleSendMessage = async (textOverride?: string, isForward?: boolean, replyData?: Message | null) => {
    if (isBlockedByMe || hasBlockedMe) return;
    const textToSend = textOverride || inputText.trim();
    if (!textToSend && !textOverride) return;
    if (!textOverride) setInputText('');
    setReplyTo(null);
    setFirstUnreadId(null);

    try {
      const msgData: any = {
        chatId: chat.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: textToSend,
        type: 'text',
        timestamp: serverTimestamp(),
        isForwarded: !!isForward,
        readBy: { [currentUser.uid]: serverTimestamp() }
      };

      if (replyData) {
        msgData.replyTo = {
          id: replyData.id,
          text: replyData.isDeleted ? 'Deleted message' : replyData.text,
          senderName: replyData.senderName
        };
      }

      await addDoc(collection(db, 'messages'), msgData);
      await updateDoc(doc(db, 'chats', chat.id), {
        'lastMessage': {
          text: isForward ? `Forwarded: ${textToSend}` : textToSend,
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          timestamp: serverTimestamp()
        }
      });
    } catch (err) { console.error("Send error:", err); }
  };

  const deleteMessageForMe = async (msgId: string) => {
    try {
      await updateDoc(doc(db, 'messages', msgId), {
        deletedFor: arrayUnion(currentUser.uid)
      });
      setShowDeleteModal(null);
    } catch (err) { console.error("Delete for me error:", err); }
  };

  const deleteMessageForEveryone = async (msgId: string) => {
    try {
      await updateDoc(doc(db, 'messages', msgId), {
        isDeleted: true,
        text: 'This message was deleted',
        fileUrl: null,
        fileName: null
      });
      setShowDeleteModal(null);
    } catch (err) { console.error("Delete for everyone error:", err); }
  };

  const toggleBlockUser = async () => {
    if (!otherMemberId) return;
    const userRef = doc(db, 'users', currentUser.uid);
    setShowMoreMenu(false);
    if (isBlockedByMe) {
      await updateDoc(userRef, { blockedUsers: arrayRemove(otherMemberId) });
    } else {
      if (window.confirm(`Are you sure you want to block ${chatName}?`)) {
        await updateDoc(userRef, { blockedUsers: arrayUnion(otherMemberId) });
      }
    }
  };

  const reactToMessage = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const currentReactions = msg.reactions?.[emoji] || [];
    const isRemoving = currentReactions.includes(currentUser.uid);
    await updateDoc(doc(db, 'messages', msgId), {
      [`reactions.${emoji}`]: isRemoving ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
    setShowEmojiPicker(null);
  };

  const forwardMessage = async (targetChatId: string) => {
    if (!forwardingMessage) return;
    try {
      await addDoc(collection(db, 'messages'), {
        chatId: targetChatId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: forwardingMessage.text,
        type: forwardingMessage.type,
        fileUrl: forwardingMessage.fileUrl || null,
        fileName: forwardingMessage.fileName || null,
        timestamp: serverTimestamp(),
        isForwarded: true,
        readBy: { [currentUser.uid]: serverTimestamp() }
      });
      setForwardingMessage(null);
    } catch (err) { console.error("Forward error:", err); }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;
    setShowMoreMenu(false);
    await updateDoc(doc(db, 'chats', chat.id), {
      members: arrayRemove(currentUser.uid),
      [`membersData.${currentUser.uid}`]: deleteField()
    });
    onBack?.();
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("DELETE this entire group for everyone?")) return;
    setShowMoreMenu(false);
    await deleteDoc(doc(db, 'chats', chat.id));
    onBack?.();
  };

  const openAddMembers = async () => {
    setIsAddingMembers(true);
    const snap = await getDocs(collection(db, 'users'));
    setAllUsers(snap.docs.map(d => d.data() as UserProfile).filter(u => !chat.members.includes(u.uid)));
  };

  const addMemberToGroup = async (user: UserProfile) => {
    await updateDoc(doc(db, 'chats', chat.id), {
      members: arrayUnion(user.uid),
      [`membersData.${user.uid}`]: { displayName: user.displayName, photoURL: user.photoURL }
    });
    setAllUsers(prev => prev.filter(u => u.uid !== user.uid));
  };

  const isGroup = chat.type === 'group';
  const isOwner = chat.creatorId === currentUser.uid;
  const otherMember = chat.membersData?.[otherMemberId || ''];
  const chatName = isGroup ? chat.name : (otherMember?.displayName || 'Chat');
  const chatAvatar = isGroup
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'G')}&background=random`
    : (otherMember?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName || 'C')}`);

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] overflow-hidden relative">
      <header className="p-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          {onBack && <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-blue-600 md:hidden"><ArrowLeft size={20} /></button>}
          <div className="relative cursor-pointer" onClick={() => isGroup && setShowGroupInfo(true)}>
            <img src={chatAvatar} alt={chatName} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
            {!isGroup && <span className={`absolute bottom-0 right-0 w-3 h-3 ${hasBlockedMe || isBlockedByMe ? 'bg-gray-400' : 'bg-green-500'} border-2 border-white rounded-full`}></span>}
          </div>
          <div className="cursor-pointer" onClick={() => isGroup && setShowGroupInfo(true)}>
            <h2 className="font-bold text-gray-900 text-sm md:text-base leading-none">{chatName}</h2>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              {isGroup ? `${chat.members.length} members` : (isBlockedByMe ? 'Blocked' : (hasBlockedMe ? 'Offline' : 'Online'))}
            </p>
          </div>
        </div>
        <div className="flex gap-1 items-center relative" ref={moreMenuRef}>
          {isGroup && isOwner && (
            <button onClick={openAddMembers} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><UserPlus size={20} /></button>
          )}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors"
          >
            <MoreVertical size={20} />
          </button>

          {showMoreMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 origin-top-right">
              <button
                onClick={() => { setShowGroupInfo(true); setShowMoreMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Info size={18} className="text-gray-400" />
                {isGroup ? 'Group Info' : 'User Info'}
              </button>

              {!isGroup && (
                <button
                  onClick={toggleBlockUser}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${isBlockedByMe ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
                >
                  {isBlockedByMe ? <UserCheck size={18} /> : <Ban size={18} />}
                  {isBlockedByMe ? 'Unblock User' : 'Block User'}
                </button>
              )}

              {isGroup && (
                <>
                  <div className="h-px bg-gray-50 my-1"></div>
                  {isOwner ? (
                    <button
                      onClick={handleDeleteGroup}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                    >
                      <Trash2 size={18} />
                      Delete Group
                    </button>
                  ) : (
                    <button
                      onClick={handleLeaveGroup}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors font-medium"
                    >
                      <LogOut size={18} />
                      Leave Group
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-[#f0f2f5]">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.uid;
          const showSenderName = isGroup && !isMe;
          const timestampStr = msg.timestamp ? format(msg.timestamp.toDate(), 'h:mm a') : '...';

          const otherReaders = Object.keys(msg.readBy || {}).filter(id => id !== msg.senderId);
          const isReadByAll = isGroup
            ? otherReaders.length >= chat.members.length - 1
            : otherReaders.length > 0;
          const isRead = otherReaders.length > 0;

          return (
            <React.Fragment key={msg.id}>
              {firstUnreadId === msg.id && (
                <div className="flex items-center gap-4 my-8">
                  <div className="flex-1 h-px bg-blue-100"></div>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    New Messages
                  </span>
                  <div className="flex-1 h-px bg-blue-100"></div>
                </div>
              )}
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                {showSenderName && <span className="text-[10px] font-bold text-gray-400 mb-1 ml-1">{msg.senderName}</span>}

                <div className={`relative flex items-center gap-2 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                  {!msg.isDeleted && (
                    <div className={`hidden md:group-hover:flex items-center gap-1 bg-white/80 backdrop-blur rounded-full px-2 py-1 shadow-sm border border-gray-200 transition-all opacity-0 group-hover:opacity-100`}>
                      <button onClick={() => setShowEmojiPicker(msg.id)} className="p-1 text-gray-500 hover:text-yellow-500"><Smile size={16} /></button>
                      <button onClick={() => setReplyTo(msg)} className="p-1 text-gray-500 hover:text-blue-500"><Reply size={16} /></button>
                      <button onClick={() => setForwardingMessage(msg)} className="p-1 text-gray-500 hover:text-green-500"><Forward size={16} /></button>
                      <button onClick={() => setShowDeleteModal(msg)} className="p-1 text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  )}

                  <div className={`max-w-[280px] md:max-w-md p-3 rounded-2xl shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' :
                      'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    } ${msg.isDeleted ? 'opacity-50 italic' : ''}`}>

                    {msg.isForwarded && !msg.isDeleted && (
                      <div className="flex items-center gap-1 text-[10px] opacity-60 mb-1 italic">
                        <Forward size={10} /> Forwarded
                      </div>
                    )}

                    {msg.replyTo && !msg.isDeleted && (
                      <div className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${isMe ? 'bg-blue-700/50 border-white/50' : 'bg-gray-100 border-blue-600'}`}>
                        <p className="font-bold opacity-80">{msg.replyTo.senderName}</p>
                        <p className="truncate opacity-70">{msg.replyTo.text}</p>
                      </div>
                    )}

                    {msg.type === 'file' && !msg.isDeleted ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{msg.fileName}</p>
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-50'}`}>
                          <Download size={16} /> <span className="text-xs font-bold uppercase">Download</span>
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    )}

                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                      <span className="text-[9px] font-bold">{timestampStr}</span>

                      {isMe && !msg.isDeleted && (
                        <div
                          className="relative cursor-help"
                          onMouseEnter={() => setShowSeenTime(msg.id)}
                          onMouseLeave={() => setShowSeenTime(null)}
                          onClick={(e) => { e.stopPropagation(); setShowSeenTime(msg.id === showSeenTime ? null : msg.id); }}
                        >
                          {isReadByAll ? <CheckCheck size={12} className="text-blue-300" /> : isRead ? <CheckCheck size={12} className="text-gray-300" /> : <Check size={12} className="text-gray-300 opacity-60" />}

                          {showSeenTime === msg.id && (
                            <div className="absolute bottom-full right-0 mb-2 p-2 bg-gray-800 text-white text-[10px] rounded shadow-xl whitespace-nowrap z-30">
                              {otherReaders.length > 0 ? (
                                <div className="space-y-1">
                                  <p className="font-bold border-b border-gray-600 pb-1 mb-1">Seen by:</p>
                                  {otherReaders.map(uid => (
                                    <div key={uid} className="flex justify-between gap-4">
                                      <span>{chat.membersData?.[uid]?.displayName || 'User'}</span>
                                      <span className="opacity-60">{format(msg.readBy?.[uid]?.toDate() || new Date(), 'h:mm a')}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                "Sent"
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {msg.reactions && (Object.entries(msg.reactions) as [string, string[]][]).some(([_, uids]) => uids.length > 0) && (
                      <div className="absolute -bottom-3 flex flex-wrap gap-1">
                        {(Object.entries(msg.reactions) as [string, string[]][]).map(([emoji, uids]) => uids.length > 0 && (
                          <button
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); setShowReactors({ msgId: msg.id, emoji }); }}
                            className={`flex items-center gap-1 bg-white border border-gray-100 rounded-full px-1.5 py-0.5 shadow-sm text-[10px] hover:scale-110 transition-transform ${uids.includes(currentUser.uid) ? 'border-blue-200 bg-blue-50' : ''}`}
                          >
                            <span>{emoji}</span>
                            <span className="font-bold text-gray-500">{uids.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {showEmojiPicker === msg.id && (
                  <div className={`mt-2 p-2 bg-white rounded-2xl shadow-xl border border-gray-100 flex gap-2 animate-in fade-in zoom-in-95`}>
                    {EMOJIS.map(e => <button key={e} onClick={() => reactToMessage(msg.id, e)} className="hover:scale-125 transition-transform text-lg">{e}</button>)}
                    <button onClick={() => setShowEmojiPicker(null)} className="p-1 text-gray-300"><X size={14} /></button>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {showGroupInfo && (
        <div className="absolute inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowGroupInfo(false)} />
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{isGroup ? 'Group Info' : 'User Info'}</h3>
              <button onClick={() => setShowGroupInfo(false)}><X /></button>
            </div>
            <div className="text-center mb-8">
              <img src={chatAvatar} alt={chatName} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-50" />
              <h4 className="text-lg font-bold">{chatName}</h4>
              {isGroup ? (
                <p className="text-gray-500 text-sm">Created {format(chat.createdAt?.toDate() || new Date(), 'MMM d, yyyy')}</p>
              ) : (
                <p className="text-gray-500 text-sm">{otherMember?.email}</p>
              )}
            </div>
            <div className="space-y-6">
              {isGroup && (
                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Members ({chat.members.length})</h5>
                  <div className="space-y-3">
                    {(Object.entries(chat.membersData || {}) as [string, Partial<UserProfile>][]).map(([uid, data]) => (
                      <div key={uid} className="flex items-center gap-3">
                        <img src={data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'U')}`} alt={data.displayName} className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <p className="text-sm font-bold truncate">{data.displayName} {uid === currentUser.uid && '(You)'}</p>
                          <p className="text-[10px] text-gray-500">{uid === chat.creatorId ? 'Owner' : 'Member'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-6 border-t border-gray-100 space-y-2">
                {isGroup ? (
                  isOwner ? (
                    <button onClick={handleDeleteGroup} className="w-full flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors">
                      <Trash2 size={18} /> Delete Group
                    </button>
                  ) : (
                    <button onClick={handleLeaveGroup} className="w-full flex items-center justify-center gap-2 py-3 text-orange-600 hover:bg-orange-50 rounded-xl font-bold transition-colors">
                      <LogOut size={18} /> Leave Group
                    </button>
                  )
                ) : (
                  <button onClick={toggleBlockUser} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${isBlockedByMe ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}>
                    {isBlockedByMe ? <UserCheck size={18} /> : <Ban size={18} />}
                    {isBlockedByMe ? 'Unblock User' : 'Block User'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {replyTo && (
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom shrink-0">
          <div className="p-2 text-blue-600"><Reply size={20} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-600">Replying to {replyTo.senderName}</p>
            <p className="text-xs text-gray-500 truncate">{replyTo.isDeleted ? 'Deleted message' : replyTo.text}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
      )}

      <footer className="p-4 bg-white border-t border-gray-100 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {isBlockedByMe ? (
          <div className="bg-gray-100 p-4 rounded-xl text-center">
            <p className="text-sm font-bold text-gray-500">You have blocked this user. <button onClick={toggleBlockUser} className="text-blue-600 hover:underline">Unblock</button> to send messages.</p>
          </div>
        ) : hasBlockedMe ? (
          <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
            <p className="text-sm font-bold text-red-500 flex items-center justify-center gap-2"><Ban size={16} /> You cannot message this user.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(undefined, false, replyTo); }} className="flex items-end gap-2 bg-gray-50 rounded-2xl p-2 border border-gray-200">
            <input type="file" ref={fileInputRef} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setIsUploading(true);
              const res = await uploadFile(file);
              if (res.status === 'success' && res.file_url) {
                const fullUrl = res.file_url.startsWith('http') ? res.file_url : `https://devdrm.xyz${res.file_url}`;
                await addDoc(collection(db, 'messages'), {
                  chatId: chat.id, senderId: currentUser.uid, senderName: currentUser.displayName,
                  text: `📎 Sent a file: ${file.name}`, type: 'file', fileUrl: fullUrl, fileName: file.name,
                  timestamp: serverTimestamp(), readBy: { [currentUser.uid]: serverTimestamp() }
                });
                await updateDoc(doc(db, 'chats', chat.id), { 'lastMessage': { text: `📎 ${file.name}`, senderId: currentUser.uid, senderName: currentUser.displayName, timestamp: serverTimestamp() } });
              }
              setIsUploading(false);
            }} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              {isUploading ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <Paperclip size={20} />}
            </button>
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(undefined, false, replyTo); } }}
              placeholder="Type your message..."
              className="flex-1 bg-transparent py-2 px-1 outline-none text-sm resize-none max-h-32 min-h-[40px] leading-tight"
            />
            <button type="submit" disabled={!inputText.trim()} className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"><Send size={20} /></button>
          </form>
        )}
      </footer>

      {showDeleteModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteModal(null)} />
          <div className="relative bg-white w-full max-w-xs rounded-2xl shadow-2xl p-6 animate-in zoom-in">
            <h3 className="text-lg font-bold mb-4">Delete Message?</h3>
            <div className="space-y-2">
              <button
                onClick={() => deleteMessageForMe(showDeleteModal.id)}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Delete for Me
              </button>
              {showDeleteModal.senderId === currentUser.uid && !showDeleteModal.isDeleted && (
                <button
                  onClick={() => deleteMessageForEveryone(showDeleteModal.id)}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
                >
                  Delete for Everyone
                </button>
              )}
              <button onClick={() => setShowDeleteModal(null)} className="w-full py-2 text-gray-400 font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isAddingMembers && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddingMembers(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 flex flex-col max-h-[70%]">
            <h3 className="text-lg font-bold mb-4">Add Members</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {allUsers.length === 0 ? <p className="text-center text-gray-400 py-4">No more users to add</p> : allUsers.map(u => (
                <div key={u.uid} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full" />
                  <span className="flex-1 font-medium">{u.displayName}</span>
                  <button onClick={() => addMemberToGroup(u)} className="p-1.5 bg-blue-600 text-white rounded-full"><Check size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setIsAddingMembers(false)} className="mt-4 w-full py-2 bg-gray-100 rounded-lg font-bold">Done</button>
          </div>
        </div>
      )}

      {showReactors && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReactors(null)} />
          <div className="relative bg-white w-full max-w-xs rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">Reactions {showReactors.emoji}</h3>
              <button onClick={() => setShowReactors(null)}><X size={16} /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {messages.find(m => m.id === showReactors.msgId)?.reactions?.[showReactors.emoji]?.map(uid => {
                const uData = chat.membersData?.[uid] || { displayName: 'User', photoURL: '' };
                return (
                  <div key={uid} className="flex items-center gap-3">
                    <img src={uData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(uData.displayName || 'U')}`} alt={uData.displayName} className="w-6 h-6 rounded-full" />
                    <span className="text-xs font-medium">{uData.displayName} {uid === currentUser.uid && '(You)'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {forwardingMessage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForwardingMessage(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 flex flex-col max-h-[70%]">
            <h3 className="text-lg font-bold mb-4">Forward To</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {availableChats.map(c => {
                const isG = c.type === 'group';
                const name = isG ? c.name : c.membersData?.[c.members.find(id => id !== currentUser.uid) || '']?.displayName;
                const photo = isG ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'G')}` : c.membersData?.[c.members.find(id => id !== currentUser.uid) || '']?.photoURL;
                return (
                  <button key={c.id} onClick={() => forwardMessage(c.id)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left">
                    <img src={photo} alt={name} className="w-10 h-10 rounded-full" />
                    <span className="font-bold">{name}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setForwardingMessage(null)} className="mt-4 w-full py-2 bg-gray-100 rounded-lg font-bold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
