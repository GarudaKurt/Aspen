"use client";

import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarCheck,
  Eye,
  Heart,
  MessageCircle,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { AlertDialog, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ServiceFormSheet, type ServiceDraft } from "./service-form-sheet";
import type { UploadStatus } from "./service-photo-picker";
import { ServicePreviewSheet } from "./service-preview-sheet";
import type { ServiceAnalytics, ServiceItem } from "../types";
import { deleteBusinessService, deleteServiceMedia, saveBusinessService, saveServicePhotoOrder, setBusinessServiceStatus } from "@/features/tenancy/api/actions";
import type { BusinessStatus } from "@/features/tenancy/types";
import { cancelPhotoUpload, uploadServicePhoto } from "@/features/business-photos/upload-client";
import { runUploadQueue } from "@/features/business-photos/upload-queue";
import type { MediaAsset } from "@/features/media/types";
import { serviceSaveInput } from "../service-save-input";

type StatusFilter = "All" | ServiceItem["status"];
const emptyAnalytics: ServiceAnalytics = { views: 0, favorites: 0, inquiries: 0, bookings: 0 };

function statusClass(status: ServiceItem["status"]) {
  return status === "Active"
    ? "bg-emerald-50 text-emerald-700"
    : status === "Draft"
      ? "bg-sky-50 text-sky-700"
      : "bg-orange-50 text-orange-700";
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0 text-[#3c6355]" aria-hidden="true" />
      <div className="min-w-0">
        <strong className="block text-sm leading-5">{value}</strong>
        <span className="block truncate text-[10px] uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card className="bg-white p-5 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <strong className="mt-2 block text-3xl">{value}</strong>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#3c6355]">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-6 text-sm text-slate-500">{detail}</p>
    </Card>
  );
}

