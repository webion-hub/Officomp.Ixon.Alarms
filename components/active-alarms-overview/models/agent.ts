import type { Agent as IAgent, AgentDataAlarm, AgentDataAlarmOccurrence } from '@ixon-cdk/types';
import type { Alarm } from '../types';

export class Agent {
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
          agent: { name, publicId } as IAgent,
          severity: a.severity ?? '',
          audience: a.audience?.publicId ?? '',
          source: a.source ?? null,
        };
      }) ?? [];
  }
}
