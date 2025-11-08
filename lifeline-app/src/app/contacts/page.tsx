"use client";
import React, { useEffect, useState } from 'react';

type Contact = { _id?: string; name: string; phone: string; email?: string; methods?: string[] };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState<Contact>({ name: '', phone: '', email: '', methods: ['sms', 'whatsapp'] });

  async function load() {
    const res = await fetch('/contacts', { method: 'GET', body: JSON.stringify({ userId: 'demo' }) });
    try {
      const data = await res.json();
      setContacts(data);
    } catch {
      setContacts([]);
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    await fetch('/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'demo', ...form }) });
    setForm({ name: '', phone: '', email: '', methods: ['sms', 'whatsapp'] });
    load();
  }

  async function remove(id: string) {
    await fetch(`/contacts/${id}`, { method: 'DELETE', body: JSON.stringify({ userId: 'demo' }) });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Emergency Contacts</h1>
      <div className="flex gap-2 mb-6">
        <input className="border rounded px-3 py-2 flex-1" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} placeholder="Name" />
        <input className="border rounded px-3 py-2 flex-1" value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} placeholder="Phone" />
        <input className="border rounded px-3 py-2 flex-1" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} placeholder="Email (optional)" />
        <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={save}>Add</button>
      </div>
      <ul className="space-y-2">
        {contacts.map(c => (
          <li key={c._id} className="flex items-center justify-between border rounded px-3 py-2">
            <div>
              <strong>{c.name}</strong> <span className="text-gray-600">{c.phone}</span> {c.email && <span className="text-gray-600">• {c.email}</span>}
            </div>
            <button className="text-red-600" onClick={()=>remove(c._id!)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}


