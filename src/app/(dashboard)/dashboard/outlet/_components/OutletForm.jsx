"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EasyCrop from "react-easy-crop";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";

const LOGO_RULES = {
  maxSize: 1 * 1024 * 1024, // 1 MB
  minDimension: 400,
};

const BANNER_RULES = {
  maxSize: 3 * 1024 * 1024, // 3 MB
  minWidth: 1200,
};

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const PRICE_LABELS = [
  { value: "LOW", label: "$" },
  { value: "MEDIUM", label: "$$" },
  { value: "HIGH", label: "$$$" },
  { value: "PREMIUM", label: "$$$$" },
];

const BANNER_ASPECT_RATIO = 3 / 2;

const toSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function createImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.setAttribute("crossOrigin", "anonymous");
    image.src = src;
  });
}

async function getCroppedImage(imageSrc, cropPixels, mimeType) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context tidak tersedia.");

  const { width, height, x, y } = cropPixels;
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    image,
    x,
    y,
    width,
    height,
    0,
    0,
    width,
    height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Tidak dapat memproses hasil crop."));
          return;
        }
        resolve({
          blob,
          width,
          height,
        });
      },
      mimeType,
      0.92,
    );
  });
}

async function uploadWithSignedUrl(file, kind) {
  const signResponse = await fetch("/api/v1/uploads/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind,
      contentType: file.type,
      contentLength: file.size,
      originalName: file.name,
    }),
  });

  if (!signResponse.ok) {
    const payload = await signResponse.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Gagal menyiapkan unggahan.");
  }

  const payload = await signResponse.json();
  const { uploadUrl, publicUrl } = payload.data;

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Unggah file gagal. Coba lagi.");
  }

  return publicUrl;
}

