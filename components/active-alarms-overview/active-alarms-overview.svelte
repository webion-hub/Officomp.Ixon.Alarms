<script lang="ts">
  import { onMount } from "svelte";
  import { DateTime } from "luxon";
  import type {
    AgentDataAlarmOccurrence,
    ComponentContext,
    MyUser,
    ResourceDataClient,
  } from "@ixon-cdk/types";
  import { AlarmsManager } from "./services/alarms-manager";
  import type { Alarm, Input } from "./types";
  import { get, values } from "lodash";

  export let context: ComponentContext<Input>;

  let alarmsManager: AlarmsManager;
  let alarms: Alarm[];
  let aknowleddgedAlarms: AgentDataAlarmOccurrence;
  let client: ResourceDataClient;
  let loading = true;
  let myUser: MyUser | null;
  let tableWidth = 0;
  let tableScrollTop = 0;
  let doAutoRefresh = false;
  let autoRefreshInterval: number | undefined;
  let translations: Record<string, string>;
  let search = "";

  const red = "#FED7D7";
  const yellow = "#FEFCBF";
  const green = "#C6F6D5";

  $: alarms = alarms
    ?.map((alarm) => {
      alarm.backgroundColor = getBackgroundColor(
        alarm.severity,
        alarm.activeOccurrence?.acknowledged ?? false
      );
      return alarm;
    })
    ?.sort((a, b) => {
      let colorDifference =
        getColorPriority(a.backgroundColor) -
        getColorPriority(b.backgroundColor);
      return colorDifference;
    });

  $: isNarrow = tableWidth < 320;

  $: visibleAlarms = search
    ? alarms
        ?.filter((alarm) => alarm.source)
        .filter((alarm) => {
          const activeOcc = alarm.activeOccurrence;
          const activeSince = activeOcc?.occurredOn
            ? formatDateTime(activeOcc.occurredOn)
            : undefined;
          const alarmData = [
            alarm.agentOrAsset.name,
            alarm.name,
            alarm.severity,
          ];
          if (activeSince) {
            alarmData.push(activeSince);
          }
          return alarmData.find((x) =>
            x?.toLowerCase().includes(search.toLowerCase())
          );
        })
    : alarms?.filter((alarm) => alarm.source);

  function getBackgroundColor(severity: string, checked: boolean) {
    if (checked) {
      if (severity === "high") return yellow;
      if (severity === "medium") return green;
      return green;
    } else {
      if (severity === "high") return red;
      if (severity === "medium") return yellow;
      return green;
    }
  }

  function getColorPriority(bgColor?: string) {
    if (bgColor === red) return 1;
    if (bgColor === yellow) return 2;
    return 3;
  }

  async function updateAlarms(alarm: Alarm) {
    await alarmsManager.apiService.acknowledgeAlarmOccurrence(
      alarm.agentOrAsset.publicId,
      alarm.activeOccurrence?.publicId ?? "",
      !alarm.activeOccurrence?.acknowledged
    );

    await getCurrentActiveAlarms();
  }

  onMount(() => {
    alarmsManager = new AlarmsManager(context);
    client = context.createResourceDataClient();
    translations = context.translate(
      [
        "__TEXT__.NO_MATCHING_RESULTS",
        "ACTIVE_ALARMS",
        "ACTIVE_SINCE",
        "ALARM",
        "DEVICE",
        "SEARCH",
        "SEVERITY",
      ],
      undefined,
      { source: "global" }
    );
    client.query({ selector: "MyUser", fields: ["publicId"] }, ([result]) => {
      myUser = result.data;
      getCurrentActiveAlarms();
    });
    if (!!context.inputs.refreshRate) {
      toggleAutoRefresh();
    }
    return () => client.destroy();
  });

  function toggleRefresh(): void {
    getCurrentActiveAlarms();
  }

  function toggleAutoRefresh(): void {
    doAutoRefresh = !doAutoRefresh;

    if (doAutoRefresh) {
      autoRefreshInterval = window.setInterval(function () {
        getCurrentActiveAlarms();
      }, 30000);
    } else {
      clearInterval(autoRefreshInterval);
    }
  }

  function formatAlarmName(name: string): string {
    const ns = "__TRANSLATION__.";
    return name.startsWith(ns)
      ? context.translate(name.slice(ns.length), undefined, {
          source: "custom",
        })
      : name;
  }

  function formatAlarmSeverity(severity: string): string {
    return context.translate(
      `__SYSTEM_LABEL__.ALARM_${severity.toUpperCase()}`,
      undefined,
      { source: "global" }
    );
  }

  function formatDateTime(occurredOn: string): string {
    const milliseconds = DateTime.fromISO(occurredOn).toMillis();
    return DateTime.fromMillis(milliseconds, {
      locale: context.appData.locale,
      zone: context.appData.timeZone,
    }).toLocaleString({ ...DateTime.DATETIME_SHORT_WITH_SECONDS });
  }

  function goToAgent(agentId: string): void {
    context.navigateByUrl(`/devices/${agentId}`);
  }

  function handleTableScroll(event: Event): void {
    tableScrollTop = (event.target as HTMLDivElement).scrollTop;
  }

  async function getCurrentActiveAlarms(): Promise<void> {
    if (myUser) {
      loading = true;
      alarms = (await alarmsManager.getActiveAlarms(myUser)).sort((a, b) => {
        const delta = _getSortingWeight(b) - _getSortingWeight(a);
        return delta === 0 ? a.name.localeCompare(b.name) : delta;
      });
      loading = false;
    }
  }

  function _getSortingWeight(alarm: Alarm): number {
    return ["low", "medium", "high"].indexOf(alarm.severity) + 1;
  }

  function handleClickComment(alarm: Alarm) {
    context
      .openFormDialog({
        title: "Inserisci un commento",
        inputs: [
          {
            key: "body",
            type: "Text",
            label: "Commento",
            required: false,
            translate: false,
            value: { body: alarm.activeOccurrence?.comment ?? "" },
          },
        ],
        submitButtonText: "applica commento",
        cancelButtonText: "annulla",
        discardChangesPrompt: true,
        initialValue: {
          body: alarm.activeOccurrence?.comment ?? "",
        },
      })
      .then(async (result) => {
        if (result) {
          await alarmsManager.apiService.setAlarmOccurenceComment(
            alarm.agentOrAsset.publicId,
            alarm.activeOccurrence?.publicId ?? "",
            result.value.body as string
          );

          await getCurrentActiveAlarms();
        }
      });
  }
