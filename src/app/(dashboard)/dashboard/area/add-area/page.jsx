"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const COUNTRY_OPTIONS = [
  {
    id: "id",
    name: "Indonesia",
    provinces: [
      {
        id: "dki-jakarta",
        name: "DKI Jakarta",
        cities: [
          { id: "jakarta-pusat", name: "Jakarta Pusat" },
          { id: "jakarta-barat", name: "Jakarta Barat" },
          { id: "jakarta-selatan", name: "Jakarta Selatan" },
          { id: "jakarta-timur", name: "Jakarta Timur" },
          { id: "jakarta-utara", name: "Jakarta Utara" },
        ],
      },
      {
        id: "jawa-barat",
        name: "Jawa Barat",
        cities: [
          { id: "bandung", name: "Bandung" },
          { id: "bogor", name: "Bogor" },
          { id: "depok", name: "Depok" },
          { id: "bekasi", name: "Bekasi" },
        ],
      },
      {
        id: "jawa-timur",
        name: "Jawa Timur",
        cities: [
          { id: "surabaya", name: "Surabaya" },
          { id: "malang", name: "Malang" },
          { id: "kediri", name: "Kediri" },
          { id: "madiun", name: "Madiun" },
        ],
      },
    ],
  },
  {
    id: "my",
    name: "Malaysia",
    provinces: [
      {
        id: "kuala-lumpur",
        name: "Kuala Lumpur",
        cities: [
          { id: "bukit-bintang", name: "Bukit Bintang" },
          { id: "cheras", name: "Cheras" },
        ],
      },
      {
        id: "selangor",
        name: "Selangor",
        cities: [
          { id: "shah-alam", name: "Shah Alam" },
          { id: "petaling-jaya", name: "Petaling Jaya" },
        ],
      },
    ],
  },
];

export default function AddAreaPage() {
  const router = useRouter();
  const [countryId, setCountryId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");

  const provinces = useMemo(() => {
    return (
      COUNTRY_OPTIONS.find((country) => country.id === countryId)?.provinces ??
      []
    );
  }, [countryId]);

  const cities = useMemo(() => {
    return provinces.find((province) => province.id === provinceId)?.cities ?? [];
  }, [provinceId, provinces]);

  const isSubmitDisabled = !countryId || !provinceId || !cityId;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitDisabled) {
      return;
    }
    alert("area added");
  };

  const handleBack = () => {
    router.push("/dashboard/area");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 px-8 py-6">
          <h1 className="text-2xl font-semibold text-slate-900">Area</h1>
        </header>

        <form onSubmit={handleSubmit} className="px-8 py-6">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="country"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Country
              </label>
              <select
                id="country"
                name="country"
                value={countryId}
                onChange={(event) => {
                  setCountryId(event.target.value);
                  setProvinceId("");
                  setCityId("");
                }}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Pilih negara</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="province"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Province
              </label>
              <select
                id="province"
                name="province"
                value={provinceId}
                onChange={(event) => {
                  setProvinceId(event.target.value);
                  setCityId("");
                }}
                disabled={!provinces.length}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Pilih provinsi</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="city"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                City
              </label>
              <select
                id="city"
                name="city"
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
                disabled={!cities.length}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Pilih kota</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-slate-100"
            >
              Add Area
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
