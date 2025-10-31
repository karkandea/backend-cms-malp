"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useToast } from "@/components/ui/use-toast";

const WIFI_LEVEL_OPTIONS = [
  { value: "SLOW", label: "WiFi Lambat" },
  { value: "STABLE", label: "WiFi Stabil" },
  { value: "FAST", label: "WiFi Cepat" },
];

const SOCKET_AVAILABILITY_OPTIONS = [
  { value: "LIMITED", label: "Terbatas" },
  { value: "SELECT_TABLES", label: "Beberapa Meja" },
  { value: "EACH_TABLE", label: "Setiap Meja" },
];

const AC_LEVEL_OPTIONS = [
  { value: "COOL", label: "Dingin" },
  { value: "MEDIUM", label: "Normal" },
  { value: "NOT_COOL", label: "Kurang Dingin" },
];

const MUSHOLA_OPTIONS = [
  { value: "SEJADAH", label: "Sejadah" },
  { value: "ALQURAN", label: "Al-Qur'an" },
  { value: "SARUNG", label: "Sarung" },
  { value: "MUKENA", label: "Mukena" },
];

const TOILET_OPTIONS = [
  { value: "TISU", label: "Tisu" },
  { value: "SEMPROTAN", label: "Semprotan" },
  { value: "WASTAFEL", label: "Wastafel" },
  { value: "PEMBALUT", label: "Pembalut" },
];

const ROOM_CATEGORY_LABELS = {
  INDOOR_NS: "Indoor Non-smoking",
  INDOOR_S: "Indoor Smoking",
  OUTDOOR: "Outdoor",
  ROOFTOP: "Rooftop",
  TOILET: "Toilet",
  MUSHOLA: "Mushola",
  VVIP: "VVIP Room",
  PARKING: "Parking",
};

const DEFAULT_ROOM_OPTIONS = [
  "INDOOR_NS",
  "INDOOR_S",
  "OUTDOOR",
  "ROOFTOP",
  "TOILET",
  "MUSHOLA",
  "VVIP",
  "PARKING",
];

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_MENU_IMAGE_SIZE = 3 * 1024 * 1024;
const MAX_ROOM_IMAGE_SIZE = 5 * 1024 * 1024;

function normalizeTags(tags) {
  return Array.from(new Set((tags ?? []).map((item) => item.trim()).filter(Boolean)));
}

function mapServerImage(image) {
  return {
    id: image.id ?? null,
    url: image.url,
    storageKey: image.storageKey,
    bucket: image.bucket,
    mime: image.mime,
    width: image.width,
    height: image.height,
    blurhash: image.blurhash ?? null,
    checksum: image.checksum ?? null,
    file: null,
    previewUrl: null,
  };
}

function buildInitialRoomCategoryState(categories) {
  const state = {};
  for (const type of DEFAULT_ROOM_OPTIONS) {
    state[type] = {
      active: false,
      description: "",
      images: [],
    };
  }

  for (const category of categories ?? []) {
    state[category.type] = {
      active: true,
      description: category.description ?? "",
      images: (category.images ?? []).map(mapServerImage),
    };
  }

  return state;
}

function revokePreview(image) {
  if (image?.previewUrl) {
    URL.revokeObjectURL(image.previewUrl);
  }
}

async function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca dimensi gambar."));
    };
    img.src = url;
  });
}

async function uploadAsset(file, kind) {
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

  const signed = await signResponse.json();
  const { uploadUrl, publicUrl, storageKey, bucket } = signed.data;

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

  return {
    url: publicUrl,
    storageKey,
    bucket,
  };
}

function TagEditor({ label, addLabel, value, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState("");

  const handleCommit = () => {
    const next = inputValue.trim();
    if (!next) return;
    if (value.some((item) => item.toLowerCase() === next.toLowerCase())) {
      setInputValue("");
      return;
    }
    onChange([...value, next]);
    setInputValue("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCommit();
    }
  };

  const handleRemove = (index) => {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCommit}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          {addLabel}
          <span className="text-lg leading-none">+</span>
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full min-w-[200px] max-w-sm flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <button
              key={`${item}-${index}`}
              type="button"
              onClick={() => handleRemove(index)}
              className="group inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-rose-100 hover:text-rose-600"
            >
              {item}
              <span className="text-xs text-slate-400 transition group-hover:text-rose-500">×</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">{label} belum ditambahkan.</p>
      )}
    </div>
  );
}

