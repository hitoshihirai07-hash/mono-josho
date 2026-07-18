export type CardGameClassification = {
  cardFranchiseKey: string;
  cardFranchiseLabel: string;
  cardProductTypeKey: string;
  cardProductTypeLabel: string;
  cardAttributeKeys: string[];
  cardAttributeLabels: string[];
};

export const cardGameFranchiseDefinitions: ReadonlyArray<{
  key: string;
  label: string;
  pageLabel?: string;
  slug?: string;
}>;

export function classifyCardGameProduct(
  name?: string,
  caption?: string
): CardGameClassification;

export function getCardGameFilterKeys(item?: Record<string, unknown>): string[];
