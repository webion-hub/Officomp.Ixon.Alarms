import type { ComponentContext } from '@ixon-cdk/types';
import type { MyUserMembership } from '../types';
import { ApiService } from './api.service';

export class RbacManager {
  apiService: ApiService;

  constructor(context: ComponentContext) {
    this.apiService = new ApiService(context);
  }

  public async getMyUserMemberships(): Promise<MyUserMembership[]> {
    const myUser = await this.apiService.getMyUser();
    const roles = await this.apiService.getRoles();
    const userMemberships = await this.apiService.getUserMemberships();
    const agentMemberships = await this.apiService.getAgentMemberships();
    const groups = await this.apiService.getGroups();
    const userMembershipsOfMyUser = userMemberships.filter(m => m?.user?.publicId === myUser?.publicId);
    const userMembershipsOfMyUserWithRelevantAgents = userMembershipsOfMyUser.map(membership => {
      const matchingAgents = agentMemberships
        ?.filter(agentM => agentM.group?.publicId === membership.group?.publicId)
        .map(agentM => agentM.agent ?? null)
        .filter(agent => !!agent);
      if (!matchingAgents?.length) {
        return membership;
      }
      const myUserMembership = membership as MyUserMembership;
      myUserMembership.agents = matchingAgents;
      return myUserMembership;
    });
    const userMembershipsOfMyUserWithRelevantAgentsAndRelevantGroups = userMembershipsOfMyUserWithRelevantAgents.map(
      membership => {
        // Matching Group may contain an agent if the group is used for Device Specific Access
        const matchingGroup = groups?.find(group => {
          return group.publicId === membership.group?.publicId;
        });
        if (!matchingGroup) {
          return membership;
        }
        const myUserMembership = membership as MyUserMembership;
        myUserMembership.group = matchingGroup;
        return myUserMembership;
      },
    );
    const userMembershipsOfMyUserWithRelevantAgentsAndRelevantGroupsAndRelevantRoles =
      userMembershipsOfMyUserWithRelevantAgentsAndRelevantGroups
        .map(membership => {
          const matchingRole = roles?.find(role => {
            return role?.publicId === membership?.role?.publicId;
          });
          if (!matchingRole) {
            return membership;
          }
          const myUserMembership = membership as MyUserMembership;
          myUserMembership.role = matchingRole;
          return myUserMembership;
        })
        .filter(membership => !!membership?.role) as MyUserMembership[];

    return userMembershipsOfMyUserWithRelevantAgentsAndRelevantGroupsAndRelevantRoles;
  }
}
