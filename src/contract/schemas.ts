import * as z from "zod/v4";
import { PLAY_MCP_CONTRACT_VERSION, PLAY_MCP_SCHEMA_VERSION } from "./version";

export { PLAY_MCP_CONTRACT_VERSION, PLAY_MCP_SCHEMA_VERSION } from "./version";

export const PLAY_MCP_ACTION_SCOPES = [
  "overview",
  "movement",
  "combat",
  "economy",
  "development",
  "special",
  "log-rocket",
] as const;
export const PLAY_MCP_ACT_STATUSES = [
  "accepted",
  "rejected",
  "partial",
] as const;
export const PLAY_MCP_WAIT_STATUSES = [
  "acting",
  "match-over",
  "timeout",
] as const;
export const PLAY_MCP_COMMAND_STATUSES = [
  "accepted",
  "rejected",
  "unknown",
] as const;
export const PLAY_MCP_TIMINGS = ["ends-seat", "keeps-seat-open"] as const;

const resourceKeySchema = z.enum(["food", "mud", "stone", "wood"]);
const relationSchema = z.enum(["you", "ally", "enemy", "predator"]);
const actorRelationSchema = z.enum([
  "you",
  "ally",
  "enemy",
  "predator",
  "system",
]);
const seatStatusSchema = z.enum([
  "acting",
  "queued",
  "resolving",
  "finished",
  "timed-out",
  "eliminated",
  "paused",
]);
const unitTypeSchema = z.enum(["bear", "beaver", "wolf"]);
const matchModeSchema = z.enum(["lobby", "local", "online"]);
const scopeSchema = z.enum(PLAY_MCP_ACTION_SCOPES);
const timingSchema = z.enum(PLAY_MCP_TIMINGS);
const attackModeSchema = z.enum(["close", "direct", "lane", "sniper"]);
const difficultySchema = z.enum(["easy", "normal", "hard", "expert", "heroic"]);
const roundSecondsSchema = z.union([
  z.literal(0),
  z.literal(15),
  z.literal(30),
  z.literal(60),
  z.literal(90),
  z.literal(120),
  z.literal(180),
]);

