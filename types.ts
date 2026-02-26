
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  hasSetPassword?: boolean;
  lastSeen?: any;
  status?: 'online' | 'offline';
  blockedUsers?: string[]; // Array of UIDs this user has blocked
}

export interface Chat {
  id: string;
  type: 'one-to-one' | 'group';
  members: string[];
  membersData?: Record<string, Partial<UserProfile>>;
  name?: string;
  creatorId?: string;
  createdAt: any;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: any;
  };
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'file';
  fileUrl?: string;
  fileName?: string;
  timestamp: any;
  isDeleted?: boolean;
  deletedFor?: string[]; // Array of UIDs who deleted this message for themselves
  reactions?: Record<string, string[]>; // emoji: [uid1, uid2...]
  readBy?: Record<string, any>; // uid: timestamp
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  isForwarded?: boolean;
}

export interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  toUid: string;
  fromUid: string;
  fromName: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: any;
}
