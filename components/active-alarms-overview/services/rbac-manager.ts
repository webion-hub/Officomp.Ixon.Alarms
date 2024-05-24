import type { ComponentContext, MyUser } from '@ixon-cdk/types';
import type { MyUserMembership } from '../types';
import { ApiService } from './api.service';

export class RbacManager {
  apiService: ApiService;

  constructor(context: ComponentContext) {
    this.apiService = new ApiService(context);
  }

  public async getMyUserMemberships(myUser: MyUser): Promise<MyUserMembership[]> {
    const roles = await this.apiService.getRoles();
    const userMembershipsOfMyUser = await this.apiService.getUserMembershipsOfMyUser(myUser);
    const agentMemberships = await this.apiService.getAgentMemberships();
    const assetMemberships = await this.apiService.getAssetMemberships();
    const groups = await this.apiService.getGroups();
    const userMembershipsOfMyUserWithRelevantAgents = userMembershipsOfMyUser.map(membership => {
      const matchingAgents = agentMemberships
        ?.filter(agentM => agentM.group?.publicId === membership.group?.publicId)
        .map(agentM => agentM.agent ?? null)
        .filter(agent => !!agent);
      const matchingAssets = assetMemberships
        ?.filter(assetM => assetM.group?.publicId === membership.group?.publicId)
        .map(assetM => assetM.asset ?? null)
        .filter(asset => !!asset);

      const myUserMembership = membership as MyUserMembership;
      if (matchingAgents?.length) {
        myUserMembership.agents = matchingAgents;
      }
      if (matchingAssets?.length) {
        myUserMembership.assets = matchingAssets;
      }
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