function FeatureSelect({ label, placeholder, value, onChange, options }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleCollection({ label, options, value, onToggle }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm hover:bg-blue-500"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getRoomLabel(type) {
  return ROOM_CATEGORY_LABELS[type] ?? type;
}

export default function OutletFacilityView({ outletId, outletName, facility }) {
  const router = useRouter();
  const { toast } = useToast();

  const [roomAmenities, setRoomAmenities] = useState(() => normalizeTags(facility?.roomAmenities));
  const [musicEntertainments, setMusicEntertainments] = useState(() =>
    normalizeTags(facility?.musicEntertainments),
  );
  const [foodPreferences, setFoodPreferences] = useState(() =>
    normalizeTags(facility?.foodPreferences),
  );
  const [parkingOptions, setParkingOptions] = useState(() => normalizeTags(facility?.parkingOptions));
  const [features, setFeatures] = useState(() => ({
    wifiLevel: facility?.features?.wifiLevel ?? null,
    socketAvailability: facility?.features?.socketAvailability ?? null,
    acLevel: facility?.features?.acLevel ?? null,
    musholaItems: facility?.features?.musholaItems ?? [],
    toiletItems: facility?.features?.toiletItems ?? [],
  }));
  const [menuImages, setMenuImages] = useState(() =>
    (facility?.menuImages ?? []).map(mapServerImage),
  );
  const [roomCategories, setRoomCategories] = useState(() =>
    buildInitialRoomCategoryState(facility?.roomCategories ?? []),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLocked, setSubmitLocked] = useState(false);

  const orderedRoomTypes = useMemo(() => {
    const existingTypes = new Set(Object.keys(roomCategories));
    const base = [...DEFAULT_ROOM_OPTIONS];
    for (const type of existingTypes) {
      if (!base.includes(type)) {
        base.push(type);
      }
    }
    return base;
  }, [roomCategories]);

  const handleFeatureChange = (field) => (value) => {
    setFeatures((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleMulti = (field) => (item) => {
    setFeatures((prev) => {
      const set = new Set(prev[field] ?? []);
      if (set.has(item)) {
        set.delete(item);
      } else {
        set.add(item);
      }
      return {
        ...prev,
        [field]: Array.from(set),
      };
    });
  };

  const createImageEntry = useCallback(async (file, sizeLimit) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error("Gunakan gambar PNG atau JPG.");
    }
    if (file.size > sizeLimit) {
      throw new Error("Ukuran gambar melebihi batas.");
    }

    const dimensions = await readImageDimensions(file);
    const previewUrl = URL.createObjectURL(file);

    return {
      id: null,
      url: "",
      storageKey: "",
      bucket: "",
      mime: file.type,
      width: dimensions.width,
      height: dimensions.height,
      blurhash: null,
      checksum: null,
      file,
      previewUrl,
    };
  }, []);

  const handleMenuImageSelect = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    try {
      const entries = [];
      for (const file of files) {
        const entry = await createImageEntry(file, MAX_MENU_IMAGE_SIZE);
        entries.push(entry);
      }
      setMenuImages((prev) => [...prev, ...entries]);
    } catch (error) {
      console.error("[OutletFacility] menu image error", error);
      toast({
        title: "Unggah menu gagal",
        description: error.message ?? "Pastikan gambar sesuai ketentuan.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveMenuImage = (index) => {
    setMenuImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      revokePreview(removed);
      return next;
    });
  };

  const handleToggleRoomCategory = (type) => {
    setRoomCategories((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] ?? { description: "", images: [] }),
        active: !(prev[type]?.active ?? false),
      },
    }));
  };

  const handleRoomDescriptionChange = (type) => (event) => {
    const value = event.target.value;
    setRoomCategories((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] ?? { active: true, images: [] }),
        description: value,
      },
    }));
  };

  const handleRoomImageSelect = (type) => async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    try {
      const entries = [];
      for (const file of files) {
        const entry = await createImageEntry(file, MAX_ROOM_IMAGE_SIZE);
        entries.push(entry);
      }
      setRoomCategories((prev) => {
        const current = prev[type] ?? { active: true, description: "", images: [] };
        return {
          ...prev,
          [type]: {
            ...current,
            images: [...current.images, ...entries],
          },
        };
      });
    } catch (error) {
      console.error("[OutletFacility] room image error", error);
      toast({
        title: "Unggah foto ruangan gagal",
        description: error.message ?? "Pastikan gambar sesuai ketentuan.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleRoomImageRemove = (type, index) => {
    setRoomCategories((prev) => {
      const current = prev[type] ?? { active: false, description: "", images: [] };
      const nextImages = [...current.images];
      const [removed] = nextImages.splice(index, 1);
      revokePreview(removed);
      return {
        ...prev,
        [type]: {
          ...current,
          images: nextImages,
        },
      };
    });
  };

  const prepareImageEntries = useCallback(async (images, kind) => {
    const payload = [];
    const nextState = [];
    for (const image of images) {
      if (image.file) {
        const uploaded = await uploadAsset(image.file, kind);
        revokePreview(image);
        const entry = {
          id: image.id ?? undefined,
          url: uploaded.url,
          storageKey: uploaded.storageKey,
          bucket: uploaded.bucket,
          mime: image.mime,
          width: image.width,
          height: image.height,
          blurhash: image.blurhash ?? null,
          checksum: image.checksum ?? null,
        };
        payload.push(entry);
        nextState.push({
          ...entry,
          id: entry.id ?? null,
          file: null,
          previewUrl: null,
        });
      } else {
        payload.push({
          id: image.id ?? undefined,
          url: image.url,
          storageKey: image.storageKey,
          bucket: image.bucket,
          mime: image.mime,
          width: image.width,
          height: image.height,
          blurhash: image.blurhash ?? null,
          checksum: image.checksum ?? null,
        });
        nextState.push({
          ...image,
          file: null,
          previewUrl: null,
        });
      }
    }
    return { payload, nextState };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || submitLocked) return;
    setIsSubmitting(true);

    try {
      const menuPrepared = await prepareImageEntries(menuImages, "menu");

      const roomPayload = [];
      const updatedRooms = {};
      for (const type of Object.keys(roomCategories)) {
        const category = roomCategories[type];
        if (!category?.active) continue;

        const prepared = await prepareImageEntries(category.images, "room");
        roomPayload.push({
          type,
          description: category.description?.trim()?.length ? category.description.trim() : undefined,
          images: prepared.payload,
        });
        updatedRooms[type] = {
          ...category,
          images: prepared.nextState,
          active: true,
        };
      }

      const payload = {
        roomAmenities,
        musicEntertainments,
        foodPreferences,
        parkingOptions,
        features: {
          wifiLevel: features.wifiLevel ?? null,
          socketAvailability: features.socketAvailability ?? null,
          acLevel: features.acLevel ?? null,
          musholaItems: features.musholaItems ?? [],
          toiletItems: features.toiletItems ?? [],
        },
        menuImages: menuPrepared.payload,
        roomCategories: roomPayload,
      };

      const response = await fetch(`/api/v1/outlets/${encodeURIComponent(outletId)}/facility`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error?.message ?? "Terjadi kesalahan saat menyimpan fasilitas outlet.",
        );
      }

      toast({
        title: "Fasilitas berhasil diperbarui.",
      });

      setMenuImages(menuPrepared.nextState);
      setRoomCategories((prev) => ({
        ...prev,
        ...updatedRooms,
      }));

      try {
        const refreshResponse = await fetch(
          `/api/v1/outlets/${encodeURIComponent(outletId)}/facility`,
          { cache: "no-store" },
        );
        if (refreshResponse.ok) {
          const freshPayload = await refreshResponse.json().catch(() => null);
          const freshData = freshPayload?.data;
          if (freshData) {
            setRoomAmenities(normalizeTags(freshData.roomAmenities));
            setMusicEntertainments(normalizeTags(freshData.musicEntertainments));
            setFoodPreferences(normalizeTags(freshData.foodPreferences));
            setParkingOptions(normalizeTags(freshData.parkingOptions));
            setFeatures({
              wifiLevel: freshData.features?.wifiLevel ?? null,
              socketAvailability: freshData.features?.socketAvailability ?? null,
              acLevel: freshData.features?.acLevel ?? null,
              musholaItems: freshData.features?.musholaItems ?? [],
              toiletItems: freshData.features?.toiletItems ?? [],
            });
            setMenuImages((freshData.menuImages ?? []).map(mapServerImage));
            setRoomCategories(buildInitialRoomCategoryState(freshData.roomCategories ?? []));
          }
        }
      } catch (refreshError) {
        console.warn("[OutletFacility] refresh failed", refreshError);
      }

      setSubmitLocked(true);
      setTimeout(() => setSubmitLocked(false), 2000);
    } catch (error) {
      console.error("[OutletFacility] submit failed", error);
      toast({
        title: "Gagal menyimpan fasilitas",
        description: error.message ?? "Terjadi kesalahan saat menyimpan fasilitas outlet.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/outlet/configuration?id=${encodeURIComponent(outletId)}`);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/outlet"
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          ← Outlet List
        </Link>
        <div className="text-sm text-slate-500">
          <span className="font-medium text-slate-600">Outlet Configuration</span> / Outlet Facility
        </div>
      </header>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">{outletName}</h1>
        <p className="text-sm text-slate-500">
          Kelola fasilitas outlet agar pengunjung mendapatkan informasi yang lengkap.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                Fasilitas
              </span>
              <div className="grid gap-6">
                <TagEditor
                  label="Fasilitas Ruangan"
                  addLabel="Tambahkan Fasilitas Ruangan"
                  value={roomAmenities}
                  onChange={setRoomAmenities}
                  placeholder="Tambahkan fasilitas ruangan"
                />
                <TagEditor
                  label="Hiburan Musik"
                  addLabel="Tambahkan Hiburan Musik"
                  value={musicEntertainments}
                  onChange={setMusicEntertainments}
                  placeholder="Tambahkan hiburan musik"
                />
                <TagEditor
                  label="Preferensi Makanan"
                  addLabel="Tambahkan Preferensi Makanan"
                  value={foodPreferences}
                  onChange={setFoodPreferences}
                  placeholder="Tambahkan preferensi makanan"
                />
                <TagEditor
                  label="Parkir"
                  addLabel="Tambahkan Opsi Parkir"
                  value={parkingOptions}
                  onChange={setParkingOptions}
                  placeholder="Tambahkan opsi parkir"
                />
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                Fitur Lainnya
              </span>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FeatureSelect
                  label="WiFi"
                  placeholder="Pilih Ketersediaan"
                  value={features.wifiLevel}
                  onChange={handleFeatureChange("wifiLevel")}
                  options={WIFI_LEVEL_OPTIONS}
                />
                <FeatureSelect
                  label="Colokan"
                  placeholder="Pilih Ketersediaan"
                  value={features.socketAvailability}
                  onChange={handleFeatureChange("socketAvailability")}
                  options={SOCKET_AVAILABILITY_OPTIONS}
                />
                <FeatureSelect
                  label="AC"
                  placeholder="Pilih Ketersediaan"
                  value={features.acLevel}
                  onChange={handleFeatureChange("acLevel")}
                  options={AC_LEVEL_OPTIONS}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ToggleCollection
                  label="Mushola"
                  options={MUSHOLA_OPTIONS}
                  value={features.musholaItems ?? []}
                  onToggle={handleToggleMulti("musholaItems")}
                />
                <ToggleCollection
                  label="Toilet"
                  options={TOILET_OPTIONS}
                  value={features.toiletItems ?? []}
                  onToggle={handleToggleMulti("toiletItems")}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                  Menu
                </span>
                <p className="text-xs text-slate-400">
                  Format PNG/JPG • maks 3 MB per gambar.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {menuImages.map((image, index) => (
                  <div
                    key={image.id ?? image.previewUrl ?? index}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200"
                  >
                    <div className="aspect-[3/4] bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.previewUrl ?? image.url}
                        alt="Menu"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMenuImage(index)}
                      className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-rose-600 shadow transition hover:bg-white"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center text-sm text-slate-400 transition hover:border-blue-300 hover:text-blue-500">
                  <span className="text-3xl">📷</span>
                  <span className="mt-2 text-xs font-medium">Tambah Menu</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg"
                    multiple
                    onChange={handleMenuImageSelect}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                  Opsi Ruangan
                </span>
                <p className="text-xs text-slate-400">
                  Aktifkan kategori ruangan dan unggah foto pendukung.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {orderedRoomTypes.map((type) => {
                  const active = roomCategories[type]?.active ?? false;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleToggleRoomCategory(type)}
                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm transition ${
                        active
                          ? "bg-blue-600 text-white shadow-sm hover:bg-blue-500"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {getRoomLabel(type)}
                    </button>
                  );
                })}
              </div>

              {orderedRoomTypes.map((type) => {
                const category = roomCategories[type];
                if (!category?.active) return null;
                return (
                  <div
                    key={`room-${type}`}
                    className="space-y-4 rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="space-y-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {getRoomLabel(type)}
                      </span>
                      <textarea
                        rows={2}
                        value={category.description ?? ""}
                        onChange={handleRoomDescriptionChange(type)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="Tambahkan deskripsi singkat ruangan (opsional)"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {category.images.map((image, index) => (
                        <div
                          key={image.id ?? image.previewUrl ?? `${type}-${index}`}
                          className="group relative overflow-hidden rounded-2xl border border-slate-200"
                        >
                          <div className="aspect-[3/4] bg-slate-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image.previewUrl ?? image.url}
                              alt={getRoomLabel(type)}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRoomImageRemove(type, index)}
                            className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-rose-600 shadow transition hover:bg-white"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                      <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center text-sm text-slate-400 transition hover:border-blue-300 hover:text-blue-500">
                        <span className="text-3xl">📷</span>
                        <span className="mt-2 text-xs font-medium">Tambah Foto</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png,image/jpeg"
                          multiple
                          onChange={handleRoomImageSelect(type)}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting || submitLocked}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:text-slate-100"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </section>
  );
}
