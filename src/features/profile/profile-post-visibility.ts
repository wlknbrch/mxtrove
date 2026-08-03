import type { Visibility } from "@/types/domain";

export function isListedOnProfile(visibility: Visibility) {
  return visibility === "public" || visibility === "followers";
}
