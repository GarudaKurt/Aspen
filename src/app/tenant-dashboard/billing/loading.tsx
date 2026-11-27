import {
  LoadingRegion,
  SkeletonHeading,
  SkeletonLines,
} from "@/components/loading/skeletons";
export default function LoadingBilling() {
  return (
    <LoadingRegion label="Loading billing">
      <SkeletonHeading />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-6 rounded-xl border p-5">
          <SkeletonLines rows={3} />
        </div>
      ))}
    </LoadingRegion>
  );
}
