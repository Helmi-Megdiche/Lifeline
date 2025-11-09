import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact } from './contacts.schema';
import { User, EmergencyContact } from '../schemas/user.schema';
import { EmergencyContactDto } from '../dto/emergency-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

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

  // Emergency Contacts Sync Methods
  async getEmergencyContacts(userId: string): Promise<EmergencyContactDto[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return (user.emergencyContacts || []).map(contact => ({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      updatedAt: contact.updatedAt instanceof Date ? contact.updatedAt.toISOString() : new Date(contact.updatedAt).toISOString(),
    }));
  }

  async syncEmergencyContacts(userId: string, contacts: EmergencyContactDto[]): Promise<EmergencyContactDto[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge with existing contacts (last-write-wins)
    const existing = user.emergencyContacts || [];
    const mergedMap = new Map<string, EmergencyContact>();

    // Add existing contacts
    existing.forEach(contact => {
      mergedMap.set(contact.id, {
        ...contact,
        updatedAt: contact.updatedAt instanceof Date ? contact.updatedAt : new Date(contact.updatedAt),
      });
    });

    // Merge new contacts (convert string dates to Date objects for comparison)
    contacts.forEach(newContact => {
      const existingContact = mergedMap.get(newContact.id);
      const newContactDate = new Date(newContact.updatedAt);
      
      if (!existingContact) {
        // New contact
        mergedMap.set(newContact.id, {
          id: newContact.id,
          name: newContact.name,
          phone: newContact.phone,
          relationship: newContact.relationship,
          updatedAt: newContactDate,
        });
      } else {
        // Conflict: use the one with latest updatedAt
        const existingTime = existingContact.updatedAt instanceof Date 
          ? existingContact.updatedAt.getTime() 
          : new Date(existingContact.updatedAt).getTime();
        const newTime = newContactDate.getTime();
        
        if (newTime > existingTime) {
          mergedMap.set(newContact.id, {
            id: newContact.id,
            name: newContact.name,
            phone: newContact.phone,
            relationship: newContact.relationship,
            updatedAt: newContactDate,
          });
        }
      }
    });

    // Limit to 5 contacts
    const merged = Array.from(mergedMap.values())
      .sort((a, b) => {
        const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
        const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
        return timeB - timeA; // Most recent first
      })
      .slice(0, 5);

    // Update user
    user.emergencyContacts = merged;
    await user.save();

    // Return with ISO string dates
    return merged.map(contact => ({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      updatedAt: contact.updatedAt instanceof Date ? contact.updatedAt.toISOString() : new Date(contact.updatedAt).toISOString(),
    }));
  }
}