export default function OutletForm({ mode = "create", initialData = null }) {
  const isEditMode = mode === "edit";
  const outletId = initialData?.id ?? null;
  const router = useRouter();
  const { toast } = useToast();
  const [cityOptions, setCityOptions] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [logo, setLogo] = useState(() => {
    if (isEditMode && initialData?.logoUrl) {
      return {
        file: null,
        previewUrl: initialData.logoUrl,
        uploadedUrl: initialData.logoUrl,
      };
    }
    return null;
  });
  const [banner, setBanner] = useState(() => {
    if (isEditMode && initialData?.bannerUrl) {
      return {
        file: null,
        previewUrl: initialData.bannerUrl,
        uploadedUrl: initialData.bannerUrl,
      };
    }
    return null;
  });
  const [cropState, setCropState] = useState(null);
  const [cropError, setCropError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isSlugDirty, setIsSlugDirty] = useState(isEditMode);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOutletId, setCreatedOutletId] = useState(null);

  const [form, setForm] = useState(() => ({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    phone: initialData?.phone ?? "",
    address: initialData?.address ?? "",
    lat:
      initialData?.lat !== null && initialData?.lat !== undefined
        ? String(initialData.lat)
        : "",
    lng:
      initialData?.lng !== null && initialData?.lng !== undefined
        ? String(initialData.lng)
        : "",
    cityId: initialData?.cityId ?? "",
    priceTier: initialData?.priceTier ?? "MEDIUM",
    openHour: initialData?.openingHour?.open ?? "08:00",
    closeHour: initialData?.openingHour?.close ?? "22:00",
  }));

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function fetchCities() {
      setLoadingCities(true);
      try {
        const response = await fetch("/api/v1/areas?pageSize=100", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Gagal memuat data kota.");
        }
        const payload = await response.json();
        if (ignore) return;
        setCityOptions(payload.data.items);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[AddOutlet] city fetch error", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCities(false);
        }
      }
    }

    fetchCities();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (logo?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logo.previewUrl);
      }
      if (banner?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(banner.previewUrl);
      }
    };
  }, [logo, banner]);

  const isSubmitDisabled = useMemo(() => {
    const hasLogo = Boolean(logo && (logo.file || logo.uploadedUrl));
    const hasBanner = Boolean(banner && (banner.file || banner.uploadedUrl));
    return (
      !form.name.trim() ||
      !form.slug.trim() ||
      !form.cityId ||
      !hasLogo ||
      !hasBanner ||
      !form.openHour ||
      !form.closeHour ||
      isSubmitting
    );
  }, [form, logo, banner, isSubmitting]);

  const handleNameChange = (event) => {
    const value = event.target.value;
    setForm((prev) => {
      const autoSlug = isSlugDirty ? prev.slug : toSlug(value);
      return {
        ...prev,
        name: value,
        slug: isSlugDirty ? prev.slug : autoSlug,
      };
    });
    setFormErrors((prev) => ({
      ...prev,
      name: "",
      slug: "",
    }));
  };

  const handleSlugFocus = () => {
    setIsSlugDirty(true);
  };

  const handleSlugChange = (event) => {
    setIsSlugDirty(true);
    const value = toSlug(event.target.value);
    setForm((prev) => ({
      ...prev,
      slug: value,
    }));
    setFormErrors((prev) => ({
      ...prev,
      slug: "",
    }));
  };

  const handlePhoneChange = (event) => {
    const raw = event.target.value;
    const digits = raw.replace(/\D/g, "");
    const formatted = digits.length > 0 ? `+${digits}` : "";
    setForm((prev) => ({
      ...prev,
      phone: formatted,
    }));
    setFormErrors((prev) => ({
      ...prev,
      phone: "",
    }));
  };

  const handleLatChange = (event) => {
    const { value } = event.target;
    setForm((prev) => ({
      ...prev,
      lat: value,
    }));
    setFormErrors((prev) => ({
      ...prev,
      lat: "",
    }));
  };

  const handleLngChange = (event) => {
    const { value } = event.target;
    setForm((prev) => ({
      ...prev,
      lng: value,
    }));
    setFormErrors((prev) => ({
      ...prev,
      lng: "",
    }));
  };

  const handleGenericChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFormErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const handleFileSelect = async (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      alert("Gunakan gambar PNG atau JPG.");
      return;
    }

    if (kind === "logo" && file.size > LOGO_RULES.maxSize) {
      alert("Logo melebihi ukuran maksimum 1 MB.");
      return;
    }

    if (kind === "banner" && file.size > BANNER_RULES.maxSize) {
      alert("Banner melebihi ukuran maksimum 3 MB.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setCropError("");
    setCropState({
      kind,
      file,
      imageSrc: dataUrl,
      crop: { x: 0, y: 0 },
      zoom: 1,
      aspect: kind === "logo" ? 1 : BANNER_ASPECT_RATIO,
      croppedAreaPixels: null,
    });
  };

  const handleCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCropState((prev) =>
      prev
        ? {
            ...prev,
            croppedAreaPixels,
          }
        : prev,
    );
  }, []);

  const handleCropCancel = () => {
    setCropState(null);
    setCropError("");
  };

  const applyCrop = async () => {
    if (!cropState?.file || !cropState.croppedAreaPixels) {
      setCropError("Pilih area crop terlebih dahulu.");
      return;
    }

    const { kind, croppedAreaPixels, file, imageSrc } = cropState;

    if (kind === "logo") {
      if (
        croppedAreaPixels.width < LOGO_RULES.minDimension ||
        croppedAreaPixels.height < LOGO_RULES.minDimension
      ) {
        setCropError("Logo minimal 400px x 400px.");
        return;
      }
    }

    if (kind === "banner") {
      if (croppedAreaPixels.width < BANNER_RULES.minWidth) {
        setCropError("Lebar banner minimal 1200px.");
        return;
      }
    }

    try {
      const { blob } = await getCroppedImage(
        imageSrc,
        croppedAreaPixels,
        file.type,
      );

      const extension = file.type === "image/png" ? "png" : "jpg";
      const fileName = `${kind}-${Date.now()}.${extension}`;
      const croppedFile = new File([blob], fileName, { type: file.type });
      const previewUrl = URL.createObjectURL(blob);

      if (kind === "logo") {
        if (logo?.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(logo.previewUrl);
        }
        setLogo({
          file: croppedFile,
          previewUrl,
          uploadedUrl: null,
        });
        setFormErrors((prev) => ({
          ...prev,
          logo: "",
        }));
      } else {
        if (banner?.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(banner.previewUrl);
        }
        setBanner({
          file: croppedFile,
          previewUrl,
          uploadedUrl: null,
        });
        setFormErrors((prev) => ({
          ...prev,
          banner: "",
        }));
      }

      setCropState(null);
    } catch (error) {
      console.error("[AddOutlet] crop error", error);
      setCropError("Terjadi kesalahan saat memotong gambar.");
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (form.name.trim().length < 2) {
      nextErrors.name = "Nama outlet minimal 2 karakter.";
    }
    const slugValue = form.slug.trim();
    if (!slugValue) {
      nextErrors.slug = "Slug wajib diisi.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue)) {
      nextErrors.slug = "Slug hanya boleh huruf kecil, angka, dan strip (-).";
    }
    if (!form.cityId) {
      nextErrors.cityId = "Pilih kota.";
    }
    if (form.address && form.address.trim().length > 0 && form.address.trim().length < 5) {
      nextErrors.address = "Alamat minimal 5 karakter.";
    }
    const hasLogo = Boolean(logo && (logo.file || logo.uploadedUrl));
    if (!hasLogo) {
      nextErrors.logo = "Unggah logo outlet.";
    }
    const hasBanner = Boolean(banner && (banner.file || banner.uploadedUrl));
    if (!hasBanner) {
      nextErrors.banner = "Unggah banner outlet.";
    }
    const phoneValue = form.phone.trim();
    if (phoneValue && !/^\+[1-9]\d{7,14}$/.test(phoneValue)) {
      nextErrors.phone = "Nomor telepon harus dalam format E.164 (contoh +628123456789).";
    }
    const decimalsExceeded = (value) => {
      const [, fraction] = value.split(".");
      return fraction ? fraction.length > 6 : false;
    };
    const latValue = form.lat.trim();
    if (latValue) {
      const latNumber = Number(latValue);
      if (!/^[-+]?\d+(\.\d+)?$/.test(latValue) || !Number.isFinite(latNumber)) {
        nextErrors.lat = "Latitude harus berupa angka.";
      } else if (Math.abs(latNumber) >= 1000) {
        nextErrors.lat = "Gunakan derajat, bukan meter. Contoh: -6.200000.";
      } else if (latNumber < -90 || latNumber > 90) {
        nextErrors.lat = "Latitude harus di antara -90 dan 90 derajat.";
      } else if (decimalsExceeded(latValue)) {
        nextErrors.lat = "Latitude maksimal 6 angka di belakang koma.";
      }
    }
    const lngValue = form.lng.trim();
    if (lngValue) {
      const lngNumber = Number(lngValue);
      if (!/^[-+]?\d+(\.\d+)?$/.test(lngValue) || !Number.isFinite(lngNumber)) {
        nextErrors.lng = "Longitude harus berupa angka.";
      } else if (Math.abs(lngNumber) >= 1000) {
        nextErrors.lng = "Gunakan derajat, bukan meter. Contoh: 106.816666.";
      } else if (lngNumber < -180 || lngNumber > 180) {
        nextErrors.lng = "Longitude harus di antara -180 dan 180 derajat.";
      } else if (decimalsExceeded(lngValue)) {
        nextErrors.lng = "Longitude maksimal 6 angka di belakang koma.";
      }
    }
    if (!form.openHour) {
      nextErrors.openHour = "Jam buka wajib diisi.";
    }
    if (!form.closeHour) {
      nextErrors.closeHour = "Jam tutup wajib diisi.";
    }
    const openMinutes =
      Number.parseInt(form.openHour.slice(0, 2), 10) * 60 +
      Number.parseInt(form.openHour.slice(3, 5), 10);
    const closeMinutes =
      Number.parseInt(form.closeHour.slice(0, 2), 10) * 60 +
      Number.parseInt(form.closeHour.slice(3, 5), 10);
    if (closeMinutes <= openMinutes) {
      nextErrors.closeHour = "Jam tutup harus setelah jam buka.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmissionError("");
    if (!validateForm()) return;
    if (isEditMode) {
      handleConfirmSubmit();
    } else {
      setIsConfirmOpen(true);
    }
  };

  const handleConfirmSubmit = async () => {
    const hasLogo = Boolean(logo && (logo.file || logo.uploadedUrl));
    const hasBanner = Boolean(banner && (banner.file || banner.uploadedUrl));
    if (!hasLogo || !hasBanner) return;

    setIsConfirmOpen(false);
    setIsSubmitting(true);
    setSubmissionError("");

    try {
      let nextLogoUrl = logo?.uploadedUrl ?? null;
      let nextBannerUrl = banner?.uploadedUrl ?? null;

      if (logo?.file) {
        nextLogoUrl = await uploadWithSignedUrl(logo.file, "logo");
        setLogo((prev) =>
          prev
            ? {
                ...prev,
                file: null,
                uploadedUrl: nextLogoUrl,
              }
            : prev,
        );
      }

      if (banner?.file) {
        nextBannerUrl = await uploadWithSignedUrl(banner.file, "banner");
        setBanner((prev) =>
          prev
            ? {
                ...prev,
                file: null,
                uploadedUrl: nextBannerUrl,
              }
            : prev,
        );
      }

      if (!nextLogoUrl || !nextBannerUrl) {
        throw new Error("Logo dan banner wajib diunggah.");
      }

      const requestBody = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        lat: form.lat.trim() || null,
        lng: form.lng.trim() || null,
        priceTier: form.priceTier,
        cityId: form.cityId,
        openHour: form.openHour,
        closeHour: form.closeHour,
        logoUrl: nextLogoUrl,
        bannerUrl: nextBannerUrl,
      };

      const endpoint = isEditMode
        ? `/api/v1/outlets/${encodeURIComponent(outletId)}`
        : "/api/v1/outlets";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const apiError = payload?.error ?? {};
        const fieldNameMap = {
          logoUrl: "logo",
          bannerUrl: "banner",
        };
        const newFieldErrors = {};

        if (apiError.field) {
          newFieldErrors[fieldNameMap[apiError.field] ?? apiError.field] = apiError.message ?? "";
        }

        if (Array.isArray(apiError.issues)) {
          apiError.issues.forEach((issue) => {
            if (!issue.field || issue.field === "root") {
              return;
            }
            const mappedField = fieldNameMap[issue.field] ?? issue.field;
            if (!newFieldErrors[mappedField]) {
              newFieldErrors[mappedField] = issue.message;
            }
          });
        }

        if (Object.keys(newFieldErrors).length > 0) {
          setFormErrors((prev) => ({
            ...prev,
            ...newFieldErrors,
          }));
        }

        const rootIssue = apiError.issues?.find(
          (issue) => !issue.field || issue.field === "root",
        );

        if (rootIssue) {
          setSubmissionError(rootIssue.message);
        } else if (!apiError.field && !Object.keys(newFieldErrors).length) {
          setSubmissionError(
            apiError.message ??
              (isEditMode ? "Gagal memperbarui outlet." : "Gagal menyimpan outlet."),
          );
        }

        throw new Error(
          apiError.message ??
            (isEditMode ? "Gagal memperbarui outlet." : "Gagal menyimpan outlet."),
        );
      }

      if (isEditMode) {
        const redirectId = outletId ?? payload?.data?.id ?? "";
        toast({
          title: "Outlet berhasil diperbarui",
          description: "Perubahan outlet telah disimpan.",
        });
        router.replace(`/dashboard/outlet/configuration?id=${encodeURIComponent(redirectId)}`);
      } else {
        setCreatedOutletId(payload?.data?.id ?? null);
        setIsSuccessOpen(true);
      }
    } catch (error) {
      console.error("[OutletForm] submit error", error);
      setSubmissionError(
        error.message ?? (isEditMode ? "Gagal memperbarui outlet." : "Gagal menyimpan outlet."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessRedirect = () => {
    if (createdOutletId) {
      router.replace(
        `/dashboard/outlet/configuration?id=${encodeURIComponent(createdOutletId)}`,
      );
    } else {
      router.replace("/dashboard/outlet");
    }
  };

  const backHref = isEditMode && outletId
    ? `/dashboard/outlet/configuration?id=${encodeURIComponent(outletId)}`
    : "/dashboard/outlet";
  const backLabel = isEditMode ? "← Outlet Configuration" : "← Outlet List";
  const pageTitle = isEditMode ? "Edit Outlet" : "Add Outlet";
  const submitLabel = isEditMode ? "Simpan Perubahan" : "Add Outlet";
  const submittingLabel = isEditMode ? "Menyimpan..." : "Menambahkan...";

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 px-8 py-6">
          <h2 className="text-xl font-semibold text-slate-900">Outlet</h2>
        </header>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Logo</label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
                {logo?.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo.previewUrl}
                    alt="Outlet logo"
                    className="h-32 w-32 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border border-slate-200 bg-white text-3xl text-slate-400">
                    🖼️
                  </div>
                )}
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-blue-600">Click to upload</span> atau drag and drop
                  <div className="mt-1 text-xs text-slate-500">
                    PNG/JPG • max 1 MB • min 400×400
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => handleFileSelect(event, "logo")}
                />
              </label>
              {formErrors.logo ? (
                <p className="text-xs text-rose-600">{formErrors.logo}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Banner</label>
              <label
                className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-6 transition hover:border-blue-300 hover:bg-blue-50/40"
                style={{
                  "--banner-aspect": BANNER_ASPECT_RATIO,
                }}
              >
                <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="aspect-[--banner-aspect]">
                    {banner?.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={banner.previewUrl}
                        alt="Outlet banner"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-slate-400">
                        🖼️
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center text-sm text-slate-600">
                  <span className="font-semibold text-blue-600">Click to upload</span> atau drag and drop
                  <div className="mt-1 text-xs text-slate-500">
                    PNG/JPG • max 3 MB • min width 1200px
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => handleFileSelect(event, "banner")}
                />
              </label>
              {formErrors.banner ? (
                <p className="text-xs text-rose-600">{formErrors.banner}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="name">
                Outlet Name
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={handleNameChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Input outlet name"
              />
              {formErrors.name ? (
                <p className="text-xs text-rose-600">{formErrors.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                type="text"
                value={form.slug}
                onFocus={handleSlugFocus}
                onChange={handleSlugChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="otomatis dari nama, bisa disunting"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              {formErrors.slug ? (
                <p className="text-xs text-rose-600">{formErrors.slug}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={handlePhoneChange}
                inputMode="tel"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="+62xxxxxxxxxx"
              />
              <p className="text-xs text-slate-500">Gunakan format E.164, contoh +628123456789.</p>
              {formErrors.phone ? (
                <p className="text-xs text-rose-600">{formErrors.phone}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="address">
                Address
              </label>
              <input
                id="address"
                type="text"
                value={form.address}
                onChange={handleGenericChange("address")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Input address"
              />
              {formErrors.address ? (
                <p className="text-xs text-rose-600">{formErrors.address}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="city">
                City
              </label>
              <select
                id="city"
                value={form.cityId}
                onChange={handleGenericChange("cityId")}
                disabled={loadingCities}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Pilih kota</option>
                {cityOptions.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.city} • {city.province}
                  </option>
                ))}
              </select>
              {formErrors.cityId ? (
                <p className="text-xs text-rose-600">{formErrors.cityId}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Coordinates</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <input
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    value={form.lng}
                    onChange={handleLngChange}
                    placeholder="Longitude"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="text-xs text-slate-500">Longitude ±180°, maksimal 6 desimal.</p>
                  {formErrors.lng ? (
                    <p className="text-xs text-rose-600">{formErrors.lng}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <input
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    value={form.lat}
                    onChange={handleLatChange}
                    placeholder="Latitude"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="text-xs text-slate-500">Latitude ±90°, maksimal 6 desimal.</p>
                  {formErrors.lat ? (
                    <p className="text-xs text-rose-600">{formErrors.lat}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="openHour">
                Operational Hour (Open)
              </label>
              <input
                id="openHour"
                type="time"
                value={form.openHour}
                onChange={handleGenericChange("openHour")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              {formErrors.openHour ? (
                <p className="text-xs text-rose-600">{formErrors.openHour}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="closeHour">
                Operational Hour (Close)
              </label>
              <input
                id="closeHour"
                type="time"
                value={form.closeHour}
                onChange={handleGenericChange("closeHour")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              {formErrors.closeHour ? (
                <p className="text-xs text-rose-600">{formErrors.closeHour}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="price">
                Price
              </label>
              <select
                id="price"
                value={form.priceTier}
                onChange={handleGenericChange("priceTier")}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {PRICE_LABELS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {submissionError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {submissionError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (isEditMode && outletId) {
                  router.push(
                    `/dashboard/outlet/configuration?id=${encodeURIComponent(outletId)}`,
                  );
                } else {
                  router.push("/dashboard/outlet");
                }
              }}
              className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-slate-100"
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </section>

      {cropState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {cropState.kind === "logo" ? "Crop Logo" : "Crop Banner"}
              </h3>
              <p className="text-sm text-slate-500">
                Sesuaikan area gambar agar sesuai rasio yang dibutuhkan.
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="relative h-[380px] overflow-hidden rounded-2xl bg-slate-900/5">
                <EasyCrop
                  image={cropState.imageSrc}
                  crop={cropState.crop}
                  zoom={cropState.zoom}
                  aspect={cropState.aspect}
                  onCropChange={(crop) =>
                    setCropState((prev) =>
                      prev
                        ? {
                            ...prev,
                            crop,
                          }
                        : prev,
                    )
                  }
                  onZoomChange={(zoom) =>
                    setCropState((prev) =>
                      prev
                        ? {
                            ...prev,
                            zoom,
                          }
                        : prev,
                    )
                  }
                  onCropComplete={handleCropComplete}
                  showGrid
                  restrictPosition
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={cropState.zoom}
                  onChange={(event) =>
                    setCropState((prev) =>
                      prev
                        ? {
                            ...prev,
                            zoom: Number.parseFloat(event.target.value),
                          }
                        : prev,
                    )
                  }
                  className="flex-1 accent-blue-600"
                />
              </div>
              {cropError ? (
                <p className="text-xs text-rose-600">{cropError}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={handleCropCancel}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCrop}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!isEditMode && isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="px-6 py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                ⚠️
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Add this outlet?</h3>
              <p className="mt-2 text-sm text-slate-500">
                Anda akan menambahkan outlet baru ke daftar. Lanjutkan?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!isEditMode && isSuccessOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="px-6 py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                ✅
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Outlet Berhasil Ditambahkan
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Outlet baru telah ditambahkan ke sistem.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={handleSuccessRedirect}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                See Details
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
