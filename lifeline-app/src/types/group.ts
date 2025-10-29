export enum GroupType {
  FAMILY = 'Family',
  FRIENDS = 'Friends',
  WORK = 'Work',
  OTHER = 'Other',
}

export enum MemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum UserStatus {
  SAFE = 'safe',
  NEED_HELP = 'need_help',
  IN_DANGER = 'in_danger',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

export interface Group {
  _id: string;
  name: string;
  ownerId: string;
  description?: string;
  type: GroupType;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
  memberCount?: number;
  isAdmin?: boolean;
}

export interface GroupMember {
  _id: string;
  groupId: string;
  userId: string | {
    _id: string;
    username: string;
    email: string;
  };
  role: MemberRole;
  status?: UserStatus;
  statusUpdatedAt?: string;
  joinedAt: string;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  type: GroupType;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  type?: GroupType;
}

export interface AddMemberDto {
  userId: string;
}

export interface PendingAction {
  id: string;
  action: 'CREATE_GROUP' | 'UPDATE_GROUP' | 'DELETE_GROUP' | 'ADD_MEMBER' | 'REMOVE_MEMBER' | 'UPDATE_STATUS';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: any;
  timestamp: string;
  synced: boolean;
}

export interface GroupStatusSummary {
  totalMembers: number;
  statusCounts: {
    safe: number;
    need_help: number;
    in_danger: number;
    offline: number;
    unknown: number;
  };
}

