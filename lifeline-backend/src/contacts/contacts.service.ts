import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact } from './contacts.schema';

@Injectable()
export class ContactsService {
  constructor(@InjectModel(Contact.name) private contactModel: Model<Contact>) {}

  async create(userId: string, payload: Partial<Contact>) {
    const created = new this.contactModel({ ...payload, userId });
    return created.save();
  }

  async findAll(userId: string) {
    return this.contactModel.find({ userId }).lean();
  }

  async update(userId: string, id: string, payload: Partial<Contact>) {
    const doc = await this.contactModel.findOneAndUpdate({ _id: id, userId }, payload, { new: true });
    if (!doc) throw new NotFoundException('Contact not found');
    return doc;
  }

  async remove(userId: string, id: string) {
    const res = await this.contactModel.findOneAndDelete({ _id: id, userId });
    if (!res) throw new NotFoundException('Contact not found');
    return { success: true };
  }
}


