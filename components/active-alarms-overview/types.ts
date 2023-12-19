import type { Agent, AgentDataAlarmOccurrence, Group, ResLink, Role, UserMembership } from '@ixon-cdk/types';

export interface Alarm {
  publicId: string;
  name: string;
  activeOccurrence: AgentDataAlarmOccurrence | null;
  agent: Agent;
  severity: string;
  audience: string;
};

export interface MyUserMembership extends UserMembership {
  agents: (ResLink | null)[];
  group: Group;
  role: Role;
}