</script>

<div class="card">
  {#if loading}
    <div class="loading-state">
      <div class="spinner">
        <svg
          preserveAspectRatio="xMidYMid meet"
          focusable="false"
          viewBox="0 0 100 100"
        >
          <circle cx="50%" cy="50%" r="45" />
        </svg>
      </div>
    </div>
  {:else}
    <div class="card-header with-actions">
      <h3 class="card-title" data-testid="active-alarms-overview-card-title">
        <!-- TODO(remove-translation-fallback) -->
        {translations.ACTIVE_ALARMS === "ACTIVE_ALARMS"
          ? "Active alarms"
          : translations.ACTIVE_ALARMS}
      </h3>
      <div class="actions-top">
        <div
          class="search-input-container"
          style={isNarrow ? "width: 100px" : ""}
        >
          <div class="search-input-prefix">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path
                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
          </div>
          <input
            class="search-input"
            placeholder={translations?.SEARCH}
            bind:value={search}
            style={isNarrow ? "display: flex" : ""}
          />
        </div>
        <div class="refresh-container">
          <button class="refresh ripple" on:click={() => toggleRefresh()}>
            <svg width="24" height="24" viewBox="0 -960 960 960">
              <path
                d="M204-318q-22-38-33-78t-11-82q0-134 93-228t227-94h7l-64-64 56-56 160 160-160 160-56-56 64-64h-7q-100 0-170 70.5T240-478q0 26 6 51t18 49l-60 60ZM481-40 321-200l160-160 56 56-64 64h7q100 0 170-70.5T720-482q0-26-6-51t-18-49l60-60q22 38 33 78t11 82q0 134-93 228t-227 94h-7l64 64-56 56Z"
              />
            </svg>
          </button>
          <button
            class={doAutoRefresh
              ? "auto-refresh ripple active"
              : "auto-refresh ripple"}
            on:click={() => toggleAutoRefresh()}
            data-testid="active-alarms-overview-refresh-toggle"
          >
            30s
          </button>
        </div>
      </div>
    </div>
    <div class="card-content">
      {#if tableScrollTop > 0}
        <div class="table-header-drop-shadow" style="width: {tableWidth}px" />
      {/if}
      {#if visibleAlarms.length || !search}
        <div
          class="table-wrapper"
          bind:clientWidth={tableWidth}
          on:scroll={handleTableScroll}
        >
          <table class="base-table">
            <thead>
              <tr>
                <th>{translations.DEVICE}</th>
                <!-- TODO(remove-translation-fallback) -->
                <th
                  >{translations.ALARM === "ALARM"
                    ? "Alarm"
                    : translations.ALARM}</th
                >
                <th>{translations.SEVERITY}</th>
                <!-- TODO(remove-translation-fallback) -->
                <th
                  >{translations.ACTIVE_SINCE === "ACTIVE_SINCE"
                    ? "Active since"
                    : translations.ACTIVE_SINCE}</th
                >
                <th>Accettato da</th>
                <th>Commento</th>
              </tr>
            </thead>
            <tbody>
              {#each visibleAlarms || [] as alarm (alarm.publicId)}
                <tr
                  style="background-color: {alarm.backgroundColor};"
                  data-testid="active-alarms-overview-table-row"
                  on:click={() => goToAgent(alarm.agentOrAsset.publicId)}
                >
                  <td>{alarm.agentOrAsset.name}</td>
                  <td>{formatAlarmName(alarm.name)}</td>
                  <td>{formatAlarmSeverity(alarm.severity)}</td>
                  <td
                    >{alarm.activeOccurrence?.occurredOn
                      ? formatDateTime(alarm.activeOccurrence.occurredOn)
                      : ""}</td
                  >
                  <td
                    >{alarm.activeOccurrence?.acknowledgedBy?.reference?.name ??
                      ""}</td
                  >
                  <td>{alarm.activeOccurrence?.comment ?? ""}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={alarm.activeOccurrence?.acknowledged}
                      on:click|stopPropagation|self={() => updateAlarms(alarm)}
                      hidden={alarm.severity === "high"}
                    />
                  </td>
                  <td>
                    <template>
                      <svg
                        on:click|stopPropagation|self={() =>
                          handleClickComment(alarm)}
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M11 14h2v-3h3V9h-3V6h-2v3H8v2h3zm-9 8V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18H6z"
                        />
                      </svg>
                    </template>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="no-search-results">
          {translations["__TEXT__.NO_MATCHING_RESULTS"]}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  @import "./styles/card";
  @import "./styles/spinner";
  @import "./styles/table";
  @import "./styles/refresh";
  @import "./styles/ripple";
  @import "./styles/search-input";

  .card-header {
    margin-bottom: 8px;

    .actions-top {
      display: flex;
      flex-direction: row;
    }
  }

  .card-content {
    position: relative;
  }

  .loading-state {
    width: inherit;
    height: inherit;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .table-wrapper {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    padding: 8px;
    overflow: auto;
    overflow-anchor: none;
  }

  .table-header-drop-shadow {
    position: absolute;
    z-index: 10;
    top: 0;
    left: 0;
    width: 100%;
    height: 42px;
    background: var(--basic);
    box-shadow: 0 2px 2px 0 var(--card-border-color);
  }

  table.base-table {
    width: 100%;

    tr td {
      font-size: 14px;
      white-space: nowrap;
      padding-right: 24px;
    }

    thead {
      tr {
        border-bottom: none;

        th {
          position: sticky;
          white-space: nowrap;
          background: var(--basic);
          top: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 7em;
          z-index: 10;
        }
      }
    }

    tbody tr:hover {
      background-color: rgb(0 0 0 / 4%) !important;
      cursor: pointer;
    }
  }

  .no-search-results {
    font-size: 14px;
    margin-bottom: 16px;
  }
</style>
