import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(GroupType)
  type: GroupType;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;
}

export class AddMemberDto {
  @IsMongoId()
  userId: string;
}

export class UpdateMemberRoleDto {
  @IsEnum(MemberRole)
  role: MemberRole;
}

export class UpdateMemberStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class GroupWithMembersDto {
  _id: string;
  name: string;
  ownerId: string;
  description?: string;
  type: GroupType;
  createdAt: Date;
  updatedAt: Date;
  members: any[];
  memberCount: number;
}

