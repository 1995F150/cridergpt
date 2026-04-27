import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, CreditCard, Flag, BarChart3, FileText, Settings, BookOpen, Mail, DollarSign, AlertTriangle, ClipboardList, Database, TerminalSquare, FileJson, Ghost, Nfc, Package, Cpu, Lightbulb, Tag, ShoppingBag, QrCode, Barcode, Receipt, HardDrive, Rocket, Server, Brain } from 'lucide-react';
import { HomeServerPanel } from '@/components/admin/HomeServerPanel';
import { LaunchPlanner } from '@/components/admin/LaunchPlanner';
import { DatabaseThrottlePanel } from '@/components/admin/DatabaseThrottlePanel';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserManagement } from '@/components/admin/UserManagement';
import { ContentModeration } from '@/components/admin/ContentModeration';
import { SubscriptionManager } from '@/components/admin/SubscriptionManager';
import { SystemLogs } from '@/components/admin/SystemLogs';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { ChapterRequestAdmin } from '@/components/FFA/ChapterRequestAdmin';
import { ChapterManagement } from '@/components/admin/ChapterManagement';
import { EmailBroadcast } from '@/components/admin/EmailBroadcast';
import { RevenueDashboard } from '@/components/admin/RevenueDashboard';
import { MaintenanceMode } from '@/components/admin/MaintenanceMode';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { APIGeneration } from '@/components/admin/APIGeneration';
import { ConversationImporter } from '@/components/admin/ConversationImporter';
import { SnapchatAnalytics } from '@/components/admin/SnapchatAnalytics';
import { NFCTagWriter } from '@/components/admin/NFCTagWriter';
import { FilterOrdersManager } from '@/components/admin/FilterOrdersManager';
import { DeviceManager } from '@/components/admin/DeviceManager';
import { ProductIdeasTracker } from '@/components/admin/ProductIdeasTracker';
import { TagOrdersManager } from '@/components/admin/TagOrdersManager';
import { StoreProductsManager } from '@/components/admin/StoreProductsManager';
import { QRCodeGenerator } from '@/components/admin/QRCodeGenerator';
import { BarcodeGenerator } from '@/components/admin/BarcodeGenerator';
import { PointOfSale } from '@/components/admin/PointOfSale';
import { AIInfrastructure } from '@/components/admin/AIInfrastructure';

