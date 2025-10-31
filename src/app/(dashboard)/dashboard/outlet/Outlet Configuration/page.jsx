import { redirect } from "next/navigation";

export default function LegacyOutletConfigurationPage({ searchParams }) {
  const id = searchParams?.id;
  if (id) {
    redirect(`/dashboard/outlet/configuration?id=${encodeURIComponent(id)}`);
  }
  redirect("/dashboard/outlet/configuration");
}
