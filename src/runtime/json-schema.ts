import * as z from "zod/v4";
import type { PageBoundToolName } from "../contract/tool-definitions";

export function toWebMcpJsonSchema(
  schema: z.ZodType,
  toolName?: PageBoundToolName,
): object {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-07" });
  const { $schema: dialect, ...portable } = jsonSchema;
  void dialect;
  if (toolName === "list_actions") {
    portable.allOf = [
      conditionalRequirement("movementQuery", "movement", {
        forbidden: "pageToken",
      }),
      conditionalRequirement("combatQuery", "combat"),
      conditionalRequirement("detailActionIds", "log-rocket", {
        forbidden: "pageToken",
        required: "catalogId",
      }),
      {
        if: { required: ["catalogId"] },
        then: { required: ["detailActionIds"] },
      },
      {
        properties: {
          movementQuery: {
            if: { required: ["maxResults"] },
            then: {
              anyOf: [
                { required: ["towardTileKey"] },
                { required: ["resource"] },
                {
                  properties: { requireOwnedLodgeRange: { const: true } },
                  required: ["requireOwnedLodgeRange"],
                },
              ],
            },
          },
        },
      },
      {
        properties: {
          combatQuery: {
            allOf: [
              { not: { required: ["buildingId", "unitId"] } },
              {
                if: { required: ["unitId"] },
                then: { properties: { targetKind: { enum: ["unit"] } } },
              },
              {
                if: { required: ["buildingId"] },
                then: { properties: { targetKind: { enum: ["building"] } } },
              },
            ],
          },
        },
      },
    ];
  }
  return portable;
}

function conditionalRequirement(
  property: string,
  scope: string,
  options: { forbidden?: string; required?: string } = {},
): Record<string, unknown> {
  return {
    if: { required: [property] },
    then: {
      ...(options.forbidden ? { not: { required: [options.forbidden] } } : {}),
      properties: { scope: { const: scope } },
      required: ["scope", ...(options.required ? [options.required] : [])],
    },
  };
}
