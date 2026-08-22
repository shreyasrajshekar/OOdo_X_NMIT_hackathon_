import { ProfileView } from "@/components/employees/profile-view";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfileView id={id} />;
}
