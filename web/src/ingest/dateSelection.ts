import type { ExtractedJobDetails } from "./detailsExtractor";

type ResolveApplyDatesParams = {
  details: Pick<ExtractedJobDetails, "applyBegin" | "applyLastDate">;
  detailPageApplyBegin?: Date;
  detailPageApplyLastDate?: Date;
  sourceOpenDate?: Date | null;
  sourceCloseDate?: Date | null;
};

export function resolveApplyDates(params: ResolveApplyDatesParams) {
  return {
    applyBegin: params.details.applyBegin ?? params.detailPageApplyBegin ?? params.sourceOpenDate ?? undefined,
    applyLastDate: params.details.applyLastDate ?? params.detailPageApplyLastDate ?? params.sourceCloseDate ?? undefined,
  };
}
