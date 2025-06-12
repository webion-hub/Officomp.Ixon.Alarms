import type {
  Agent,
  AgentDataAlarm,
  AgentDataAlarmOccurrence,
  AgentMembership,
  Asset,
  AssetMembership,
  ComponentContext,
  Group,
  IxApiResponse,
  MyUser,
  Role,
  User,
  UserMembership,
} from "@ixon-cdk/types";

export class ApiService {
  context: ComponentContext;
  headers: {};

  constructor(context: ComponentContext) {
    this.context = context;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + this.context.appData.accessToken.secretId,
      "Api-Application": this.context.appData.apiAppId,
      "Api-Company": this.context.appData.company.publicId,
      "Api-Version": "2",
    };
  }

  async getAgentsAndAssets(): Promise<(Agent | Asset)[]> {
    const agents = await this._getAgents();
    const assets = await this._getAssets();
    const filteredAgents = agents.filter(
      (agent) =>
        !assets.some((asset) => asset.agent?.publicId === agent.publicId)
    );
    return [...filteredAgents, ...assets];
  }

  private async _getAgents(
    agents: Agent[] = [],
    moreAfter?: string | null
  ): Promise<Agent[]> {
    if (moreAfter === null) {
      // end recursion chain
      return agents;
    }
    const url = this.context.getApiUrl("AgentList", {
      fields: "name,publicId",
      filters: 'eq(activeStatus,"active")',
      "page-size": "4000",
      ...(moreAfter ? { "page-after": moreAfter } : {}),
    });

    const response: IxApiResponse<Agent[]> = await fetch(url, {
      headers: this.headers,
      method: "GET",
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    if (response) {
      return await this._getAgents(
        [...agents, ...response.data],
        response.moreAfter
      );
    }
    return [];
  }

  async getAlarms(agentId: string): Promise<AgentDataAlarm[]> {
    return await this._getAlarms(agentId);
  }

  private async _getAlarms(
    agentId: string,
    alarms: AgentDataAlarm[] = [],
    moreAfter?: string | null
  ): Promise<AgentDataAlarm[]> {
    if (moreAfter === null) {
      // end recursion chain
      return alarms;
    }
    const url = this.context.getApiUrl("AgentDataAlarmList", {
      agentId,
      fields: "audience,name,publicId,severity,source",
      "page-size": "4000",
      ...(moreAfter ? { "page-after": moreAfter } : {}),
    });
    const response: IxApiResponse<AgentDataAlarm[]> = await fetch(url, {
      headers: this.headers,
      method: "GET",
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    if (response) {
      return await this._getAlarms(
        agentId,
        [...alarms, ...response.data],
        response.moreAfter
      );
    }
    return [];
  }

  private async _getAssets(
    assets: Asset[] = [],
    moreAfter?: string | null
  ): Promise<Asset[]> {
    if (moreAfter === null) {
      // end recursion chain
      return assets;
    }
    const url = this.context.getApiUrl("AssetList", {
      fields: "name,publicId,agent.publicId",
      filters: "isnotnull(agent)",
      "page-size": "4000",
      ...(moreAfter ? { "page-after": moreAfter } : {}),
    });
    const response: IxApiResponse<Asset[]> = await fetch(url, {
      headers: this.headers,
      method: "GET",
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    if (response) {
      return await this._getAssets(
        [...assets, ...response.data],
        response.moreAfter
      );
    }
    return [];
  }

  async getLatestActiveAlarmOccurrences(
    agentId: string
  ): Promise<AgentDataAlarmOccurrence[]> {
    return await this._getLatestActiveAlarmOccurrences(agentId);
  }

  private async _getLatestActiveAlarmOccurrences(
    agentId: string,
    occurrences: AgentDataAlarmOccurrence[] = [],
    moreAfter?: string | null
  ): Promise<AgentDataAlarmOccurrence[]> {
    if (moreAfter === null) {
      // end recursion chain
      return occurrences;
    }
    const url = this.context.getApiUrl("AgentDataAlarmOccurrenceLatestList", {
      agentId,
      fields: "*,alarm,acknowledgedBy",
      filters: "isnull(rtnOn)",
      "page-size": "4000",
      ...(moreAfter ? { "page-after": moreAfter } : {}),
    });
    const response: IxApiResponse<AgentDataAlarmOccurrence[]> = await fetch(
      url,
      {
        headers: this.headers,
        method: "GET",
      }
    )
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    if (response) {
      return await this._getLatestActiveAlarmOccurrences(
        agentId,
        [...occurrences, ...response.data],
        response.moreAfter
      );
    }
    return [];
  }

  async getGroups(): Promise<Group[]> {
    return await this._getGroups();
  }

  private async _getGroups(
    groups: Group[] = [],
    moreAfter?: string | null
  ): Promise<Group[]> {
    if (moreAfter === null) {
      // end recursion chain
      return groups;
    }
    const url = this.context.getApiUrl("GroupList", {
      fields: "*,type.*,agent,isCompanyGroup,managedBy.*",
      "page-size": "4000",
      ...(moreAfter ? { "page-after": moreAfter } : {}),
    });
    const response: IxApiResponse<Group[]> = await fetch(url, {
      headers: this.headers,
      method: "GET",
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    if (response) {
      return await this._getGroups(
        [...groups, ...response.data],
        response.moreAfter
      );
    }
    return [];
  }

  async getRoles(): Promise<Role[]> {
    return await this._getRoles();
  }

  private async _getRoles(
    roles: Role[] = [],
    moreAfter?: string | null
  ): Promise<Role[]> {
    if (moreAfter === null) {
      // end recursion chain
      return roles;
    }
    const url = this.context.getApiUrl("RoleList", {
      fields: "*,audiences.*",
      "page-size": "4000",
      ...(moreAfter ? { "page-after": moreAfter } : {}),
    });
    const response: IxApiResponse<Role[]> = await fetch(url, {
      headers: this.headers,
      method: "GET",
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    if (response) {
      return await this._getRoles(
        [...roles, ...response.data],
        response.moreAfter
      );
    }
    return [];
  }

  async getAgentMemberships(): Promise<AgentMembership[]> {
    return await this._getAgentMemberships();
  }

  private async _getAgentMemberships(
    memberships: AgentMembership[] = [],
    moreAfter?: string | null
  ): Promise<AgentMembership[]> {
    if (moreAfter === null) {
      // end recursion chain
      return memberships;
    }
    const url = this.context.getApiUrl("AgentMembershipList", {
      fields: "*,agent.*,group.*",
      "page-size": "4000",
      ...(moreAfter ? { "page-after": moreAfter } : {}),
    });
    const response: IxApiResponse<AgentMembership[]> = await fetch(url, {
      headers: this.headers,
      method: "GET",
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    if (response) {
      return await this._getAgentMemberships(
        [...memberships, ...response.data],
        response.moreAfter
      );
    }
    return [];
  }

  async getAssetMemberships(): Promise<AssetMembership[]> {
    return await this._getAssetMemberships();
  }

  private async _getAssetMemberships(
    memberships: AgentMembership[] = [],
    moreAfter?: string | null
  ): Promise<AgentMembership[]> {
    if (moreAfter === null) {
      // end recursion chain
      return memberships;
    }
    const url = this.context.getApiUrl("AssetMembershipList", {
      fields: "*,asset.*,group.*",
      "page-size": "4000",
      ...(moreAfter ? { "page-after": moreAfter } : {}),
    });
    const response: IxApiResponse<AgentMembership[]> = await fetch(url, {
      headers: this.headers,
      method: "GET",
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    if (response) {
      return await this._getAssetMemberships(
        [...memberships, ...response.data],
        response.moreAfter
      );
    }
    return [];
  }

  async getUserMembershipsOfMyUser(myUser: MyUser): Promise<UserMembership[]> {
    const url = this.context.getApiUrl("User", {
      publicId: myUser.publicId,
      fields: "publicId,memberships.group,memberships.role",
    });
    const response: IxApiResponse<User> = await fetch(url, {
      headers: this.headers,
      method: "GET",
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    return response.data?.memberships ?? ([] as UserMembership[]);
  }

  public async getNameOfAcknowledgeBy(publicId: string) {
    const url = this.context.getApiUrl("User", {
      publicId: publicId,
      fields: "name",
    });
    const response: IxApiResponse<User> = await fetch(url, {
      headers: this.headers,
      method: "GET",
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error("Error:", error);
      });
    return response.data?.name ?? "";
  }

  public async acknowledgeAlarmOccurrence(
    agentId: string,
    publicId: string,
    acknowledged: boolean
  ) {
    const patchUrl = this.context.getApiUrl("AgentDataAlarmOccurrence", {
      agentId: agentId,
      publicId: publicId,
    });

    await fetch(patchUrl, {
      headers: this.headers,
      method: "PATCH",
      body: JSON.stringify({
        acknowledged: acknowledged,
      }),
    });
  }

  public async setAlarmOccurenceComment(
    agentId: string,
    publicId: string,
    comment: string
  ) {
    const patchUrl = this.context.getApiUrl("AgentDataAlarmOccurrence", {
      agentId: agentId,
      publicId: publicId,
    });

    await fetch(patchUrl, {
      headers: this.headers,
      method: "PATCH",
      body: JSON.stringify({
        comment: comment,
      }),
    });
  }
}