export const roundTimerSchema = z
  .object({
    limitSeconds: roundSecondsSchema,
    paused: z.boolean(),
    remainingSeconds: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const playCursorSchema = z
  .object({
    seq: z.number().int().nonnegative(),
    state: z.string().min(1),
    tag: z.string().min(1),
  })
  .strict();

export const playEffectBaseSchema = z.object({
  actorSeatId: z.number().int(),
  commandId: z.string(),
  ordinal: z.number().int().nonnegative(),
  relation: actorRelationSchema,
  sequence: z.number().int().nonnegative(),
});

const targetRefSchema = z.object({
  id: z.string(),
  kind: z.enum(["building", "unit"]),
});

export const playEffectSchema = z.discriminatedUnion("type", [
  playEffectBaseSchema.extend({
    fromTileKey: z.string(),
    toTileKey: z.string(),
    type: z.literal("unit-moved"),
    unitId: z.string(),
  }),
  playEffectBaseSchema.extend({
    damage: z.number(),
    downed: z.boolean().optional(),
    hpAfter: z.number(),
    hpBefore: z.number(),
    target: targetRefSchema,
    type: z.literal("unit-damaged"),
    unitId: z.string(),
    weaponKey: z.string().optional(),
  }),
  playEffectBaseSchema.extend({
    hpAfter: z.number(),
    hpBefore: z.number(),
    type: z.literal("unit-healed"),
    unitId: z.string(),
  }),
  playEffectBaseSchema.extend({
    hpBefore: z.number(),
    tileKey: z.string().optional(),
    type: z.literal("unit-downed"),
    unitId: z.string(),
  }),
  playEffectBaseSchema.extend({
    after: z.number().nullable(),
    before: z.number().nullable(),
    status: z.enum(["poisoned", "sleeping", "marksmanBraced"]),
    type: z.literal("unit-status-changed"),
    unitId: z.string(),
  }),
  playEffectBaseSchema.extend({
    buildingId: z.string(),
    buildingType: z.string(),
    tileKey: z.string(),
    type: z.literal("building-created"),
  }),
  playEffectBaseSchema.extend({
    buildingId: z.string(),
    destroyed: z.boolean().optional(),
    hpAfter: z.number(),
    hpBefore: z.number(),
    type: z.literal("building-damaged"),
    weaponKey: z.string().optional(),
  }),
  playEffectBaseSchema.extend({
    buildingId: z.string(),
    hpAfter: z.number(),
    hpBefore: z.number(),
    type: z.literal("building-healed"),
  }),
  playEffectBaseSchema.extend({
    buildingId: z.string(),
    hpAfter: z.number(),
    hpBefore: z.number(),
    levelAfter: z.number(),
    levelBefore: z.number(),
    maxHpAfter: z.number(),
    maxHpBefore: z.number(),
    type: z.literal("building-upgraded"),
  }),
  playEffectBaseSchema.extend({
    buildingId: z.string(),
    ownerAfter: z.number().int(),
    ownerBefore: z.number().int(),
    type: z.literal("building-claimed"),
  }),
  playEffectBaseSchema.extend({
    buildingId: z.string(),
    buildingType: z.string(),
    tileKey: z.string(),
    type: z.literal("building-destroyed"),
  }),
  playEffectBaseSchema.extend({
    after: z.number(),
    before: z.number(),
    delta: z.number(),
    resource: resourceKeySchema,
    seatId: z.number().int(),
    type: z.literal("resource-changed"),
  }),
  playEffectBaseSchema.extend({
    amount: z.number().positive(),
    gained: z.number().positive(),
    healed: z.number().nonnegative(),
    resource: resourceKeySchema,
    seatId: z.number().int(),
    tileKey: z.string(),
    type: z.literal("timeout-harvested"),
    unitId: z.string(),
  }),
  playEffectBaseSchema.extend({
    tileKey: z.string().optional(),
    type: z.literal("unit-recruited"),
    unitId: z.string(),
  }),
  playEffectBaseSchema.extend({
    after: z.string().nullable(),
    before: z.string().nullable(),
    type: z.literal("profession-changed"),
    unitId: z.string(),
  }),
  playEffectBaseSchema.extend({
    advancementKey: z.string(),
    type: z.literal("advancement-bought"),
  }),
  playEffectBaseSchema.extend({
    pickupId: z.string(),
    tileKey: z.string(),
    type: z.literal("pickup-created"),
    upgradeKey: z.string().optional(),
  }),
  playEffectBaseSchema.extend({
    pickupId: z.string(),
    tileKey: z.string(),
    type: z.literal("pickup-collected"),
    unitId: z.string().optional(),
    upgradeKey: z.string().optional(),
  }),
  playEffectBaseSchema.extend({
    after: z.array(z.string()),
    before: z.array(z.string()),
    type: z.literal("defensive-upgrade-changed"),
    unitId: z.string(),
  }),
  playEffectBaseSchema.extend({
    after: z.number().nullable(),
    before: z.number().nullable(),
    kind: z.enum(["fire", "mud", "toxic-mud"]),
    tileKey: z.string(),
    type: z.literal("hazard-changed"),
  }),
  playEffectBaseSchema.extend({
    after: z.array(z.string().nullable()),
    before: z.array(z.string().nullable()),
    tileKey: z.string(),
    type: z.literal("wall-changed"),
  }),
  playEffectBaseSchema.extend({
    predatorId: z.string(),
    predatorType: z.enum(["bear", "wolf"]),
    tileKey: z.string(),
    type: z.literal("predator-spawned"),
  }),
  playEffectBaseSchema.extend({
    fromTileKey: z.string(),
    predatorId: z.string(),
    predatorType: z.enum(["bear", "wolf"]),
    toTileKey: z.string(),
    type: z.literal("predator-moved"),
  }),
  playEffectBaseSchema.extend({
    damage: z.number(),
    downed: z.boolean(),
    kind: z.enum(["maul", "smash"]),
    predatorId: z.string(),
    predatorType: z.enum(["bear", "wolf"]),
    targetId: z.string(),
    type: z.literal("predator-attacked"),
  }),
  playEffectBaseSchema.extend({
    after: z.number(),
    before: z.number(),
    type: z.literal("wind-changed"),
  }),
  playEffectBaseSchema.extend({
    after: z.number(),
    before: z.number(),
    type: z.literal("round-changed"),
  }),
  playEffectBaseSchema.extend({
    type: z.literal("match-completed"),
    winnerId: z.number().int().nullable(),
    winningTeamId: z.number().int().nullable(),
  }),
  playEffectBaseSchema.extend({
    damage: z.number(),
    downed: z.boolean(),
    firedCount: z.number(),
    type: z.literal("sentry-reaction"),
    unitId: z.string(),
  }),
  playEffectBaseSchema.extend({
    buildingId: z.string(),
    type: z.literal("attack-intercepted"),
  }),
  playEffectBaseSchema.extend({
    collisionKind: z.enum([
      "building",
      "intercepted",
      "tile",
      "timeout",
      "unit",
    ]),
    flightTicks: z.number().int().nonnegative(),
    guidanceBiasRadians: z.number().optional(),
    impactTileKey: z.string().nullable(),
    intendedTileKey: z.string(),
    interceptedBySeatId: z.number().int().nullable(),
    scientistId: z.string(),
    type: z.literal("log-rocket-resolved"),
  }),
]);

export const playChangesSchema = z
  .object({
    commands: z.array(
      z
        .object({
          actor: z.number().int(),
          effects: z.array(z.object({ type: z.string() }).passthrough()),
          id: z.string(),
          relation: actorRelationSchema,
          seq: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    commandsComplete: z.boolean(),
    complete: z.boolean(),
    fromCommandSequence: z.number().int().nonnegative(),
    resetRequired: z.boolean().optional(),
    toCommandSequence: z.number().int().nonnegative(),
  })
  .strict();

const resourcesSchema = z
  .object({
    food: z.number(),
    mud: z.number(),
    stone: z.number(),
    wood: z.number(),
  })
  .strict();

export const playCompactUnitSchema = z
  .object({
    cooldownRoundsRemaining: z
      .record(z.string(), z.number().int().positive())
      .optional(),
    defensiveUpgrades: z.array(z.string()).optional(),
    hp: z.number(),
    id: z.string(),
    marksmanBraced: z.boolean().optional(),
    maxHp: z.number(),
    movedThisRound: z.boolean(),
    name: z.string(),
    poisoned: z.number().optional(),
    profession: z.string().nullable(),
    credibleThreatCount: z.number().int().nonnegative().optional(),
    credibleThreats: z
      .array(
        z
          .object({
            distance: z.number().int().nonnegative(),
            fromUnitId: z.string(),
            weaponKeys: z.array(z.string()).min(1),
          })
          .strict(),
      )
      .optional(),
    credibleThreatsTruncated: z.boolean().optional(),
    relation: relationSchema,
    sleeping: z.number().optional(),
    tileKey: z.string(),
    token: z.string(),
    type: unitTypeSchema,
    underlay: resourceKeySchema.optional(),
  })
  .strict();

export const playCompactBuildingSchema = z
  .object({
    armed: z.boolean().optional(),
    hp: z.number(),
    id: z.string(),
    level: z.number(),
    maxHp: z.number(),
    relation: relationSchema,
    resourceKind: z.string().nullable().optional(),
    temporary: z.boolean().optional(),
    tileKey: z.string(),
    type: z.string(),
    underlay: resourceKeySchema.optional(),
  })
  .strict();

export const playBoardDefinitionSchema = z
  .object({
    id: z.string(),
    legend: z.string(),
    topology: z.string(),
    topologyByTile: z
      .object({
        crossing: z.string(),
        resources: z
          .object({
            food: z.array(z.string()),
            mud: z.array(z.string()),
            stone: z.array(z.string()),
            wood: z.array(z.string()),
          })
          .strict(),
        river: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export const playCompactStateSchema = z
  .object({
    board: z
      .object({
        boardDefinitionId: z.string(),
        buildings: z.array(playCompactBuildingSchema),
        edgeBlockers: z.array(
          z
            .object({
              sideIndex: z.number().int(),
              tileKey: z.string(),
              type: z.string(),
            })
            .strict(),
        ),
        hazards: z.array(
          z
            .object({
              expiresRound: z.number().int().optional(),
              kind: z.enum(["fire", "mud", "toxic-mud"]),
              ticks: z.number().optional(),
              tileKey: z.string(),
              turns: z.number().optional(),
            })
            .strict(),
        ),
        lodgeRanges: z.array(
          z
            .object({
              radius: z.number().int().positive(),
              tileKey: z.string(),
            })
            .strict(),
        ),
        pickups: z.array(
          z
            .object({
              id: z.string(),
              resources: z.record(z.string(), z.number()).optional(),
              tileKey: z.string(),
              type: z.literal("defensivePickup"),
              upgradeKey: z.string().optional(),
            })
            .strict(),
        ),
        units: z.array(playCompactUnitSchema),
      })
      .strict(),
    inviteCode: z.string().optional(),
    lobbySeats: z
      .array(
        z
          .object({
            approvedDifficulty: difficultySchema.nullable(),
            claimed: z.boolean(),
            connected: z.boolean(),
            controller: z.enum(["ai", "human", "mcp"]),
            requestedDifficulty: difficultySchema.nullable(),
            seatId: z.number().int(),
            teamId: z.number().int(),
          })
          .strict(),
      )
      .optional(),
    match: z
      .object({
        mode: matchModeSchema,
        over: z.boolean(),
        round: z.number().int(),
        wind: z.number(),
        winnerId: z.number().int().nullable(),
        winningTeamId: z.number().int().nullable(),
        remainingEnemyTeams: z.number().int().nonnegative(),
        teams: z.array(
          z
            .object({
              livingBeavers: z.number().int().nonnegative(),
              livingLodges: z.number().int().nonnegative(),
              livingSeats: z.number().int().nonnegative(),
              relation: z.enum(["enemy", "you"]),
              seatIds: z.array(z.number().int()),
              teamId: z.number().int(),
            })
            .strict(),
        ),
        victoryCondition: z.literal("last-living-team"),
      })
      .strict(),
    players: z.array(
      z
        .object({
          advancements: z.array(z.string()),
          name: z.string(),
          relation: z.enum(["you", "ally", "enemy"]),
          resources: resourcesSchema,
          seatId: z.number().int(),
          storageCap: z.number(),
          teamId: z.number().int(),
        })
        .strict(),
    ),
    seat: z
      .object({
        canAct: z.boolean(),
        defaultUnitId: z.string().nullable(),
        seatId: z.number().int(),
        status: seatStatusSchema,
        timeoutHarvest: z
          .object({
            candidates: z.array(
              z
                .object({
                  amount: z.number().nonnegative(),
                  expectedGain: z.number().nonnegative(),
                  healAmount: z.number().positive().optional(),
                  resource: resourceKeySchema,
                  tileKey: z.string(),
                  unitId: z.string(),
                  wouldHeal: z.boolean(),
                })
                .strict(),
            ),
            guaranteed: z
              .object({
                amount: z.number().nonnegative(),
                expectedGain: z.number().nonnegative(),
                healAmount: z.number().positive().optional(),
                resource: resourceKeySchema,
                tileKey: z.string(),
                unitId: z.string(),
                wouldHeal: z.boolean(),
              })
              .strict()
              .nullable(),
            selection: z.literal("random-at-boundary"),
          })
          .strict()
          .optional(),
      })
      .strict(),
  })
  .strict();

const keyedStatePatchSchema = <T extends z.ZodType>(schema: T) =>
  z
    .object({
      order: z.array(z.string()).optional(),
      remove: z.array(z.string()).optional(),
      upsert: z.array(schema).optional(),
    })
    .strict();

export const playStatePatchSchema = z
  .object({
    board: z
      .object({
        boardDefinitionId: z.string().optional(),
        buildings: keyedStatePatchSchema(playCompactBuildingSchema).optional(),
        edgeBlockers: keyedStatePatchSchema(
          playCompactStateSchema.shape.board.shape.edgeBlockers.element,
        ).optional(),
        hazards: keyedStatePatchSchema(
          playCompactStateSchema.shape.board.shape.hazards.element,
        ).optional(),
        lodgeRanges: z
          .array(
            z
              .object({
                radius: z.number().int().positive(),
                tileKey: z.string(),
              })
              .strict(),
          )
          .optional(),
        pickups: keyedStatePatchSchema(
          playCompactStateSchema.shape.board.shape.pickups.element,
        ).optional(),
        units: keyedStatePatchSchema(playCompactUnitSchema).optional(),
      })
      .strict()
      .optional(),
    inviteCode: z.string().nullable().optional(),
    lobbySeats: playCompactStateSchema.shape.lobbySeats
      .unwrap()
      .nullable()
      .optional(),
    match: playCompactStateSchema.shape.match.partial().optional(),
    players: z
      .object({
        order: z.array(z.number().int()).optional(),
        remove: z.array(z.number().int()).optional(),
        upsert: z
          .array(playCompactStateSchema.shape.players.element)
          .optional(),
      })
      .strict()
      .optional(),
    seat: playCompactStateSchema.shape.seat
      .partial()
      .extend({
        timeoutHarvest: playCompactStateSchema.shape.seat.shape.timeoutHarvest
          .nullable()
          .optional(),
      })
      .optional(),
  })
  .strict();

export const startMatchOutputSchema = z
  .object({
    boardDefinition: playBoardDefinitionSchema,
    contractVersion: z.literal(PLAY_MCP_CONTRACT_VERSION),
    currentState: playCompactStateSchema,
    cursor: playCursorSchema,
    roundTimer: roundTimerSchema,
    schemaVersion: z.literal(PLAY_MCP_SCHEMA_VERSION),
    sessionId: z.string(),
  })
  .strict();

export const observeInputSchema = z
  .object({
    sessionId: z.string().min(1),
    sinceCursor: playCursorSchema.optional(),
  })
  .strict();

export const observeOutputSchema = z
  .object({
    boardDefinition: playBoardDefinitionSchema.optional(),
    changes: playChangesSchema,
    currentState: playCompactStateSchema.optional(),
    cursor: playCursorSchema,
    patch: playStatePatchSchema.optional(),
    resetRequired: z.boolean().optional(),
    roundTimer: roundTimerSchema.optional(),
    schemaVersion: z.literal(PLAY_MCP_SCHEMA_VERSION).optional(),
    sessionId: z.string(),
  })
  .strict();

const costSchema = z.record(z.string(), z.number()).optional();

const catalogItemSchema = z
  .object({
    actionId: z.string(),
    advancementKey: z.string().optional(),
    amount: z.number().optional(),
    autoAim: z
      .object({
        mode: attackModeSchema,
        usesCurrentWind: z.boolean(),
      })
      .strict()
      .optional(),
    buildingId: z.string().optional(),
    claimedBuildingCount: z.number().int().nonnegative().optional(),
    claimedBuildingIds: z.array(z.string()).optional(),
    cost: costSchema,
    cooldownRounds: z.number().int().nonnegative().optional(),
    distanceToObjective: z.number().int().nonnegative().optional(),
    effect: z.enum(["claim", "destroy"]).optional(),
    firstStepDirection: z.enum(["NE", "N", "NW", "SW", "S", "SE"]).optional(),
    fromResource: resourceKeySchema.optional(),
    healForecast: z
      .object({
        hpAfter: z.number().nonnegative(),
        hpBefore: z.number().nonnegative(),
        restoredHp: z.number().nonnegative(),
      })
      .strict()
      .optional(),
    label: z.string().optional(),
    logRocketPrediction: z
      .object({
        affected: z
          .array(
            z
              .object({
                expectedDamage: z.number().nonnegative(),
                hitPercent: z.number().int().min(0).max(100),
                hp: z.number().nonnegative(),
                id: z.string(),
                kind: z.enum(["building", "unit"]),
                relation: relationSchema,
                tileKey: z.string(),
              })
              .strict(),
          )
          .optional(),
        affectedCount: z.number().int().nonnegative(),
        affectedTruncated: z.boolean().optional(),
        expectedEnemyDamage: z.number().nonnegative(),
        expectedFriendlyDamage: z.number().nonnegative(),
        friendlyCatastrophePercent: z.number().int().min(0).max(100),
        guidance: z
          .object({
            selectedTileImpactPercent: z.number().int().min(0).max(100),
            targetInBlastPercent: z.number().int().min(0).max(100),
          })
          .strict(),
        interception: z
          .object({
            automaticHitPercent: z.number().int().min(0).max(100),
            hitPercent: z.number().int().min(0).max(100).nullable(),
            manualPossible: z.boolean(),
            mode: z.enum(["automatic", "manual", "mixed", "none"]),
          })
          .strict(),
        model: z.literal("generated-guidance"),
      })
      .strict()
      .optional(),
    logRocketStep: z.enum(["arm", "build", "fire"]).optional(),
    optionKey: z.string().optional(),
    path: z.array(z.string()).optional(),
    professionKey: z.string().optional(),
    rate: z.number().optional(),
    resource: resourceKeySchema.optional(),
    sentryReaction: z
      .object({
        shots: z.array(
          z
            .object({
              damage: z.number().nonnegative(),
              sentryId: z.string(),
              tileKey: z.string(),
            })
            .strict(),
        ),
        totalDamage: z.number().nonnegative(),
        wouldDownFromSentriesAlone: z.boolean(),
      })
      .strict()
      .optional(),
    specialKey: z.string().optional(),
    steps: z.number().int().nonnegative().optional(),
    target: targetRefSchema.optional(),
    targetUnitId: z.string().optional(),
    targetTileKey: z.string().optional(),
    tileKey: z.string().optional(),
    timing: timingSchema.optional(),
    toResource: resourceKeySchema.optional(),
    trapThrowPrediction: z
      .object({
        collisionRelation: relationSchema.optional(),
        collisionTargetId: z.string().optional(),
        friendlyUnitRisk: z.boolean(),
        hostBuildingId: z.string().optional(),
        impactDamage: z.number().nonnegative().optional(),
        interceptedByBuildingId: z.string().optional(),
        landingTileKey: z.string().optional(),
        outcomeKind: z.string(),
      })
      .strict()
      .optional(),
    type: z.string().optional(),
    unitId: z.string().optional(),
    weaponKey: z.string().optional(),
  })
  .strict();

const combatTargetSchema = z
  .object({
    distance: z.number().int().nonnegative(),
    hp: z.number(),
    id: z.string(),
    kind: z.enum(["building", "unit"]),
    level: z.number().int().optional(),
    maxHp: z.number(),
    relation: relationSchema,
    tileKey: z.string(),
    type: z.string(),
  })
  .strict();

const attackAccuracySchema = z
  .object({
    friendlyHitPercent: z.number().int().min(0).max(100),
    headshotPercent: z.number().int().min(0).max(100),
    intendedZone: z.enum(["body", "head", "tile"]),
    targetHitPercent: z.number().int().min(0).max(100),
  })
  .strict();

const attackDamageSchema = z
  .object({
    damagePerHit: z.number().int().nonnegative(),
    expectedTotalDamage: z.number().nonnegative(),
    lethalIfAllHit: z.boolean(),
    lethalIfHit: z.boolean(),
    maxVolleyDamage: z.number().nonnegative(),
    outcomes: z.array(
      z
        .object({
          aimRadius: z.number().int().nonnegative(),
          damagePerHit: z.number().int().nonnegative(),
          hitPercent: z.number().int().min(0).max(100),
          lethalIfHit: z.boolean(),
        })
        .strict(),
    ),
    projectileCount: z.number().int().positive(),
  })
  .strict();

const attackImpactEntitySchema = z
  .object({
    id: z.string(),
    kind: z.enum(["building", "unit"]),
    relation: z.enum(["ally", "enemy", "you"]),
  })
  .strict();

const attackCollateralSchema = attackImpactEntitySchema
  .extend({
    expectedDamage: z.number().nonnegative(),
    lethalPercent: z.number().int().min(0).max(100),
  })
  .strict();

const attackImpactOutcomeSchema = z.enum([
  "clear",
  "blocked-by-enemy",
  "blocked-by-friendly",
  "no-current-impact",
]);

const attackImpactSchema = z
  .object({
    alliedLodgeLethalPercent: z.number().int().min(0).max(100),
    alliedUnitLethalPercent: z.number().int().min(0).max(100),
    blockedByEnemyPercent: z.number().int().min(0).max(100),
    blockedByFriendlyPercent: z.number().int().min(0).max(100),
    blocker: attackImpactEntitySchema.optional(),
    collateral: z.array(attackCollateralSchema),
    dominantOutcome: attackImpactOutcomeSchema,
    expectedEnemyCollateralDamage: z.number().nonnegative(),
    expectedFriendlyCollateralDamage: z.number().nonnegative(),
    intendedTargetHitPercent: z.number().int().min(0).max(100),
    noImpactPercent: z.number().int().min(0).max(100),
    outcome: attackImpactOutcomeSchema,
    primaryCollateral: attackCollateralSchema.optional(),
    primaryCollisionBlocker: attackImpactEntitySchema.optional(),
  })
  .strict();

const unavailableChoiceSchema = z
  .object({
    buildingId: z.string().optional(),
    cost: costSchema,
    key: z.string(),
    label: z.string().optional(),
    missingResources: costSchema,
    reason: z.string().optional(),
    reasonCode: z.string(),
    tileKey: z.string().optional(),
    type: z.string(),
    unitId: z.string().optional(),
  })
  .strict();

const movementBlockerSchema = z
  .object({
    buildingId: z.string().optional(),
    fromTileKey: z.string().optional(),
    kind: z.enum([
      "closed-destination",
      "edge-blocker",
      "occupied-tile",
      "river",
      "terminal-building",
    ]),
    sideIndex: z.number().int().min(0).max(5).optional(),
    tileKey: z.string(),
    unitId: z.string().optional(),
  })
  .strict();

const catalogRemainderSchema = z
  .object({
    count: z.number().int().nonnegative(),
    byTargetKind: z
      .object({
        building: z.number().int().nonnegative(),
        unit: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
    blockedCount: z.number().int().nonnegative().optional(),
    friendlyBlockedCount: z.number().int().nonnegative().optional(),
    lethalCount: z.number().int().nonnegative().optional(),
    maxExpectedDamage: z.number().nonnegative().optional(),
    maxExpectedTotalDamage: z.number().nonnegative().optional(),
    minFriendlyHitPercent: z.number().int().min(0).max(100).optional(),
    maxExpectedEnemyDamage: z.number().nonnegative().optional(),
    maxSelectedTileImpactPercent: z.number().int().min(0).max(100).optional(),
    minExpectedFriendlyDamage: z.number().nonnegative().optional(),
    minFriendlyCatastrophePercent: z.number().int().min(0).max(100).optional(),
    zeroTargetHitCount: z.number().int().nonnegative().optional(),
  })
  .strict();

export const playCatalogGroupSchema = z
  .object({
    attacks: z
      .array(
        z
          .object({
            target: combatTargetSchema,
            weapons: z.array(
              z
                .object({
                  accuracy: attackAccuracySchema,
                  actionId: z.string(),
                  damage: attackDamageSchema,
                  impact: attackImpactSchema,
                  weaponKey: z.string(),
                })
                .strict(),
            ),
          })
          .strict(),
      )
      .optional(),
    builds: z
      .array(
        z
          .object({
            cost: costSchema,
            optionKey: z.string(),
            tiles: z.array(
              z
                .object({
                  actionId: z.string(),
                  label: z.string(),
                  tileKey: z.string(),
                  timing: timingSchema,
                })
                .strict(),
            ),
          })
          .strict(),
      )
      .optional(),
    count: z.number().int().nonnegative(),
    difficulty: difficultySchema.optional(),
    fromTileKey: z.string().optional(),
    items: z.array(catalogItemSchema).optional(),
    kind: z.string(),
    logRocketInterception: z
      .object({
        interceptors: z.array(
          z
            .object({
              hitPercent: z.number().int().min(0).max(100).nullable(),
              mode: z.enum(["automatic", "manual"]),
              seatId: z.number().int().nonnegative(),
              tileKey: z.string(),
              unitId: z.string(),
            })
            .strict(),
        ),
        scope: z.literal("map-wide"),
      })
      .strict()
      .optional(),
    matchedCount: z.number().int().nonnegative().optional(),
    omittedByDefault: catalogRemainderSchema.optional(),
    objective: z
      .object({
        approach: z
          .object({
            bestRouteDistanceAfterMove: z
              .number()
              .int()
              .nonnegative()
              .nullable(),
            bestTileKey: z.string().nullable(),
            currentRouteDistance: z.number().int().nonnegative(),
            nextWaypointTileKey: z.string().optional(),
            pathExists: z.literal(true),
            tileKey: z.string(),
          })
          .strict()
          .optional(),
        bestRouteDistanceAfterMove: z.number().int().nonnegative().nullable(),
        bestTileKey: z.string().nullable(),
        blocker: movementBlockerSchema.optional(),
        currentRouteDistance: z.number().int().nonnegative().nullable(),
        exact: z
          .object({
            blocker: movementBlockerSchema.optional(),
            pathExists: z.boolean(),
            reachableThisAction: z.boolean(),
          })
          .strict(),
        nextWaypointTileKey: z.string().optional(),
        occupation: z
          .object({
            buildingId: z.string(),
            claimedBuildingIds: z.array(z.string()),
            effect: z.enum(["claim", "destroy"]),
            legalNow: z.boolean(),
            reason: z.literal("must-stand-on-target").optional(),
            requiredTileKey: z.string(),
          })
          .strict()
          .optional(),
        pathExistsOnCurrentBoard: z.boolean(),
        reachableThisAction: z.boolean(),
        retargetRequired: z.boolean(),
        tileKey: z.string(),
      })
      .strict()
      .optional(),
    outsideRequestedLimitCount: z.number().int().nonnegative().optional(),
    remaining: catalogRemainderSchema.optional(),
    trades: z
      .array(
        z
          .object({
            fromResource: resourceKeySchema,
            options: z.array(
              z
                .object({
                  actionId: z.string(),
                  cost: costSchema,
                  label: z.string(),
                  rate: z.number().optional(),
                  timing: timingSchema,
                  toResource: resourceKeySchema,
                })
                .strict(),
            ),
          })
          .strict(),
      )
      .optional(),
    truncated: z.boolean().optional(),
    totalLegalCount: z.number().int().nonnegative().optional(),
    timing: timingSchema.optional(),
    unitId: z.string().optional(),
    weaponDefs: z
      .record(
        z.string(),
        z
          .object({
            autoAim: z
              .object({ mode: attackModeSchema, usesCurrentWind: z.boolean() })
              .strict(),
            label: z.string(),
            projectileCount: z.number().int().positive(),
          })
          .strict(),
      )
      .optional(),
    wind: z.number().optional(),
  })
  .strict();

const movementQuerySchema = z
  .object({
    maxResults: z.number().int().min(1).max(64).optional(),
    requireOwnedLodgeRange: z.boolean().optional(),
    resource: resourceKeySchema.optional(),
    towardTileKey: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.maxResults !== undefined &&
      !value.towardTileKey &&
      !value.resource &&
      value.requireOwnedLodgeRange !== true
    ) {
      context.addIssue({
        code: "custom",
        message:
          "maxResults requires towardTileKey, resource, or requireOwnedLodgeRange.",
        path: ["maxResults"],
      });
    }
  });

const combatQuerySchema = z
  .object({
    buildingId: z.string().min(1).optional(),
    maxResults: z.number().int().min(1).max(64).optional(),
    outcome: z.enum(["clear", "blocked", "any"]).optional(),
    targetKind: z.enum(["unit", "building"]).optional(),
    unitId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.unitId && value.buildingId) {
      context.addIssue({
        code: "custom",
        message: "combatQuery accepts only one target ID.",
      });
    }
    if (value.unitId && value.targetKind === "building") {
      context.addIssue({
        code: "custom",
        message: "unitId requires targetKind unit.",
        path: ["unitId"],
      });
    }
    if (value.buildingId && value.targetKind === "unit") {
      context.addIssue({
        code: "custom",
        message: "buildingId requires targetKind building.",
        path: ["buildingId"],
      });
    }
  });

export const listActionsInputSchema = z
  .object({
    catalogId: z.string().min(1).optional(),
    combatQuery: combatQuerySchema.optional(),
    cursor: playCursorSchema,
    detailActionIds: z.array(z.string().min(1)).min(1).max(8).optional(),
    movementQuery: movementQuerySchema.optional(),
    pageToken: z.string().min(1).optional(),
    scope: scopeSchema.optional(),
    sessionId: z.string().min(1),
    unitId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.movementQuery && value.scope !== "movement") {
      context.addIssue({
        code: "custom",
        message: "movementQuery requires scope movement.",
        path: ["movementQuery"],
      });
    }
    if (value.combatQuery && value.scope !== "combat") {
      context.addIssue({
        code: "custom",
        message: "combatQuery requires scope combat.",
        path: ["combatQuery"],
      });
    }
    if (value.movementQuery && value.pageToken) {
      context.addIssue({
        code: "custom",
        message:
          "Movement catalogs are unpaginated; pageToken cannot be combined with movementQuery.",
        path: ["pageToken"],
      });
    }
    if (
      value.detailActionIds &&
      (value.scope !== "log-rocket" || !value.catalogId || value.pageToken)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "detailActionIds requires log-rocket scope and catalogId, without pageToken.",
        path: ["detailActionIds"],
      });
    }
    if (value.catalogId && !value.detailActionIds) {
      context.addIssue({
        code: "custom",
        message: "catalogId is accepted only with detailActionIds.",
        path: ["catalogId"],
      });
    }
  });

export const listActionsOutputSchema = z
  .object({
    boardDefinition: playBoardDefinitionSchema.optional(),
    catalogId: z.string(),
    changes: playChangesSchema.optional(),
    currentState: playCompactStateSchema.optional(),
    cursor: playCursorSchema.optional(),
    effectiveUnitId: z.string().nullable(),
    groups: z.array(playCatalogGroupSchema),
    nextPageToken: z.string().optional(),
    patch: playStatePatchSchema.optional(),
    pointers: z
      .array(
        z
          .object({
            description: z.string(),
            kind: z.enum(["action", "passive"]),
            label: z.string(),
            scope: z.enum(["combat", "log-rocket"]).optional(),
            specialKey: z.string(),
            unitId: z.string(),
          })
          .strict(),
      )
      .optional(),
    rejection: z
      .object({
        code: z.enum(["conflicting-unit", "detail-actions-unavailable"]),
        message: z.string(),
        retryable: z.boolean(),
      })
      .strict()
      .optional(),
    resetRequired: z.boolean().optional(),
    schemaVersion: z.literal(PLAY_MCP_SCHEMA_VERSION).optional(),
    scope: scopeSchema,
    sessionId: z.string(),
    unavailable: z.array(unavailableChoiceSchema).optional(),
  })
  .strict();

export const actInputSchema = z
  .object({
    actionId: z.string().min(1),
    catalogId: z.string().min(1),
    knownCursor: playCursorSchema,
    sessionId: z.string().min(1),
  })
  .strict();

const actionAdjustmentSchema = z
  .object({
    after: z.union([z.number(), z.string(), z.array(z.string())]).optional(),
    before: z.union([z.number(), z.string(), z.array(z.string())]).optional(),
    code: z.string(),
    fromTileKey: z.string().optional(),
    toTileKey: z.string().optional(),
  })
  .strict();

const actionResolutionSchema = z
  .object({
    adjustments: z.array(actionAdjustmentSchema),
    fromSequence: z.number().int().nonnegative(),
    mode: z.enum(["exact", "rebased", "adjusted", "already-satisfied"]),
    toSequence: z.number().int().nonnegative(),
  })
  .strict();

export const actOutputSchema = z
  .object({
    boardDefinition: playBoardDefinitionSchema.optional(),
    action: z
      .object({
        actionId: z.string(),
        catalogId: z.string(),
        label: z.string(),
        timing: timingSchema,
        type: z.string(),
      })
      .strict(),
    commands: playChangesSchema.shape.commands,
    changes: playChangesSchema,
    consumedSeatAction: z.boolean().optional(),
    currentState: playCompactStateSchema.optional(),
    cursor: playCursorSchema,
    outcome: z
      .object({
        impactTileKey: z.string().nullable(),
        kind: z.literal("no-impact"),
        message: z.string(),
      })
      .strict()
      .optional(),
    patch: playStatePatchSchema.optional(),
    receiptId: z.string(),
    resolution: actionResolutionSchema.optional(),
    rejection: z
      .object({
        category: z.enum([
          "illegal-action",
          "match-over",
          "session",
          "stale-state",
          "validation",
        ]),
        code: z.string(),
        message: z.string(),
        retryable: z.boolean(),
      })
      .strict()
      .optional(),
    resetRequired: z.boolean().optional(),
    schemaVersion: z.literal(PLAY_MCP_SCHEMA_VERSION).optional(),
    sessionId: z.string(),
    roundTimer: roundTimerSchema.optional(),
    status: z.enum(PLAY_MCP_ACT_STATUSES),
    submittedCommands: z.array(
      z
        .object({
          commandId: z.string(),
          sequence: z.number().int().nonnegative(),
          status: z.enum(PLAY_MCP_COMMAND_STATUSES),
          type: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

export const waitUntilActingInputSchema = z
  .object({
    sessionId: z.string().min(1),
    sinceCursor: playCursorSchema.optional(),
    timeoutMs: z.number().int().nonnegative().optional(),
  })
  .strict();

export const waitUntilActingOutputSchema = z
  .object({
    boardDefinition: playBoardDefinitionSchema.optional(),
    changes: playChangesSchema,
    currentState: playCompactStateSchema.optional(),
    cursor: playCursorSchema,
    patch: playStatePatchSchema.optional(),
    resetRequired: z.boolean().optional(),
    roundTimer: roundTimerSchema.optional(),
    schemaVersion: z.literal(PLAY_MCP_SCHEMA_VERSION).optional(),
    sessionId: z.string(),
    status: z.enum(PLAY_MCP_WAIT_STATUSES),
  })
  .strict();

export const closeMatchInputSchema = z
  .object({
    sessionId: z.string().min(1),
  })
  .strict();

export const gameGuideTopics = [
  "overview",
  "rounds",
  "economy",
  "units",
  "combat",
  "development",
] as const;
const gameGuideTopicSchema = z.enum(gameGuideTopics);

export const gameGuideInputSchema = z
  .object({
    topic: gameGuideTopicSchema.optional(),
  })
  .strict();

export const gameGuideOutputSchema = z
  .object({
    schemaVersion: z.literal(PLAY_MCP_SCHEMA_VERSION),
    sections: z.array(
      z
        .object({
          entries: z
            .array(
              z
                .object({
                  facts: z.array(z.string()),
                  key: z.string().optional(),
                  label: z.string(),
                })
                .strict(),
            )
            .optional(),
          heading: z.string(),
          points: z.array(z.string()),
        })
        .strict(),
    ),
    summary: z.string(),
    topic: gameGuideTopicSchema,
  })
  .strict();

export const setCompactionPauseInputSchema = z
  .object({
    paused: z.boolean(),
    sessionId: z.string().min(1),
  })
  .strict();

export const setCompactionPauseOutputSchema = z
  .object({
    compactionPause: z
      .object({
        canPause: z.boolean(),
        nextEligibleRound: z.number().int().positive().nullable(),
        paused: z.boolean(),
        remainingSeconds: z.number().int().nonnegative().nullable(),
      })
      .strict(),
    rejection: z
      .object({
        code: z.enum([
          "authority-busy",
          "cooldown",
          "match-over",
          "unsupported-online",
        ]),
        message: z.string(),
        retryable: z.boolean(),
      })
      .strict()
      .optional(),
    roundTimer: roundTimerSchema,
    schemaVersion: z.literal(PLAY_MCP_SCHEMA_VERSION),
    sessionId: z.string(),
    status: z.enum(["paused", "resumed", "unchanged", "rejected"]),
  })
  .strict();

export const closeMatchOutputSchema = z
  .object({
    closed: z.literal(true),
    schemaVersion: z.literal(PLAY_MCP_SCHEMA_VERSION),
    sessionId: z.string(),
  })
  .strict();

export type PlayCursorV8 = z.infer<typeof playCursorSchema>;
export type PlayEffectV8 = z.infer<typeof playEffectSchema>;
export type PlayCommandEffectsV8 = z.infer<
  typeof playChangesSchema
>["commands"][number];
export type PlayChangesV8 = z.infer<typeof playChangesSchema>;
export type PlayCompactStateV8 = z.infer<typeof playCompactStateSchema>;
export type PlayStatePatchV8 = z.infer<typeof playStatePatchSchema>;
export type PlayActOutputV8 = z.infer<typeof actOutputSchema>;
export type PlayObserveOutputV8 = z.infer<typeof observeOutputSchema>;
export type PlayListActionsOutputV8 = z.infer<typeof listActionsOutputSchema>;
export type PlayWaitOutputV8 = z.infer<typeof waitUntilActingOutputSchema>;
export type PlayStartMatchOutputV8 = z.infer<typeof startMatchOutputSchema>;
export type PlayCloseMatchOutputV8 = z.infer<typeof closeMatchOutputSchema>;
export type PlayActionScopeV8 = z.infer<typeof scopeSchema>;
export type PlayGameGuideOutputV8 = z.infer<typeof gameGuideOutputSchema>;
export type PlaySetCompactionPauseOutputV8 = z.infer<
  typeof setCompactionPauseOutputSchema
>;

export const PLAY_MCP_INSTRUCTIONS = `Beaver Wars play MCP schema v10.
1. Start or join a match and keep its cursor.
2. Request the focused action scope you need; use overview only to choose a category.
3. Execute only issued catalogId/actionId pairs and pass the state you currently hold as knownCursor.
4. Apply the returned patch or reset snapshot, and inspect exact/rebased/adjusted/already-satisfied resolution.
5. Re-list after keeps-seat-open actions; wait after ends-seat actions.
6. Observe for recovery after context loss, partial/unknown settlement, or an explicit snapshot need.
7. Use game_guide only for rules you need, and close_match when finished.`;
