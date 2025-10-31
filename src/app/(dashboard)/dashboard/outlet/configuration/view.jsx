'use client';

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

const PRICE_BADGES = {
  LOW: "$",
  MEDIUM: "$$",
  HIGH: "$$$",
  PREMIUM: "$$$$",
};

const STATUS_LABELS = {
  ACTIVE: "Active",
  DRAFT: "Inactive",
};

export default function OutletConfigurationView({ outlet }) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState(outlet.status);
  const [isPending, startTransition] = useTransition();
  const [showActivateModal, setShowActivateModal] = useState(false);

  const isActive = status === "ACTIVE";
  const statusLabel = STATUS_LABELS[status] ?? status;

  const priceDisplay = PRICE_BADGES[outlet.priceTier] ?? outlet.priceTier;

  const coordinateBadges = useMemo(() => {
    if (!outlet.lng && !outlet.lat) return null;
    return (
      <div className="flex flex-wrap gap-2">
        <BadgeField value={outlet.lng ?? "-"} />
        <BadgeField value={outlet.lat ?? "-"} />
      </div>
    );
  }, [outlet.lat, outlet.lng]);

  const operationalContent = useMemo(() => {
    if (!outlet.openingHour) return "-";
    return (
      <div className="flex flex-wrap gap-2">
        <BadgeField value={outlet.openingHour.open} />
        <BadgeField value={outlet.openingHour.close} />
      </div>
    );
  }, [outlet.openingHour]);

  const handleNavigate = (path) => {
    router.push(path);
  };

  const updateStatus = (nextStatus, { successTitle, successDescription, closeModal = false }) => {
    const previous = status;
    setStatus(nextStatus);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/outlets/${encodeURIComponent(outlet.id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? "Terjadi kesalahan saat memperbarui status.");
        }

        if (successTitle || successDescription) {
          toast({
            title: successTitle,
            description: successDescription,
          });
        }
        if (closeModal) {
          setShowActivateModal(false);
        }
      } catch (error) {
        console.error("[OutletConfiguration] status update failed", error);
        setStatus(previous);
        toast({
          title: "Gagal mengubah status outlet",
          description: error.message ?? "Terjadi kesalahan saat memperbarui status.",
          variant: "destructive",
        });
      }
    });
  };

  const handleSwitchChange = (checked) => {
    if (checked) {
      setShowActivateModal(true);
      return;
    }

    updateStatus("DRAFT", {
      successTitle: "Outlet kembali ke status draft",
      successDescription: "Outlet ini tidak lagi terlihat oleh publik.",
      closeModal: false,
    });
  };

  const handlePublish = () => {
    updateStatus("ACTIVE", {
      successTitle: "Outlet berhasil diaktifkan",
      successDescription: "Outlet ini sekarang terlihat di publik.",
      closeModal: true,
    });
  };

  return (
    <>
      <section className="space-y-6">
        <header className="flex flex-wrap items-center gap-3">
          <a
            href="/dashboard/outlet"
            className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
          >
            ← Outlet List
          </a>
          <div className="text-sm text-slate-500">
            <span className="font-medium text-slate-600">Outlet List</span> / Outlet Configuration
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
            <div className="grid gap-6 md:grid-cols-[1.5fr_2fr] md:items-start">
              <div className="overflow-hidden rounded-2xl bg-slate-100">
                <div className="aspect-[4/3] w-full">
                  {outlet.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={outlet.bannerUrl}
                      alt={`${outlet.name} banner`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">
                      🖼️
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-100 shadow-inner">
                      {outlet.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={outlet.logoUrl}
                          alt={outlet.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-semibold text-slate-500">
                          {outlet.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{outlet.name}</h2>
                      <p className="text-sm text-slate-500">{outlet.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isActive}
                      disabled={isPending}
                      onCheckedChange={handleSwitchChange}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        isActive ? "text-emerald-600" : "text-slate-500"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <DetailItem label="Phone Number" value={outlet.phone ?? "-"} />
                    <DetailItem label="Coordinates">{coordinateBadges ?? "-"}</DetailItem>
                    <DetailItem label="City" value={outlet.city ?? "-"} />
                    <DetailItem label="Price Tier">
                      <BadgeField value={priceDisplay} />
                    </DetailItem>
                  </div>
                  <div className="space-y-4">
                    <DetailItem label="Address" value={outlet.address ?? "-"} />
                    <DetailItem label="Operational Hour">{operationalContent}</DetailItem>
                    <DetailItem
                      label="Province / Country"
                      value={[outlet.province, outlet.country].filter(Boolean).join(", ") || "-"}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                variant="default"
                className="px-6 py-2.5"
                onClick={() =>
                  handleNavigate(`/dashboard/outlet/edit?id=${encodeURIComponent(outlet.id)}`)
                }
                disabled={isPending}
              >
                Informasi Umum
              </Button>
              <Button
                variant="outline"
                className="px-6 py-2.5"
                onClick={() =>
                  handleNavigate(`/dashboard/outlet/facility?id=${encodeURIComponent(outlet.id)}`)
                }
                disabled={isPending}
              >
                Fasilitas
              </Button>
            </div>
          </div>
        </section>
      </section>

      <Dialog open={showActivateModal} onOpenChange={setShowActivateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate this outlet?</DialogTitle>
            <DialogDescription>
              You’re about to publish this outlet and make it visible to the public. Do you want to
              continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateModal(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPending}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailItem({ label, value, children }) {
  const content =
    children ??
    (value === null || value === undefined || value === ""
      ? "-"
      : typeof value === "string" || typeof value === "number"
        ? value
        : value);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-base font-medium text-slate-700">{content}</div>
    </div>
  );
}

function BadgeField({ value }) {
  const display =
    value === null || value === undefined || value === ""
      ? "-"
      : typeof value === "string" || typeof value === "number"
        ? value
        : String(value);
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
      {display}
    </span>
  );
}