export function AdminPanel() {
  const { isAdmin, loading } = useAdmin();
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingChapters, setPendingChapters] = useState(0);

  useEffect(() => {
    async function fetchPendingCounts() {
      if (!isAdmin) return;
      
      try {
        const [reportsRes, chaptersRes] = await Promise.all([
          (supabase as any).from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('chapter_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);
        
        setPendingReports(reportsRes.count || 0);
        setPendingChapters(chaptersRes.count || 0);
      } catch (error) {
        console.error('Error fetching pending counts:', error);
      }
    }
    
    fetchPendingCounts();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access the admin panel.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient Header */}
      <div className="rounded-xl bg-gradient-to-r from-destructive/20 via-orange-500/20 to-amber-500/20 border border-destructive/20 p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-destructive to-orange-500 flex items-center justify-center shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
              Admin Control Center
            </h1>
            <p className="text-muted-foreground">Manage users, content, and system settings</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 rounded-xl">
          <TabsTrigger value="dashboard" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CreditCard className="h-4 w-4" /> Subscriptions
          </TabsTrigger>
          <TabsTrigger value="moderation" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
            <Flag className="h-4 w-4" /> Moderation
            {pendingReports > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 flex items-center justify-center text-xs px-1.5">{pendingReports}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="chapters" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
            <BookOpen className="h-4 w-4" /> Chapters
            {pendingChapters > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 flex items-center justify-center text-xs px-1.5">{pendingChapters}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" /> Logs
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Mail className="h-4 w-4" /> Broadcast
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <DollarSign className="h-4 w-4" /> Revenue
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <AlertTriangle className="h-4 w-4" /> Maintenance
          </TabsTrigger>
          <TabsTrigger value="db-throttle" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <HardDrive className="h-4 w-4" /> DB Throttle
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TerminalSquare className="h-4 w-4" /> API Generation
          </TabsTrigger>
          <TabsTrigger value="imports" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileJson className="h-4 w-4" /> Imports
          </TabsTrigger>
          <TabsTrigger value="snapchat" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Ghost className="h-4 w-4" /> Snapchat
          </TabsTrigger>
          <TabsTrigger value="nfc-writer" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Nfc className="h-4 w-4" /> NFC Writer
          </TabsTrigger>
          <TabsTrigger value="filter-orders" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Package className="h-4 w-4" /> Filter Orders
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Cpu className="h-4 w-4" /> Devices
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Lightbulb className="h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="tag-orders" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Tag className="h-4 w-4" /> Tag Orders
          </TabsTrigger>
          <TabsTrigger value="store-products" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ShoppingBag className="h-4 w-4" /> Store
          </TabsTrigger>
          <TabsTrigger value="qr-generator" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <QrCode className="h-4 w-4" /> QR Codes
          </TabsTrigger>
          <TabsTrigger value="barcode-generator" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Barcode className="h-4 w-4" /> Barcodes
          </TabsTrigger>
          <TabsTrigger value="pos" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Receipt className="h-4 w-4" /> POS
          </TabsTrigger>
          <TabsTrigger value="home-server" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Server className="h-4 w-4" /> Home Server
          </TabsTrigger>
          <TabsTrigger value="launch-planner" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Rocket className="h-4 w-4" /> Launch Planner
          </TabsTrigger>
          <TabsTrigger value="ai-infra" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Brain className="h-4 w-4" /> AI Infrastructure
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="subscriptions"><SubscriptionManager /></TabsContent>
        <TabsContent value="moderation"><ContentModeration /></TabsContent>

        <TabsContent value="chapters">
          <Tabs defaultValue="requests" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="requests" className="gap-2">
                <ClipboardList className="h-4 w-4" /> Requests
                {pendingChapters > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs px-1">{pendingChapters}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="manage" className="gap-2">
                <Database className="h-4 w-4" /> Manage Chapters
              </TabsTrigger>
            </TabsList>
            <TabsContent value="requests"><ChapterRequestAdmin /></TabsContent>
            <TabsContent value="manage"><ChapterManagement /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="analytics"><AnalyticsDashboard /></TabsContent>
        <TabsContent value="logs"><SystemLogs /></TabsContent>
        <TabsContent value="broadcast"><EmailBroadcast /></TabsContent>
        <TabsContent value="revenue"><RevenueDashboard /></TabsContent>
        <TabsContent value="maintenance"><MaintenanceMode /></TabsContent>
        <TabsContent value="db-throttle"><DatabaseThrottlePanel /></TabsContent>
        <TabsContent value="api"><APIGeneration /></TabsContent>
        <TabsContent value="settings"><SystemSettings /></TabsContent>
        <TabsContent value="imports"><ConversationImporter /></TabsContent>
        <TabsContent value="snapchat"><SnapchatAnalytics /></TabsContent>
        <TabsContent value="nfc-writer"><NFCTagWriter /></TabsContent>
        <TabsContent value="filter-orders"><FilterOrdersManager /></TabsContent>
        <TabsContent value="devices"><DeviceManager /></TabsContent>
        <TabsContent value="products"><ProductIdeasTracker /></TabsContent>
        <TabsContent value="tag-orders"><TagOrdersManager /></TabsContent>
        <TabsContent value="store-products"><StoreProductsManager /></TabsContent>
        <TabsContent value="qr-generator"><QRCodeGenerator /></TabsContent>
        <TabsContent value="barcode-generator"><BarcodeGenerator /></TabsContent>
        <TabsContent value="pos"><PointOfSale /></TabsContent>
        <TabsContent value="home-server"><HomeServerPanel /></TabsContent>
        <TabsContent value="launch-planner"><LaunchPlanner /></TabsContent>
        <TabsContent value="ai-infra"><AIInfrastructure /></TabsContent>
      </Tabs>
    </div>
  );
}
