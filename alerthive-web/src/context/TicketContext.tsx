import React, { createContext, useContext, useState, useCallback } from 'react';
import { Ticket, TicketStatus, TicketComment, IssueCategory } from '../types';
import { mockTickets } from '../data/mockTickets';
import { defaultSLAPolicies, getSLADueDate, isSLABreached } from '../data/slaData';
import { SLAPolicy } from '../types';

interface TicketContextValue {
  tickets: Ticket[];
  slaPolicies: SLAPolicy[];
  createTicket: (data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'slaBreached' | 'slaDueAt' | 'status' | 'comments'>) => Ticket;
  updateStatus: (id: string, status: TicketStatus, resolvedAt?: string) => void;
  assignTicket: (id: string, userId: string, userName: string) => void;
  addComment: (id: string, comment: Omit<TicketComment, 'id' | 'createdAt'>) => void;
  updateSLAPolicy: (id: string, updates: Partial<SLAPolicy>) => void;
  updateTicket: (id: string, updates: Partial<Pick<Ticket, 'issueCategory' | 'rootCause' | 'resolution'>>) => void;
}

const TicketContext = createContext<TicketContextValue | null>(null);

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>(defaultSLAPolicies);

  const createTicket = useCallback((data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'slaBreached' | 'slaDueAt' | 'status' | 'comments'>): Ticket => {
    const now = new Date().toISOString();
    const slaDueAt = getSLADueDate(now, data.priority, slaPolicies);
    const ticket: Ticket = {
      ...data,
      id: `TKT-${String(Date.now()).slice(-6)}`,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      slaDueAt,
      slaBreached: false,
      comments: [],
    };
    setTickets((prev) => [ticket, ...prev]);
    return ticket;
  }, [slaPolicies]);

  const updateStatus = useCallback((id: string, status: TicketStatus, resolvedAt?: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, status, updatedAt: new Date().toISOString() };
        if (resolvedAt) updated.resolvedAt = resolvedAt;
        if (status === 'resolved' && !resolvedAt) updated.resolvedAt = new Date().toISOString();
        updated.slaBreached = isSLABreached(t.slaDueAt, updated.resolvedAt);
        return updated;
      })
    );
  }, []);

  const assignTicket = useCallback((id: string, userId: string, userName: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, assignedTo: userId, assignedToName: userName, updatedAt: new Date().toISOString() }
          : t
      )
    );
  }, []);

  const addComment = useCallback((id: string, comment: Omit<TicketComment, 'id' | 'createdAt'>) => {
    const newComment: TicketComment = {
      ...comment,
      id: `c-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, comments: [...t.comments, newComment], updatedAt: new Date().toISOString() }
          : t
      )
    );
  }, []);

  const updateSLAPolicy = useCallback((id: string, updates: Partial<SLAPolicy>) => {
    setSlaPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const updateTicket = useCallback((id: string, updates: Partial<Pick<Ticket, 'issueCategory' | 'rootCause' | 'resolution'>>) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    );
  }, []);

  return (
    <TicketContext.Provider value={{ tickets, slaPolicies, createTicket, updateStatus, assignTicket, addComment, updateSLAPolicy, updateTicket }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets() {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used within TicketProvider');
  return ctx;
}
