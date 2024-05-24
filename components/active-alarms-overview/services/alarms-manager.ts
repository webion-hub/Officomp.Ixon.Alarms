import { compact } from 'lodash-es';
import { ApiService } from './api.service';
import { AgentOrAsset } from '../models/agent';
import { RbacManager } from './rbac-manager';
import type { AgentDataAlarm, AgentDataAlarmOccurrence, ComponentContext, MyUser } from '@ixon-cdk/types';
import type { Alarm, MyUserMembership } from '../types';

type AlarmsPerAgent = {
  agentId: string;
  alarms: AgentDataAlarm[];
}[];

type AlarmOccurrencesPerAgent = {
  agentId: string;
  alarmOccurrences: AgentDataAlarmOccurrence[];
}[];

export class AlarmsManager {
  apiService: ApiService;
  rbacManager: RbacManager;

  constructor(context: ComponentContext) {
    this.apiService = new ApiService(context);
    this.rbacManager = new RbacManager(context);
  }

  public async getAlarms(myUser: MyUser): Promise<Alarm[]> {
    const myUserMemberships = await this.rbacManager.getMyUserMemberships(myUser);

    const apiAgentsAndAssets = await this.apiService.getAgentsAndAssets();
    if (!apiAgentsAndAssets) {
      return [];
    }
    const agentIds: string[] = compact(
      apiAgentsAndAssets.map(a => {
        if ('agent' in a && a.agent?.publicId) {
          return a.agent.publicId;
        }
        if (a.publicId) {
          return a.publicId;
        }
        return null;
      }),
    );

    // chunk to avoid api timeouts
    const chunkedAgentIds = this.chunk(agentIds, 100);

    const alarmsPerAgent = await this.getAlarmsPerAgent(chunkedAgentIds);
    const alarmOccurrencesPerAgent = await this.getAlarmOccurrencesPerAgent(chunkedAgentIds, alarmsPerAgent);

    const agentsOrAssets = apiAgentsAndAssets.map(a => {
      const agentId = 'agent' in a && a.agent?.publicId ? a.agent.publicId : a.publicId;
      return new AgentOrAsset(
        a.publicId,
        a.name ?? undefined,
        alarmsPerAgent.find(b => b.agentId === agentId)?.alarms,
        alarmOccurrencesPerAgent.find(b => b.agentId === agentId)?.alarmOccurrences,
      );
    });
    const alarms = agentsOrAssets.map(a => a.alarms).flat();

    return this.filterAlarmsOnAudiences(alarms, myUserMemberships);
  }

  public getActiveAlarms(myUser: MyUser): Promise<Alarm[]> {
    return this.getAlarms(myUser).then(alarms => alarms.filter(alarm => !!alarm.activeOccurrence));
  }

  private filterAlarmsOnAudiences(alarms: Alarm[], myUserMemberships: MyUserMembership[]): Alarm[] {
    return alarms.filter(alarm => {
      const agentId = alarm.agentOrAsset.publicId;
      const audienceId = alarm.audience;
      const relevantUserMemberships = myUserMemberships.filter(membership => {
        const sameAudience = membership?.role?.audiences?.find(a => a.publicId === audienceId);
        const sameAgent =
          membership.agents?.find(a => a?.publicId === agentId) || membership.group?.agent?.publicId === agentId;
        const sameAsset = membership.assets?.find(a => a?.publicId === agentId);
        return (sameAgent && sameAudience) || (sameAsset && sameAudience);
      });
      return relevantUserMemberships.length > 0;
    });
  }

  private async getAlarmsPerAgent(chunkedAgentIds: string[][]): Promise<AlarmsPerAgent> {
    const chunkedAlarms: AlarmsPerAgent = [];

    for (const agentChunk of chunkedAgentIds) {
      const chunkResults = await Promise.all(
        agentChunk.map(async agentId => {
          return { agentId, alarms: await this.apiService.getAlarms(agentId) };
        }),
      );

      chunkedAlarms.push(...chunkResults);

      // Introduce a delay between chunks, but not after the last chunk
      if (chunkedAgentIds.indexOf(agentChunk) !== chunkedAgentIds.length - 1) {
        await this.delay(100);
      }
    }

    return chunkedAlarms;
  }

  private async getAlarmOccurrencesPerAgent(
    chunkedAgentIds: string[][],
    alarmsPerAgent: AlarmsPerAgent,
  ): Promise<AlarmOccurrencesPerAgent> {
    const chunkedOccurrences: any[] = [];

    for (const agentChunk of chunkedAgentIds) {
      const chunkResults = await Promise.all(
        agentChunk.map(async agentId => {
          // if this agent has no alarms, we don't need to fetch alarm occurrences, so return an empty array
          if (alarmsPerAgent.find(a => a.agentId === agentId)?.alarms.length === 0) {
            return { agentId, alarmOccurrences: [] };
          }

          return { agentId, alarmOccurrences: await this.apiService.getLatestActiveAlarmOccurrences(agentId) };
        }),
      );

      chunkedOccurrences.push(...chunkResults);

      // Introduce a delay between chunks, but not after the last chunk
      if (chunkedAgentIds.indexOf(agentChunk) !== chunkedAgentIds.length - 1) {
        await this.delay(100);
      }
    }
    return chunkedOccurrences;
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const results = [];
    while (array.length) {
      results.push(array.splice(0, size));
    }
    return results;
  }

  private delay(ms: number): Promise<unknown> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
