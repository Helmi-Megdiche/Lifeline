import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group, GroupSchema } from '../schemas/group.schema';
import { GroupMember, GroupMemberSchema } from '../schemas/group.schema';
import { StatusModule } from '../status/status.module';
import { Message, MessageSchema } from '../schemas/message.schema';
import { Alert, AlertSchema } from '../schemas/alert.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupMember.name, schema: GroupMemberSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Alert.name, schema: AlertSchema },
    ]),
    StatusModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}