export function ServicesView({
  initialServices,
  initialAnalytics = {},
  businessId,
  businessStatus,
}: {
  initialServices: ServiceItem[];
  initialAnalytics?: Record<string, ServiceAnalytics>;
  businessId?: string;
  businessStatus?: BusinessStatus;
}) {
  const [items, setItems] = useState(initialServices);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [previewing, setPreviewing] = useState<ServiceItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ServiceItem | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [query, setQuery] = useState("");
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
  const mutationInFlight = useRef(false);
  const deletedPhotoIds = useRef(new Set<string>());
  const saveProgress = useRef<{ serviceId?: string; uploads: Map<string, MediaAsset>; uploadIds: Map<string, string> }>({ uploads: new Map(), uploadIds: new Map() });

  const setUploadStatus = (preview: string, status: UploadStatus) => {
    setUploadStatuses((current) => ({ ...current, [preview]: status }));
  };

  const runMutation = async (operation: () => Promise<void>, propagateError = false) => {
    if (mutationInFlight.current) {
      if (propagateError) throw new Error("Please wait for the current service change to finish, then try again.");
      return;
    }
    mutationInFlight.current = true;
    setBusy(true);
    setSaveError("");
    try {
      await operation();
    } catch (error) {
      if (propagateError) throw error;
      setSaveError("The service change could not be completed. Please try again.");
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  };

  const cancelPendingPhoto = async (preview: string) => {
    const uploadId = saveProgress.current.uploadIds.get(preview);
    if (!uploadId || saveProgress.current.uploads.has(preview)) return;
    try {
      await cancelPhotoUpload(uploadId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not cancel this upload. Please try again.";
      setUploadStatus(preview, { status: "error", progress: 0, error: message });
      throw error;
    }
    saveProgress.current.uploadIds.delete(preview);
    setUploadStatuses((current) => {
      const next = { ...current };
      delete next[preview];
      return next;
    });
  };

  const closeForm = () => runMutation(async () => {
    const pending = [...saveProgress.current.uploadIds.keys()]
      .filter((preview) => !saveProgress.current.uploads.has(preview));
    const results = await runUploadQueue(pending, cancelPendingPhoto, 2);
    const errors = results.flatMap((result) => result.status === "rejected"
      ? [result.reason instanceof Error ? result.reason.message : "Could not cancel an upload."]
      : []);
    if (errors.length) {
      setSaveError(`Could not close the form because an upload could not be canceled. ${errors.join(" ")} Please try closing again.`);
      return;
    }
    setFormOpen(false);
  });

  const counts = useMemo(
    () => ({
      All: items.length,
      Active: items.filter((service) => service.status === "Active").length,
      Draft: items.filter((service) => service.status === "Draft").length,
      Paused: items.filter((service) => service.status === "Paused").length,
    }),
    [items],
  );

  const totals = useMemo(
    () =>
      items.reduce(
        (result, service) => {
          const metrics = analytics[service.id] ?? emptyAnalytics;
          return {
            views: result.views + metrics.views,
            favorites: result.favorites + metrics.favorites,
            inquiries: result.inquiries + metrics.inquiries,
            bookings: result.bookings + metrics.bookings,
          };
        },
        { ...emptyAnalytics },
      ),
    [analytics, items],
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((service) => {
      const matchesFilter = filter === "All" || service.status === filter;
      const matchesQuery =
        !normalizedQuery ||
        [service.title, service.category, service.description].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      return matchesFilter && matchesQuery;
    });
  }, [filter, items, query]);

  const openCreate = () => {
    deletedPhotoIds.current.clear();
    saveProgress.current = { uploads: new Map(), uploadIds: new Map() };
    setUploadStatuses({});
    setSaveError("");
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (service: ServiceItem) => {
    deletedPhotoIds.current.clear();
    saveProgress.current = { serviceId: service.id, uploads: new Map(), uploadIds: new Map() };
    setUploadStatuses({});
    setSaveError("");
    setEditing(service);
    setFormOpen(true);
  };

  const save = async (draft: ServiceDraft, retryPreview?: string) => {
    if (!businessId) return;
    setSaveError("");
    let result;
    try {
      result = await saveBusinessService(businessId, serviceSaveInput(draft, editing?.id ?? saveProgress.current.serviceId));
    } catch {
      setSaveError("Could not save the service details. Check your connection and sign-in session, then try again. Photo uploads have not started.");
      return;
    }
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    // A retry after a partial upload must update this service, not create another.
    saveProgress.current.serviceId = result.id;
    const serviceId = result.id;
    const { photoFiles = [], photoFilePreviews = [], ...details } = draft;
    // Keep the original index: completion order must not change preview/asset mapping.
    const uploads = photoFiles.map((file, index) => ({ file, index, preview: photoFilePreviews[index] }));
    const assets: (MediaAsset | undefined)[] = uploads.map(({ preview }) => saveProgress.current.uploads.get(preview));
    const pending = uploads.filter(({ preview, index }) => !assets[index] && (!retryPreview || preview === retryPreview));
    pending.forEach(({ preview }) => setUploadStatus(preview, { status: "queued", progress: 0 }));
    const results = await runUploadQueue(pending, async ({ file, index, preview }) => {
      setUploadStatus(preview, { status: "uploading", progress: 0 });
      try {
        let uploadId = saveProgress.current.uploadIds.get(preview);
        if (!uploadId) {
          uploadId = crypto.randomUUID();
          saveProgress.current.uploadIds.set(preview, uploadId);
        }
        const asset = await uploadServicePhoto(file, serviceId, (progress) => {
          setUploadStatus(preview, { status: "uploading", progress });
        }, uploadId);
        assets[index] = asset;
        saveProgress.current.uploads.set(preview, asset);
        setUploadStatus(preview, { status: "uploaded", progress: 100 });
      } catch (error) {
        setUploadStatus(preview, { status: "error", progress: 0, error: error instanceof Error ? error.message : "Could not upload this photo. Please retry." });
        throw error;
      }
    }, 2);
    const errors = results.flatMap((result, index) => result.status === "rejected"
      ? [`${pending[index].file.name}: ${result.reason instanceof Error ? result.reason.message : "Upload failed."}`]
      : []);
    const uploadedAssetIds = assets.flatMap((asset) => asset ? [asset.id] : []);
    const uploadedByPreview = new Map(photoFilePreviews.map((preview, index) => [preview, assets[index]]));
    const orderedAssetIds = draft.photos
      .map((photo, index) => uploadedByPreview.get(photo)?.id ?? draft.photoAssetIds?.[index])
      .filter((id): id is string => Boolean(id));
    const persistPhotoOrder = async (assetIds: string[]) => {
      try {
        const orderResult = await saveServicePhotoOrder(serviceId, assetIds);
        return orderResult.ok ? "" : orderResult.error;
      } catch {
        return "Photos were saved, but their order could not be saved. Save service again to retry.";
      }
    };

    // Reflect what has actually persisted even if the user closes after a partial failure.
    // Removed photos stay visible in the listing until deletion has succeeded.
    const updateSavedItem = (includeRemoved: boolean) => {
      const photos: string[] = [];
      const photoAssetIds: (string | null)[] = [];
      const append = (url: string, assetId: string | null) => {
        if (assetId && deletedPhotoIds.current.has(assetId)) return;
        if (assetId ? photoAssetIds.includes(assetId) : photos.includes(url)) return;
        photos.push(url);
        photoAssetIds.push(assetId);
      };
      draft.photos.forEach((photo, index) => {
        const asset = uploadedByPreview.get(photo);
        if (asset) append(asset.url ?? "", asset.id);
        else if (!photoFilePreviews.includes(photo)) append(photo, draft.photoAssetIds?.[index] ?? null);
      });
      if (includeRemoved) {
        editing?.photos.forEach((photo, index) => append(photo, editing.photoAssetIds?.[index] ?? null));
        saveProgress.current.uploads.forEach((asset) => append(asset.url ?? "", asset.id));
      }
      const saved: ServiceItem = { ...details, id: serviceId, photos, photoAssetIds };
      setItems((current) => current.some((service) => service.id === serviceId)
        ? current.map((service) => service.id === serviceId ? saved : service)
        : [...current, saved]);
      setAnalytics((current) => ({ ...current, [serviceId]: current[serviceId] ?? emptyAnalytics }));
      return photoAssetIds.filter((id): id is string => Boolean(id));
    };
    const persistedAssetIds = updateSavedItem(true);
    const remaining = assets.filter((asset) => !asset).length;
    if (remaining) {
      // Keep every persisted asset, including removals deferred until uploads finish.
      // A replacement batch can temporarily exceed the six-photo order limit.
      const orderError = persistedAssetIds.length <= 6 ? await persistPhotoOrder(persistedAssetIds) : "";
      setSaveError(`Service details and successful photos were saved. ${remaining} photo(s) still need uploading. ${errors.join(" ")} Retry an individual photo or Save service again to upload the remaining photos.${orderError ? ` ${orderError}` : ""}`);
      return;
    }
    const previousAssetIds = [...(editing?.photoAssetIds ?? []).filter((id): id is string => Boolean(id)), ...Array.from(saveProgress.current.uploads.values(), (asset) => asset.id)];
    const retainedAssetIds = new Set([...(draft.photoAssetIds ?? []).filter((id): id is string => Boolean(id)), ...uploadedAssetIds]);
    const removedAssetIds = previousAssetIds.filter((id) => !retainedAssetIds.has(id) && !deletedPhotoIds.current.has(id));
    const mediaResult = await deleteServiceMedia(result.id, removedAssetIds);
    if (!mediaResult.ok) {
      setSaveError(mediaResult.error);
      return;
    }
    removedAssetIds.forEach((id) => deletedPhotoIds.current.add(id));
    updateSavedItem(false);
    const orderError = await persistPhotoOrder(orderedAssetIds);
    if (orderError) {
      setSaveError(orderError);
      return;
    }
    setFormOpen(false);
  };

  const remove = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    if (!businessId) return;
    const result = await deleteBusinessService(businessId, id);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setItems((current) => current.filter((service) => service.id !== id));
    setAnalytics((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPendingDelete(null);
  };

  const toggle = async (service: ServiceItem) => {
    if (!businessId) return;
    const status = service.status === "Active" ? "Paused" : "Active";
    const result = await setBusinessServiceStatus({ businessId, serviceId: service.id, status });
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setItems((current) => current.map((item) => item.id === service.id ? { ...item, status } : item));
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3c6355]">
            Service management
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Your listings</h1>
          <p className="mt-2 text-slate-500">
            Create and manage services owned only by this provider account.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          disabled={busy || !businessId}
          className="bg-[#3c6355] text-white hover:bg-[#2f5044]"
        >
          <Plus className="mr-2 size-4" />
          Add new listing
        </Button>
      </div>

      {businessId && businessStatus !== "published" && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your business is not public yet (status: {businessStatus ?? "unavailable"}). You can prepare draft services, but an administrator must approve and publish the business before customers can find it. Publishing a service does not approve the business.
        </p>
      )}

      {saveError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={BarChart3} label="Total listings" value={counts.All} detail={`${counts.Active} currently active`} />
        <SummaryCard icon={Eye} label="Total views" value={totals.views} detail="Across your listings" />
        <SummaryCard icon={MessageCircle} label="Inquiries" value={totals.inquiries} detail="Account-owned inquiries" />
        <SummaryCard icon={CalendarCheck} label="Bookings" value={totals.bookings} detail="Across your listings" />
      </div>

      <Card className="overflow-hidden bg-white p-0 shadow-none">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1">
            {(["All", "Active", "Draft", "Paused"] as StatusFilter[]).map((item) => (
              <Button
                key={item}
                type="button"
                variant="ghost"
                onClick={() => setFilter(item)}
                className={`h-9 rounded-lg px-3 text-sm ${filter === item ? "bg-white text-[#3c6355] shadow-sm" : "text-slate-500 hover:bg-white/70"}`}
              >
                {item}
                <span className="ml-1 text-xs">{counts[item]}</span>
              </Button>
            ))}
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <span className="sr-only">Search listings</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search listings"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#3c6355] focus:ring-2 focus:ring-[#3c6355]/20"
            />
          </label>
        </div>

        <div className="divide-y divide-slate-200">
          {visibleItems.length ? (
            visibleItems.map((service) => {
              const metrics = analytics[service.id] ?? emptyAnalytics;
              return (
                <article key={service.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(250px,.8fr)_auto] lg:items-center">
                  <div className="flex min-w-0 gap-4">
                    <div className="size-28 shrink-0 overflow-hidden rounded-xl bg-[#eef5f1]">
                      {service.photos?.[0] ? (
                        <img src={service.photos[0]} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center text-3xl font-bold text-[#3c6355]">
                          {service.title.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(service.status)}`}>
                        {service.status}
                      </span>
                      <p className="mt-2 text-sm text-[#3c6355]">{service.category}</p>
                      <h2 className="truncate text-xl font-bold">{service.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{service.description}</p>
                      <p className="mt-3 font-bold text-[#3c6355]">{service.price}<span className="ml-2 text-sm font-normal text-slate-400">{service.duration}</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl bg-emerald-50/60 p-4 sm:grid-cols-4 lg:grid-cols-2">
                    <Metric icon={Eye} label="Views" value={metrics.views} />
                    <Metric icon={Heart} label="Favorites" value={metrics.favorites} />
                    <Metric icon={MessageCircle} label="Inquiries" value={metrics.inquiries} />
                    <Metric icon={CalendarCheck} label="Bookings" value={metrics.bookings} />
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col">
                    <Button type="button" variant="outline" onClick={() => setPreviewing(service)} className="flex-1 lg:flex-none">
                      <Eye className="mr-2 size-4" />Preview
                    </Button>
                    <Button type="button" disabled={busy} onClick={() => openEdit(service)} className="flex-1 bg-[#3c6355] text-white hover:bg-[#2f5044] lg:flex-none">
                      <Pencil className="mr-2 size-4" />Edit
                    </Button>
                    <Button type="button" variant="outline" disabled={busy || !businessId || (service.status !== "Active" && businessStatus !== "published")} onClick={() => void runMutation(() => toggle(service))} className="flex-1 lg:flex-none">
                      <Power className="mr-2 size-4" />{service.status === "Active" ? "Pause" : "Publish"}
                    </Button>
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => setPendingDelete(service)} className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 lg:flex-none">
                      <Trash2 className="mr-2 size-4" />Delete
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="p-10 text-center">
              <h2 className="font-semibold">{items.length ? "No matching listings" : "No services yet"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {items.length ? "Try another search or filter." : "Add your first service so customers know what you offer."}
              </p>
              {!items.length && (
                <Button type="button" disabled={busy || !businessId} onClick={openCreate} className="mt-4 bg-[#3c6355] text-white hover:bg-[#2f5044]">
                  Add service
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <ServiceFormSheet open={formOpen} service={editing} busy={busy} saveError={saveError} uploadStatuses={uploadStatuses} onClose={closeForm} onBeforeRemovePhoto={(preview) => runMutation(() => cancelPendingPhoto(preview), true)} onSave={(draft, retryPreview) => runMutation(() => save(draft, retryPreview))} />
      <ServicePreviewSheet service={previewing} onClose={() => setPreviewing(null)} />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !busy) setPendingDelete(null); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete service?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{pendingDelete?.title}</strong> from your listings. Customers will no longer see it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => void runMutation(remove)}>Delete service</Button>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  );
}
