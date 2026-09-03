import {
  actOutputSchema,
  closeMatchOutputSchema,
  gameGuideOutputSchema,
  listActionsOutputSchema,
  observeOutputSchema,
  startMatchOutputSchema,
  waitUntilActingOutputSchema,
  type PlayCompactStateV8,
} from "../contract/schemas";
import type { AgentPlayService } from "../contract/types";

const cursor = { seq: 0, state: "demo-state", tag: "demo-tag" } as const;
const changes = {
  commands: [],
  commandsComplete: true,
  complete: true,
  fromCommandSequence: 0,
  toCommandSequence: 0,
} as const;
const boardDefinition = {
  id: "demo-board",
  legend: "Public demo board",
  topology: "hex",
  topologyByTile: {
    crossing: "",
    resources: { food: [], mud: [], stone: [], wood: [] },
    river: [],
  },
} as const;

function state(canAct = true, round = 1): PlayCompactStateV8 {
  return {
    board: {
      boardDefinitionId: boardDefinition.id,
      buildings: [],
      edgeBlockers: [],
      hazards: [],
      lodgeRanges: [],
      pickups: [],
      units: [],
    },
    inviteCode: "DEMO",
    lobbySeats: [
      {
        approvedDifficulty: "normal",
        claimed: true,
        connected: true,
        controller: "mcp",
        requestedDifficulty: "normal",
        seatId: 0,
        teamId: 0,
      },
    ],
    match: {
      mode: "online",
      over: false,
      remainingEnemyTeams: 1,
      round,
      teams: [
        {
          livingBeavers: 1,
          livingLodges: 1,
          livingSeats: 1,
          relation: "you",
          seatIds: [0],
          teamId: 0,
        },
      ],
      victoryCondition: "last-living-team",
      wind: 0,
      winnerId: null,
      winningTeamId: null,
    },
    players: [
      {
        advancements: [],
        name: "Demo Agent",
        relation: "you",
        resources: { food: 4, mud: 3, stone: 2, wood: 5 },
        seatId: 0,
        storageCap: 20,
        teamId: 0,
      },
    ],
    seat: {
      canAct,
      defaultUnitId: null,
      seatId: 0,
      status: canAct ? "acting" : "queued",
    },
  };
}

export class MockAgentPlayService implements AgentPlayService {
  private active = false;
  private canAct = true;
  private round = 1;

  async gameGuide() {
    return gameGuideOutputSchema.parse({
      schemaVersion: 10,
      sections: [{ heading: "Demo", points: ["Use list_actions before act."] }],
      summary: "Public WebMCP demo.",
      topic: "overview",
    });
  }

  async join() {
    this.active = true;
    return startMatchOutputSchema.parse({
      boardDefinition,
      contractVersion: "10",
      currentState: state(true, this.round),
      cursor,
      roundTimer: { limitSeconds: 90, paused: false, remainingSeconds: 75 },
      schemaVersion: 10,
      sessionId: "demo-session",
    });
  }

  async observe() {
    return observeOutputSchema.parse({
      changes,
      currentState: state(this.canAct, this.round),
      cursor,
      roundTimer: { limitSeconds: 90, paused: false, remainingSeconds: 75 },
      schemaVersion: 10,
      sessionId: "demo-session",
    });
  }

  async listActions() {
    return listActionsOutputSchema.parse({
      catalogId: "demo-catalog",
      effectiveUnitId: null,
      groups: [
        {
          count: 2,
          items: [
            { actionId: "end-turn", label: "End turn", type: "end_turn" },
            {
              actionId: "hold-position",
              label: "Hold position",
              type: "hold_position",
            },
          ],
          kind: "actions",
          timing: "ends-seat",
        },
      ],
      scope: "overview",
      sessionId: "demo-session",
    });
  }

  async act() {
    this.canAct = false;
    return actOutputSchema.parse({
      action: {
        actionId: "end-turn",
        catalogId: "demo-catalog",
        label: "End turn",
        timing: "ends-seat",
        type: "end_turn",
      },
      changes,
      commands: [],
      consumedSeatAction: true,
      cursor: { ...cursor, seq: 1 },
      patch: { seat: { canAct: false, status: "queued" } },
      receiptId: "demo-receipt",
      schemaVersion: 10,
      sessionId: "demo-session",
      status: "accepted",
      submittedCommands: [],
    });
  }

  async waitUntilActing() {
    this.canAct = true;
    this.round += 1;
    return waitUntilActingOutputSchema.parse({
      changes,
      currentState: state(true, this.round),
      cursor: { ...cursor, seq: 2 },
      roundTimer: { limitSeconds: 90, paused: false, remainingSeconds: 70 },
      schemaVersion: 10,
      sessionId: "demo-session",
      status: "acting",
    });
  }

  async close() {
    this.active = false;
    return closeMatchOutputSchema.parse({
      closed: true,
      schemaVersion: 10,
      sessionId: "demo-session",
    });
  }

  dispose(): void {
    this.active = false;
  }
}
