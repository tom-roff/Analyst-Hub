export type AnalystInfo = {
  handle: string;
  name: string;
  pronouns: string;
  priority: number;
  deskLocation: {
    x: number | null;
    y: number | null;
  };
  wfhSelected: boolean;
};

export type ConsultRequest = {
  id: string
  state: 'requested' | 'ongoing' | 'completed'
  requesterSocketId: string
  requesterHandle: string
  requesterName: string
  requesterPronouns: string
  requesterLocX: number | null
  requesterLocY: number | null
  requesterWfhSelected: boolean
  topic: string
  attemptedSocketIds: Set<string>
  currentCandidateSocketId: string | null
  giverSocketId: string | null
  giverHandle: string | null
  startedAt: string | null
  completedAt: string | null
  timeout: ReturnType<typeof setTimeout> | null
  consultTimeout: ReturnType<typeof setTimeout> | null
};
