import type { Agent, AgentDataAlarm, AgentDataAlarmOccurrence, Asset } from '@ixon-cdk/types';
import type { Alarm } from '../types';

export class AgentOrAsset {
  alarms: Alarm[];
  constructor(
    public publicId: string,
    public name?: string,
    alarms?: AgentDataAlarm[],
    alarmOccurrences?: AgentDataAlarmOccurrence[],
  ) {
    this.alarms =
      alarms?.map(a => {
        const activeAlarmOccurrence = alarmOccurrences?.find(occ => occ?.alarm?.publicId === a.publicId) ?? null;
        return {
          publicId: a.publicId,
          name: a.name ?? '',
          activeOccurrence: activeAlarmOccurrence,
          agentOrAsset: { name, publicId } as Agent | Asset,
          severity: a.severity ?? '',
          audience: a.audience?.publicId ?? '',
          source: a.source ?? null,
        };
      }) ?? [];
  }
}
