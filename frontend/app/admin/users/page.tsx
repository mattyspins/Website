"use client";

import UsersTable from "@/components/admin/UsersTable";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-gaming font-bold text-white tracking-wide">Users</h1>
        <p className="text-gray-500 text-sm mt-0.5">Search, filter, and manage community members</p>
      </div>
      <UsersTable />
    </div>
  );
}
