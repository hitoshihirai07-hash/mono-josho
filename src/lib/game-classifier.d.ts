export type GameClassification = {
  itemTypeKey: "software" | "hardware" | "accessory" | "download" | "other";
  itemTypeLabel: string;
  gameAttributeKeys: string[];
  gameAttributeLabels: string[];
  gameClassificationConfidence: "high" | "medium" | "low";
};

export const GAME_TYPE_LABELS: Record<string, string>;
export const GAME_ATTRIBUTE_LABELS: Record<string, string>;
export function classifyGameProduct(
  name?: string,
  details?: string,
  context?: { sourceKey?: string }
): GameClassification;
export function getGameFilterKeys(item?: {
  itemTypeKey?: string;
  gameAttributeKeys?: string[];
}): string[];
