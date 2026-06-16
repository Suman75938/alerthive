import { SprintConfig } from '../types';

// Helpers – build date strings relative to "today" (2026-03-12) for realistic data
const d = (offsetDays: number) => {
  const dt = new Date('2026-03-12T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
};

// Sprint 12 — completed 2026-02-13 to 2026-02-27
// Sprint 13 — active   2026-02-28 to 2026-03-13
// Sprint 14 — planning 2026-03-14 to 2026-03-27

export const mockSprints: SprintConfig[] = [
  /* ── Sprint 12 (completed) ─────────────────────────────────────────────── */
  {
    id: 'sp-012',
    name: 'Sprint 12',
    team: 'All Teams',
    startDate: '2026-02-13',
    endDate:   '2026-02-27',
    velocityTarget: 42,
    committedSP: 42,
    completedSP: 38,
    status: 'completed',
    members: [
      { userId: 'u-002', name: 'Mike Johnson',  team: 'Platform',        hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.5 },
      { userId: 'u-003', name: 'Alex Rivera',   team: 'Backend',         hoursPerDay: 8, daysOff: 1, spCapacityPerDay: 1.2 },
      { userId: 'u-004', name: 'Emily Watson',  team: 'Infrastructure',  hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.4 },
      { userId: 'u-005', name: 'Jordan Lee',    team: 'Frontend',        hoursPerDay: 7, daysOff: 2, spCapacityPerDay: 1.0 },
      { userId: 'u-006', name: 'Sam Parker',    team: 'Security',        hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.3 },
    ],
    burndown: [
      { day: 'Feb 13', ideal: 42,  actual: 42   },
      { day: 'Feb 14', ideal: 39,  actual: 41   },
      { day: 'Feb 17', ideal: 33,  actual: 36   },
      { day: 'Feb 18', ideal: 30,  actual: 34   },
      { day: 'Feb 19', ideal: 27,  actual: 31   },
      { day: 'Feb 20', ideal: 24,  actual: 26   },
      { day: 'Feb 21', ideal: 21,  actual: 22   },
      { day: 'Feb 24', ideal: 15,  actual: 19   },
      { day: 'Feb 25', ideal: 12,  actual: 16   },
      { day: 'Feb 26', ideal: 6,   actual: 9    },
      { day: 'Feb 27', ideal: 0,   actual: 4    },
    ],
  },

  /* ── Sprint 13 (active) ────────────────────────────────────────────────── */
  {
    id: 'sp-013',
    name: 'Sprint 13',
    team: 'All Teams',
    startDate: '2026-02-28',
    endDate:   '2026-03-13',
    velocityTarget: 46,
    committedSP: 46,
    status: 'active',
    members: [
      { userId: 'u-002', name: 'Mike Johnson',  team: 'Platform',        hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.5 },
      { userId: 'u-003', name: 'Alex Rivera',   team: 'Backend',         hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.2 },
      { userId: 'u-004', name: 'Emily Watson',  team: 'Infrastructure',  hoursPerDay: 8, daysOff: 1, spCapacityPerDay: 1.4 },
      { userId: 'u-005', name: 'Jordan Lee',    team: 'Frontend',        hoursPerDay: 6, daysOff: 3, spCapacityPerDay: 0.8 },
      { userId: 'u-006', name: 'Sam Parker',    team: 'Security',        hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.3 },
    ],
    burndown: [
      { day: 'Feb 28', ideal: 46,  actual: 46  },
      { day: 'Mar 2',  ideal: 40,  actual: 43  },
      { day: 'Mar 3',  ideal: 37,  actual: 40  },
      { day: 'Mar 4',  ideal: 34,  actual: 37  },
      { day: 'Mar 5',  ideal: 31,  actual: 34  },
      { day: 'Mar 6',  ideal: 28,  actual: 30  },
      { day: 'Mar 9',  ideal: 22,  actual: 26  },
      { day: 'Mar 10', ideal: 19,  actual: 22  },
      { day: 'Mar 11', ideal: 16,  actual: 19  },
      { day: 'Mar 12', ideal: 13,  actual: null }, // today — not yet recorded
      { day: 'Mar 13', ideal: 0,   actual: null },
    ],
  },

  /* ── Sprint 14 (planning) ──────────────────────────────────────────────── */
  {
    id: 'sp-014',
    name: 'Sprint 14',
    team: 'All Teams',
    startDate: '2026-03-14',
    endDate:   '2026-03-27',
    velocityTarget: 50,
    committedSP: 50,
    status: 'planning',
    members: [
      { userId: 'u-002', name: 'Mike Johnson',  team: 'Platform',        hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.5 },
      { userId: 'u-003', name: 'Alex Rivera',   team: 'Backend',         hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.2 },
      { userId: 'u-004', name: 'Emily Watson',  team: 'Infrastructure',  hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.4 },
      { userId: 'u-005', name: 'Jordan Lee',    team: 'Frontend',        hoursPerDay: 8, daysOff: 1, spCapacityPerDay: 1.0 },
      { userId: 'u-006', name: 'Sam Parker',    team: 'Security',        hoursPerDay: 8, daysOff: 0, spCapacityPerDay: 1.3 },
    ],
    burndown: [
      { day: 'Mar 14', ideal: 50, actual: null },
      { day: 'Mar 16', ideal: 44, actual: null },
      { day: 'Mar 17', ideal: 41, actual: null },
      { day: 'Mar 18', ideal: 38, actual: null },
      { day: 'Mar 19', ideal: 35, actual: null },
      { day: 'Mar 20', ideal: 32, actual: null },
      { day: 'Mar 23', ideal: 26, actual: null },
      { day: 'Mar 24', ideal: 20, actual: null },
      { day: 'Mar 25', ideal: 14, actual: null },
      { day: 'Mar 26', ideal: 7,  actual: null },
      { day: 'Mar 27', ideal: 0,  actual: null },
    ],
  },
];
