import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import AdminOverview from "@/components/admin/AdminOverview";
import UserManagement from "@/components/admin/UserManagement";
import ShopManagement from "@/components/admin/ShopManagement";
import ReportsPanel from "@/components/admin/ReportsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, Store, FileText } from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="shops" className="flex items-center gap-1.5 text-xs">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Shops</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          <TabsContent value="shops">
            <ShopManagement />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
