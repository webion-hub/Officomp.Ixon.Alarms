import type {
  Agent,
  AgentDataAlarmOccurrence,
  Asset,
  Group,
  ResLink,
  Role,
  UserMembership,
} from "@ixon-cdk/types";

export interface Alarm {
  publicId: string;
  name: string;
  activeOccurrence: AgentDataAlarmOccurrence | null;
  agentOrAsset: Agent | Asset;
  severity: string;
  source: ResLink | null;
  audience: string;
  backgroundColor?: string;
}

export interface MyUserMembership extends UserMembership {
  agents: (ResLink | null)[];
  assets: (ResLink | null)[];
  group: Group;
  role: Role;
}

export interface Input {
  refreshRate: number;
}
