"use client";

import { useSession } from "@/components/demo-session-provider";
import { ProfileView } from "@/components/employees/profile-view";

export default function MyProfilePage() {
  const { currentEmployee } = useSession();
  return <ProfileView id={currentEmployee.id} />;
}
