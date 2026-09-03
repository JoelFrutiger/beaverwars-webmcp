import type { PlayCompactStateV8, PlayStatePatchV8 } from "./schemas";

export function createPlayStatePatch(
  before: PlayCompactStateV8,
  after: PlayCompactStateV8,
): PlayStatePatchV8 {
  const board = compact({
    ...(before.board.boardDefinitionId !== after.board.boardDefinitionId
      ? { boardDefinitionId: after.board.boardDefinitionId }
      : {}),
    buildings: diffRecords(
      before.board.buildings,
      after.board.buildings,
      (value) => value.id,
    ),
    edgeBlockers: diffRecords(
      before.board.edgeBlockers,
      after.board.edgeBlockers,
      (value) => `${value.tileKey}:${value.sideIndex}`,
    ),
    hazards: diffRecords(
      before.board.hazards,
      after.board.hazards,
      (value) => `${value.kind}:${value.tileKey}`,
    ),
    ...(!equal(before.board.lodgeRanges, after.board.lodgeRanges)
      ? { lodgeRanges: after.board.lodgeRanges }
      : {}),
    pickups: diffRecords(
      before.board.pickups,
      after.board.pickups,
      (value) => value.id,
    ),
    units: diffRecords(
      before.board.units,
      after.board.units,
      (value) => value.id,
    ),
  });
  const match = changedFields(before.match, after.match);
  const players = diffRecords(before.players, after.players, (value) =>
    String(value.seatId),
  );
  let seat = changedFields(before.seat, after.seat) as
    PlayStatePatchV8["seat"] | undefined;
  if (
    before.seat.timeoutHarvest !== undefined &&
    after.seat.timeoutHarvest === undefined
  ) {
    (seat ??= {}).timeoutHarvest = null;
  }
  return {
    ...(board ? { board } : {}),
    ...(before.inviteCode !== after.inviteCode
      ? { inviteCode: after.inviteCode ?? null }
      : {}),
    ...(!equal(before.lobbySeats, after.lobbySeats)
      ? { lobbySeats: after.lobbySeats ?? null }
      : {}),
    ...(match ? { match } : {}),
    ...(players
      ? {
          players: {
            ...(players.order ? { order: players.order.map(Number) } : {}),
            ...(players.remove ? { remove: players.remove.map(Number) } : {}),
            ...(players.upsert ? { upsert: players.upsert } : {}),
          },
        }
      : {}),
    ...(seat ? { seat } : {}),
  };
}

export function applyPlayStatePatch(
  state: PlayCompactStateV8,
  patch: PlayStatePatchV8,
): PlayCompactStateV8 {
  const next = structuredClone(state);
  if (patch.board) {
    if (patch.board.boardDefinitionId !== undefined)
      next.board.boardDefinitionId = patch.board.boardDefinitionId;
    if (patch.board.buildings)
      next.board.buildings = applyRecords(
        next.board.buildings,
        patch.board.buildings,
        (value) => value.id,
      );
    if (patch.board.edgeBlockers)
      next.board.edgeBlockers = applyRecords(
        next.board.edgeBlockers,
        patch.board.edgeBlockers,
        (value) => `${value.tileKey}:${value.sideIndex}`,
      );
    if (patch.board.hazards)
      next.board.hazards = applyRecords(
        next.board.hazards,
        patch.board.hazards,
        (value) => `${value.kind}:${value.tileKey}`,
      );
    if (patch.board.lodgeRanges)
      next.board.lodgeRanges = patch.board.lodgeRanges;
    if (patch.board.pickups)
      next.board.pickups = applyRecords(
        next.board.pickups,
        patch.board.pickups,
        (value) => value.id,
      );
    if (patch.board.units)
      next.board.units = applyRecords(
        next.board.units,
        patch.board.units,
        (value) => value.id,
      );
  }
  if (patch.inviteCode === null) delete next.inviteCode;
  else if (patch.inviteCode !== undefined) next.inviteCode = patch.inviteCode;
  if (patch.lobbySeats === null) delete next.lobbySeats;
  else if (patch.lobbySeats !== undefined) next.lobbySeats = patch.lobbySeats;
  if (patch.match) Object.assign(next.match, patch.match);
  if (patch.players)
    next.players = applyRecords(
      next.players,
      patch.players,
      (value) => String(value.seatId),
      String,
    );
  if (patch.seat) {
    const { timeoutHarvest, ...fields } = patch.seat;
    Object.assign(next.seat, fields);
    if (timeoutHarvest === null) delete next.seat.timeoutHarvest;
    else if (timeoutHarvest !== undefined)
      next.seat.timeoutHarvest = timeoutHarvest;
  }
  return next;
}

function diffRecords<T>(before: T[], after: T[], key: (value: T) => string) {
  const old = new Map(before.map((value) => [key(value), value]));
  const current = new Map(after.map((value) => [key(value), value]));
  const remove = [...old.keys()].filter((id) => !current.has(id));
  const upsert = after.filter((value) => !equal(old.get(key(value)), value));
  const beforeOrder = before.map(key);
  const afterOrder = after.map(key);
  const membershipChanged = remove.length > 0 || before.length !== after.length;
  const orderChanged = !equal(beforeOrder, afterOrder);
  return remove.length || upsert.length || orderChanged
    ? {
        ...(orderChanged || membershipChanged ? { order: afterOrder } : {}),
        ...(remove.length ? { remove } : {}),
        ...(upsert.length ? { upsert } : {}),
      }
    : undefined;
}

function applyRecords<T, R extends string | number = string>(
  before: T[],
  patch: { order?: R[]; remove?: R[]; upsert?: T[] },
  key: (value: T) => string,
  removeKey: (value: R) => string = String,
): T[] {
  const records = new Map(before.map((value) => [key(value), value]));
  for (const id of patch.remove ?? []) records.delete(removeKey(id));
  for (const value of patch.upsert ?? []) records.set(key(value), value);
  const order = patch.order
    ? [...patch.order]
    : before
        .map((value) => key(value) as R)
        .filter((id) => records.has(removeKey(id)));
  for (const id of records.keys())
    if (!order.some((ordered) => removeKey(ordered) === id))
      order.push(id as R);
  return order
    .map((id) => records.get(removeKey(id)))
    .filter((value): value is T => value !== undefined);
}

function changedFields<T extends object>(
  before: T,
  after: T,
): Partial<T> | undefined {
  const changed = Object.fromEntries(
    Object.entries(after).filter(
      ([key, value]) => !equal(before[key as keyof T], value),
    ),
  ) as Partial<T>;
  return Object.keys(changed).length ? changed : undefined;
}

function compact<T extends object>(value: T): T | undefined {
  const result = Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as T;
  return Object.keys(result).length ? result : undefined;
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
