import type { ProtectedMediaAsset } from "@/types/domain";

export async function resolveAvailableProtectedReadUrls(
  assets: ProtectedMediaAsset[],
  createReadUrl: (assetId: string) => Promise<string>,
) {
  const results = await Promise.allSettled(
    assets.map(async (asset) => ({
      assetId: asset.id,
      readUrl: await createReadUrl(asset.id),
    })),
  );

  return new Map(
    results.flatMap((result) => (
      result.status === "fulfilled"
        ? [[result.value.assetId, result.value.readUrl] as const]
        : []
    )),
  );
}
