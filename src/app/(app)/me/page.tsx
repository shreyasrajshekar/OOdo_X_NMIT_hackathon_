"use client";

import { useDemoSession } from "@/components/demo-session-provider";
import { ProfileView } from "@/components/employees/profile-view";

export default function MyProfilePage() {
  const { currentEmployee } = useDemoSession();
  return <ProfileView id={currentEmployee.id} />;
}
