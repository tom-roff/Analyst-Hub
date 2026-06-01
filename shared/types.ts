export type AnalystInfo = {
  handle: string;
  name: string;
  pronouns: string;
  priority: number;
  deskLocation: {
    x: number | null;
    y: number | null;
  };
};

export type ConsultRequest = {
  id: string
  requesterSocketId: string
  requesterName: string
  requesterLocX: number
  requesterLocY: number
  topic: string
  attemptedSocketIds: Set<string>
  currentCandidateSocketId: string | null
  timeout: ReturnType<typeof setTimeout> | null
};