import { CurrentPlanCard } from "@/features/billing/components/current-plan-card";
import {
  getLatestPayment,
  getSubscription,
} from "@/features/billing/api/queries";
import { DashboardOverview } from "@/features/tenant-dashboard/components/dashboard-overview";
import {
  getDashboardBusiness,
  getDashboardOverview,
} from "@/features/tenant-dashboard/overview-data";

export default async function TenantDashboardPage() {
  const { data: business, error } = await getDashboardBusiness();
  if (!business) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {error ? (
          <p role="alert">
            Your business could not be loaded. Refresh to try again.
          </p>
        ) : (
          <p>
            No business is connected to this account yet. Your appointments and
            messages will appear here once it is connected.
          </p>
        )}
      </section>
    );
  }
  const [overview, subscription, payment] = await Promise.all([
    getDashboardOverview(business.id),
    getSubscription(business.id),
    getLatestPayment(business.id),
  ]);
  const needsCover =
    !business.cover_photo_path &&
    ["pending", "published"].includes(business.status);
  return (
    <div className="space-y-6">
      <DashboardOverview
        name={business.name}
        needsCover={needsCover}
        overview={overview}
      />
      <CurrentPlanCard
        overview
        payment={payment.data}
        paymentFailed={Boolean(payment.error)}
        subscription={subscription.data}
        failed={Boolean(subscription.error)}
      />
    </div>
  );
}
