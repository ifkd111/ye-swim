"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <Button className={className} type="submit" variant="secondary">
        <LogOut size={16} />
        退出
      </Button>
    </form>
  );
}
