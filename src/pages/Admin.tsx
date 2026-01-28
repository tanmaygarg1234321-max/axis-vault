import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Package,
  Settings,
  Ticket,
  FileText,
  Shield,
  LogOut,
  RefreshCw,
  Loader2,
  X,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  Server,
  CreditCard,
  Terminal,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Trash2,
  RotateCcw,
  Edit2,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { formatPrice } from "@/lib/products";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, CartesianGrid, BarChart, Bar, XAxis, YAxis } from "recharts";
import AdminUsersSection from "@/components/AdminUsersSection";

interface LogEntry {
  id: string;
  type: string;
  message: string;
  order_id: string | null;
  metadata: any;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Password change state
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [maintenanceToggling, setMaintenanceToggling] = useState(false);
  const [logFilter, setLogFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [retryingOrder, setRetryingOrder] = useState<string | null>(null);
  
  // Clear data dialog
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearPassword, setClearPassword] = useState("");
  const [clearLoading, setClearLoading] = useState(false);

  const [stats, setStats] = useState({
    ordersToday: 0,
    revenueToday: 0,
    totalRevenue: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    totalOrders: 0,
  });

  // Coupon form
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "flat",
    value: 0,
    maxUses: 100,
  });

  // Coupon edit state
  const [editingCoupon, setEditingCoupon] = useState<string | null>(null);
  const [editCouponData, setEditCouponData] = useState({
    code: "",
    type: "flat",
    value: 0,
    max_uses: 100,
  });

  // Get admin token for API calls
  const getAdminToken = () => sessionStorage.getItem("admin_token");

  const getAdminHeaders = () => {
    const token = getAdminToken();
    return token ? { "x-admin-token": token } : undefined;
  };

  // Check auth on load - validate token exists
  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    if (!token) return;

    const b64UrlToB64 = (str: string) => {
      const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      return base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    };

    try {
      const [headerPart, payloadPart] = token.split(".");
      if (!headerPart || !payloadPart) throw new Error("Invalid token format");

      const header = JSON.parse(atob(b64UrlToB64(headerPart)));
      // Force re-login if user has an old token from a previous signing algorithm
      if (header?.alg !== "HS256") {
        sessionStorage.removeItem("admin_token");
        sessionStorage.removeItem("admin_username");
        return;
      }

      const payload = JSON.parse(atob(b64UrlToB64(payloadPart)));
      if (payload.exp && payload.exp * 1000 > Date.now()) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        // Token expired
        sessionStorage.removeItem("admin_token");
        sessionStorage.removeItem("admin_username");
      }
    } catch {
      // Invalid token format
      sessionStorage.removeItem("admin_token");
      sessionStorage.removeItem("admin_username");
    }
  }, []);


  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter username and password");
      return;
    }

    // Basic input validation
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
      toast.error("Invalid username format");
      return;
    }

    setLoginLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-login", {
        body: { username, password },
      });

      if (error) throw error;
      if (data.success && data.token) {
        sessionStorage.setItem("admin_token", data.token);
        sessionStorage.setItem("admin_username", username);
        setIsAuthenticated(true);
        
        // Check if password change is required
        if (data.mustChangePassword) {
          setMustChangePassword(true);
          setShowPasswordChangeDialog(true);
          setCurrentPassword(password); // Pre-fill current password
          toast.warning("You must change your password before continuing");
        } else {
          setPassword(""); // Clear password from state
          fetchData();
          toast.success("Login successful");
        }
      } else {
        toast.error(data.error || "Invalid credentials");
      }
    } catch (err: any) {
      toast.error("Login failed");
    }
    setLoginLoading(false);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'/`~]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      toast.error("Password must contain uppercase, lowercase, number, and special character");
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke("admin-login", {
        headers: { Authorization: `Bearer ${token}` },
        body: { 
          action: "change_password",
          currentPassword,
          newPassword,
        },
      });

      if (error) throw error;
      if (data.success) {
        // Update token with new one
        if (data.token) {
          sessionStorage.setItem("admin_token", data.token);
        }
        setShowPasswordChangeDialog(false);
        setMustChangePassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPassword("");
        fetchData();
        toast.success("Password changed successfully!");
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    }
    setPasswordChangeLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_username");
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) {
        toast.error("Session expired. Please log in again.");
        handleLogout();
        return;
      }

      // Fetch all admin data through edge function (bypasses RLS properly)
      const { data: response, error } = await supabase.functions.invoke("admin-data", {
        headers: getAdminHeaders(),
        body: { dataType: "all" },
      });

      if (error) throw error;
      if (!response?.success) throw new Error(response?.error || "Failed to fetch data");

      const { orders: ordersData, logs: logsData, coupons: couponsData, settings: settingsData } = response.data;

      setOrders(ordersData || []);

      // Calculate stats
      const today = new Date().toISOString().split("T")[0];
      const todayOrders = (ordersData || []).filter(
        (o: any) => o.created_at.startsWith(today)
      );
      const paidOrders = (ordersData || []).filter((o: any) => o.payment_status === "paid" || o.payment_status === "delivered");
      
      setStats({
        ordersToday: todayOrders.length,
        revenueToday: todayOrders
          .filter((o: any) => o.payment_status === "paid" || o.payment_status === "delivered")
          .reduce((acc: number, o: any) => acc + o.amount, 0),
        totalRevenue: paidOrders.reduce((acc: number, o: any) => acc + o.amount, 0),
        successful: (ordersData || []).filter((o: any) => o.payment_status === "delivered").length,
        failed: (ordersData || []).filter((o: any) => o.payment_status === "failed").length,
        pending: (ordersData || []).filter((o: any) => o.delivery_status === "pending" && (o.payment_status === "paid" || o.payment_status === "delivered")).length,
        totalOrders: (ordersData || []).length,
      });

      setCoupons(couponsData || []);
      setLogs(logsData || []);

      // Process settings
      const settingsObj: any = {};
      (settingsData || []).forEach((s: any) => {
        settingsObj[s.key] = s.value;
      });
      setSettings(settingsObj);
      
      toast.success("Data refreshed");
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error(err?.message || "Failed to fetch data");
    }
    setLoading(false);
  };

  const toggleMaintenance = async (checked: boolean) => {
    const newValue = checked ? "true" : "false";
    const token = getAdminToken();

    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    setMaintenanceToggling(true);
    try {
    const { data, error } = await supabase.functions.invoke("admin-action", {
        headers: getAdminHeaders(),
        body: { action: "toggle_maintenance", value: newValue },
      });

      if (error) throw error;
    if (data?.error) throw new Error(data.error);

      setSettings((prev: any) => ({ ...prev, maintenance_mode: newValue }));
      toast.success(
        `Maintenance mode ${newValue === "true" ? "enabled" : "disabled"}`
      );
    } catch (err: any) {
    console.error("Maintenance toggle error:", err);
    toast.error(err?.message || "Failed to toggle maintenance mode. Check console for details.");
    } finally {
      setMaintenanceToggling(false);
    }
  };

  const retryDelivery = async (orderId: string) => {
    setRetryingOrder(orderId);
    try {
      const { error } = await supabase.functions.invoke("admin-action", {
        headers: getAdminHeaders(),
        body: { action: "retry_delivery", orderId },
      });
      if (error) throw error;
      toast.success("Delivery retry successful!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Retry failed - check RCON connection");
    }
    setRetryingOrder(null);
  };

  const createCoupon = async () => {
    if (!newCoupon.code) {
      toast.error("Please enter a coupon code");
      return;
    }
    const { error } = await supabase.functions.invoke("admin-action", {
      headers: getAdminHeaders(),
      body: {
        action: "create_coupon",
        coupon: {
          code: newCoupon.code.toUpperCase(),
          type: newCoupon.type,
          value: newCoupon.value,
          max_uses: newCoupon.maxUses,
        },
      },
    });
    if (!error) {
      toast.success("Coupon created");
      setNewCoupon({ code: "", type: "flat", value: 0, maxUses: 100 });
      fetchData();
    } else {
      toast.error("Failed to create coupon");
    }
  };

  const deleteCoupon = async (couponId: string) => {
    const { error } = await supabase.functions.invoke("admin-action", {
      headers: getAdminHeaders(),
      body: { action: "delete_coupon", couponId },
    });
    if (!error) {
      toast.success("Coupon deleted");
      fetchData();
    }
  };

  const startEditCoupon = (coupon: any) => {
    setEditingCoupon(coupon.id);
    setEditCouponData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      max_uses: coupon.max_uses,
    });
  };

  const saveEditCoupon = async (couponId: string) => {
    const { error } = await supabase.functions.invoke("admin-action", {
      headers: getAdminHeaders(),
      body: { 
        action: "update_coupon", 
        couponId,
        updates: {
          code: editCouponData.code.toUpperCase(),
          type: editCouponData.type,
          value: editCouponData.value,
          max_uses: editCouponData.max_uses,
        },
      },
    });
    if (!error) {
      toast.success("Coupon updated");
      setEditingCoupon(null);
      fetchData();
    } else {
      toast.error("Failed to update coupon");
    }
  };

  const toggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
    const { error } = await supabase.functions.invoke("admin-action", {
      headers: getAdminHeaders(),
      body: { 
        action: "toggle_coupon_status", 
        couponId,
        isActive: !currentStatus,
      },
    });
    if (!error) {
      toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchData();
    }
  };

  const handleClearData = async () => {
    if (!clearPassword) {
      toast.error("Please enter your password");
      return;
    }
    
    if (settings.maintenance_mode !== "true") {
      toast.error("Maintenance mode must be enabled first");
      return;
    }

    setClearLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-action", {
        headers: getAdminHeaders(),
        body: { 
          action: "clear_data", 
          password: clearPassword 
        },
      });
      if (error) throw error;
      toast.success("All data cleared successfully");
      setShowClearDialog(false);
      setClearPassword("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to clear data - check password");
    }
    setClearLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: (
        <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-full text-xs font-medium">
          <Clock className="w-3 h-3" /> Pending
        </span>
      ),
      paid: (
        <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full text-xs font-medium">
          <CreditCard className="w-3 h-3" /> Paid
        </span>
      ),
      delivered: (
        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium">
          <CheckCircle2 className="w-3 h-3" /> Delivered
        </span>
      ),
      failed: (
        <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full text-xs font-medium">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      ),
      refunded: (
        <span className="inline-flex items-center gap-1 bg-gray-500/20 text-gray-400 px-2.5 py-1 rounded-full text-xs font-medium">
          <ArrowDownRight className="w-3 h-3" /> Refunded
        </span>
      ),
    };
    return badges[status] || <span className="text-xs text-muted-foreground">{status}</span>;
  };

  const getLogIcon = (type: string) => {
    const icons: any = {
      payment: <CreditCard className="w-4 h-4 text-blue-400" />,
      webhook: <Server className="w-4 h-4 text-purple-400" />,
      rcon: <Terminal className="w-4 h-4 text-emerald-400" />,
      delivery: <Package className="w-4 h-4 text-green-400" />,
      error: <AlertTriangle className="w-4 h-4 text-red-400" />,
      admin: <Shield className="w-4 h-4 text-yellow-400" />,
      info: <Activity className="w-4 h-4 text-cyan-400" />,
    };
    return icons[type] || <Activity className="w-4 h-4 text-muted-foreground" />;
  };

  const getLogBgColor = (type: string) => {
    const colors: any = {
      payment: "bg-blue-500/10 border-blue-500/20",
      webhook: "bg-purple-500/10 border-purple-500/20",
      rcon: "bg-emerald-500/10 border-emerald-500/20",
      delivery: "bg-green-500/10 border-green-500/20",
      error: "bg-red-500/10 border-red-500/20",
      admin: "bg-yellow-500/10 border-yellow-500/20",
      info: "bg-cyan-500/10 border-cyan-500/20",
    };
    return colors[type] || "bg-muted/50 border-border";
  };

  // Chart data
  const orderStatusData = [
    { name: "Delivered", value: stats.successful, color: "#10b981" },
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "Failed", value: stats.failed, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const productTypeData = orders.reduce((acc: any[], order) => {
    const existing = acc.find(item => item.name === order.product_type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: order.product_type, value: 1 });
    }
    return acc;
  }, []);

  const productColors: any = {
    rank: "#10b981",
    crate: "#8b5cf6",
    money: "#f59e0b",
  };

  const logTypeData = logs.reduce((acc: any[], log) => {
    const existing = acc.find(item => item.name === log.type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: log.type, value: 1 });
    }
    return acc;
  }, []);

  const logColors: any = {
    payment: "#3b82f6",
    webhook: "#8b5cf6",
    rcon: "#10b981",
    delivery: "#22c55e",
    error: "#ef4444",
    admin: "#f59e0b",
    info: "#06b6d4",
  };

  // Filter logs
  const filteredLogs = logFilter === "all" 
    ? logs 
    : logs.filter(log => log.type === logFilter);

  const uniqueLogTypes = [...new Set(logs.map(log => log.type))];

  // Filter orders by search
  const filteredOrders = orderSearch.trim()
    ? orders.filter(order => 
        order.order_id.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.minecraft_username.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.discord_username.toLowerCase().includes(orderSearch.toLowerCase())
      )
    : orders;

  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Admin Login - Axis Economy Store</title>
        </Helmet>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-grid-pattern opacity-20" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
          
          <Card className="w-full max-w-md relative z-10 bg-card/90 backdrop-blur-xl border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">Admin Panel</CardTitle>
              <CardDescription>Enter your credentials to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-background/50"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <Button className="w-full mt-2" onClick={handleLogin} disabled={loginLoading}>
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {loginLoading ? "Signing in..." : "Sign In"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Panel - Axis Economy Store</title>
      </Helmet>
      
      {/* Clear Data Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Clear All Data
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all orders, logs, and active ranks. This action cannot be undone.
              Maintenance mode must be enabled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-sm">
                Maintenance mode: {settings.maintenance_mode === "true" ? (
                  <span className="text-emerald-400 font-medium">Enabled</span>
                ) : (
                  <span className="text-red-400 font-medium">Disabled - Enable first!</span>
                )}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Enter your admin password to confirm</Label>
              <Input
                type="password"
                value={clearPassword}
                onChange={(e) => setClearPassword(e.target.value)}
                placeholder="Admin password"
                className="bg-background/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClearData}
              disabled={clearLoading || settings.maintenance_mode !== "true"}
            >
              {clearLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Clear All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordChangeDialog} onOpenChange={(open) => {
        // Don't allow closing if password change is required
        if (!open && mustChangePassword) {
          toast.error("You must change your password before continuing");
          return;
        }
        setShowPasswordChangeDialog(open);
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              {mustChangePassword 
                ? "Your password must be changed before you can continue. Please set a strong password."
                : "Update your admin password."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {mustChangePassword && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <span className="text-sm">
                  You are using the default password. Please change it immediately.
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                Must be 12+ characters with uppercase, lowercase, number, and special character.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-background/50"
                onKeyDown={(e) => e.key === "Enter" && handlePasswordChange()}
              />
            </div>
          </div>
          <DialogFooter>
            {!mustChangePassword && (
              <Button variant="outline" onClick={() => setShowPasswordChangeDialog(false)}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handlePasswordChange}
              disabled={passwordChangeLoading}
            >
              {passwordChangeLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <div className="w-72 bg-card/50 backdrop-blur-xl border-r border-border/50 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-display font-bold text-lg">Axis Admin</span>
              <p className="text-xs text-muted-foreground">Management Console</p>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {[
              { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", description: "Overview & stats" },
              { id: "orders", icon: Package, label: "Orders", description: "Manage orders" },
              { id: "users", icon: Users, label: "Users", description: "Customer info" },
              { id: "logs", icon: FileText, label: "Logs", description: "System logs" },
              { id: "coupons", icon: Ticket, label: "Coupons", description: "Discount codes" },
              { id: "settings", icon: Settings, label: "Settings", description: "Configuration" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className={`text-xs ${activeTab === item.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t border-border/50">
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-auto bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="font-display text-3xl font-bold capitalize">{activeTab}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {activeTab === "dashboard" && "Overview of your store performance"}
                  {activeTab === "orders" && "View and manage all customer orders"}
                  {activeTab === "users" && "View customer information and purchase history"}
                  {activeTab === "logs" && "System activity and event logs"}
                  {activeTab === "coupons" && "Create and manage discount codes"}
                  {activeTab === "settings" && "Configure store settings"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                          <div className="text-3xl font-bold text-emerald-400">
                            {formatPrice(stats.totalRevenue)}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <DollarSign className="w-6 h-6 text-emerald-400" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-xs text-emerald-400">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{formatPrice(stats.revenueToday)} today</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                          <div className="text-3xl font-bold text-blue-400">{stats.totalOrders}</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                          <Package className="w-6 h-6 text-blue-400" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-xs text-blue-400">
                        <TrendingUp className="w-3 h-3" />
                        <span>{stats.ordersToday} orders today</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Successful</p>
                          <div className="text-3xl font-bold text-green-400">{stats.successful}</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-xs text-green-400">
                        <span>{stats.totalOrders > 0 ? Math.round((stats.successful / stats.totalOrders) * 100) : 0}% success rate</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Pending Delivery</p>
                          <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                          <Clock className="w-6 h-6 text-yellow-400" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-xs text-red-400">
                        <XCircle className="w-3 h-3" />
                        <span>{stats.failed} failed</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="bg-card/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-lg font-display flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Order Status Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {orderStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={orderStatusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {orderStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(220 18% 8%)', 
                                border: '1px solid hsl(220 16% 16%)',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          No order data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-lg font-display flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        Products Sold by Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {productTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={productTypeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 20%)" />
                            <XAxis dataKey="name" stroke="hsl(220 10% 60%)" fontSize={12} />
                            <YAxis stroke="hsl(220 10% 60%)" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(220 18% 8%)', 
                                border: '1px solid hsl(220 16% 16%)',
                                borderRadius: '8px'
                              }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {productTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={productColors[entry.name] || "#8884d8"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          No product data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent orders */}
                <Card className="bg-card/50 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-display">Recent Orders</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("orders")}>
                      View All <ArrowUpRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead className="text-muted-foreground">Order ID</TableHead>
                          <TableHead className="text-muted-foreground">User</TableHead>
                          <TableHead className="text-muted-foreground">Product</TableHead>
                          <TableHead className="text-muted-foreground">Amount</TableHead>
                          <TableHead className="text-muted-foreground">Status</TableHead>
                          <TableHead className="text-muted-foreground">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.slice(0, 8).map((order) => (
                          <TableRow key={order.id} className="border-border/30 hover:bg-muted/30">
                            <TableCell className="font-mono text-xs text-muted-foreground">{order.order_id}</TableCell>
                            <TableCell className="font-medium">{order.minecraft_username}</TableCell>
                            <TableCell>{order.product_name}</TableCell>
                            <TableCell className="font-semibold text-primary">{formatPrice(order.amount)}</TableCell>
                            <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Orders */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                {/* Search Bar */}
                <Card className="bg-card/50 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by Order ID, Minecraft username, or Discord..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="pl-10 bg-background/50"
                        />
                      </div>
                      <Button variant="outline" onClick={() => setOrderSearch("")}>
                        Clear
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur">
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead className="text-muted-foreground">Order ID</TableHead>
                          <TableHead className="text-muted-foreground">Minecraft</TableHead>
                          <TableHead className="text-muted-foreground">Discord</TableHead>
                          <TableHead className="text-muted-foreground">Product</TableHead>
                          <TableHead className="text-muted-foreground">Amount</TableHead>
                          <TableHead className="text-muted-foreground">Payment</TableHead>
                          <TableHead className="text-muted-foreground">Delivery</TableHead>
                          <TableHead className="text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id} className="border-border/30 hover:bg-muted/30">
                            <TableCell className="font-mono text-xs text-muted-foreground">{order.order_id}</TableCell>
                            <TableCell className="font-medium">{order.minecraft_username}</TableCell>
                            <TableCell className="text-muted-foreground">{order.discord_username}</TableCell>
                            <TableCell>{order.product_name}</TableCell>
                            <TableCell className="font-semibold text-primary">{formatPrice(order.amount)}</TableCell>
                            <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                            <TableCell>{getStatusBadge(order.delivery_status)}</TableCell>
                            <TableCell>
                              {(order.payment_status === "paid" && order.delivery_status === "pending") || 
                               (order.payment_status === "delivered" && order.delivery_status === "pending") ? (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => retryDelivery(order.id)} 
                                  disabled={retryingOrder === order.id}
                                  className="gap-1"
                                >
                                  {retryingOrder === order.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                  Retry
                                </Button>
                              ) : order.command_executed ? (
                                <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px] block" title={order.command_executed}>
                                  {order.command_executed}
                                </span>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredOrders.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No orders found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Users */}
            {activeTab === "users" && (
              <AdminUsersSection orders={orders} />
            )}

            {/* Logs */}
            {activeTab === "logs" && (
              <div className="space-y-6">
                {/* Log Stats */}
                <div className="grid lg:grid-cols-3 gap-6">
                  <Card className="bg-card/50 backdrop-blur lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg font-display flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Log Type Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {logTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={logTypeData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {logTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={logColors[entry.name] || "#8884d8"} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(220 18% 8%)', 
                                border: '1px solid hsl(220 16% 16%)',
                                borderRadius: '8px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                          No log data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-lg font-display">Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Logs</span>
                        <span className="font-bold">{logs.length}</span>
                      </div>
                      {logTypeData.map((type) => (
                        <div key={type.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getLogIcon(type.name)}
                            <span className="text-sm capitalize">{type.name}</span>
                          </div>
                          <span className="font-medium">{type.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Log Filter & List */}
                <Card className="bg-card/50 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-display flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      System Logs
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <select
                        className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                      >
                        <option value="all">All Logs</option>
                        {uniqueLogTypes.map((type) => (
                          <option key={type} value={type} className="capitalize">{type}</option>
                        ))}
                      </select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`p-4 rounded-xl border ${getLogBgColor(log.type)} transition-all hover:scale-[1.01]`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">{getLogIcon(log.type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {log.type}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {new Date(log.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm font-medium">{log.message}</p>
                                {log.order_id && (
                                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                                    Order: {log.order_id}
                                  </p>
                                )}
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                      View Details
                                    </summary>
                                    <pre className="mt-2 p-2 bg-background/50 rounded text-xs overflow-x-auto">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No logs found</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Coupons */}
            {activeTab === "coupons" && (
              <div className="space-y-6">
                <Card className="bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg font-display flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-primary" />
                      Create New Coupon
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Coupon Code</Label>
                        <Input
                          placeholder="SUMMER10"
                          value={newCoupon.code}
                          onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                          className="bg-background/50 uppercase"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Discount Type</Label>
                        <select
                          className="w-full h-10 px-3 rounded-md border border-border bg-background/50"
                          value={newCoupon.type}
                          onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
                        >
                          <option value="flat">Flat (₹ off)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Value</Label>
                        <Input
                          type="number"
                          value={newCoupon.value}
                          onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Max Uses</Label>
                        <Input
                          type="number"
                          value={newCoupon.maxUses}
                          onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: Number(e.target.value) })}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <Button onClick={createCoupon} className="gap-2">
                      <Ticket className="w-4 h-4" />
                      Create Coupon
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg font-display">Active Coupons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead className="text-muted-foreground">Code</TableHead>
                          <TableHead className="text-muted-foreground">Type</TableHead>
                          <TableHead className="text-muted-foreground">Value</TableHead>
                          <TableHead className="text-muted-foreground">Uses</TableHead>
                          <TableHead className="text-muted-foreground">Status</TableHead>
                          <TableHead className="text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupons.map((coupon) => (
                          <TableRow key={coupon.id} className="border-border/30 hover:bg-muted/30">
                            <TableCell>
                              {editingCoupon === coupon.id ? (
                                <Input
                                  value={editCouponData.code}
                                  onChange={(e) => setEditCouponData({ ...editCouponData, code: e.target.value })}
                                  className="w-24 h-8 uppercase bg-background/50"
                                />
                              ) : (
                                <span className="font-mono font-bold">{coupon.code}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingCoupon === coupon.id ? (
                                <select
                                  className="h-8 px-2 rounded-md border border-border bg-background/50 text-sm"
                                  value={editCouponData.type}
                                  onChange={(e) => setEditCouponData({ ...editCouponData, type: e.target.value })}
                                >
                                  <option value="flat">Flat</option>
                                  <option value="percentage">%</option>
                                </select>
                              ) : (
                                <span className="capitalize">{coupon.type}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingCoupon === coupon.id ? (
                                <Input
                                  type="number"
                                  value={editCouponData.value}
                                  onChange={(e) => setEditCouponData({ ...editCouponData, value: Number(e.target.value) })}
                                  className="w-20 h-8 bg-background/50"
                                />
                              ) : (
                                <span className="font-semibold text-primary">
                                  {coupon.type === "flat" ? formatPrice(coupon.value) : `${coupon.value}%`}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingCoupon === coupon.id ? (
                                <Input
                                  type="number"
                                  value={editCouponData.max_uses}
                                  onChange={(e) => setEditCouponData({ ...editCouponData, max_uses: Number(e.target.value) })}
                                  className="w-20 h-8 bg-background/50"
                                />
                              ) : (
                                <>
                                  <span className="font-mono">{coupon.uses_count || 0}</span>
                                  <span className="text-muted-foreground"> / {coupon.max_uses}</span>
                                </>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                                className={`gap-1 ${coupon.is_active ? 'text-emerald-400 hover:text-emerald-300' : 'text-red-400 hover:text-red-300'}`}
                              >
                                {coupon.is_active ? (
                                  <>
                                    <ToggleRight className="w-4 h-4" /> Active
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4" /> Inactive
                                  </>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {editingCoupon === coupon.id ? (
                                  <>
                                    <Button size="sm" variant="default" onClick={() => saveEditCoupon(coupon.id)} className="gap-1 h-8">
                                      <Save className="w-3 h-3" /> Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingCoupon(null)} className="h-8">
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => startEditCoupon(coupon)} className="gap-1 h-8">
                                      <Edit2 className="w-3 h-3" /> Edit
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => deleteCoupon(coupon.id)} className="gap-1 h-8">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings */}
            {activeTab === "settings" && (
              <div className="space-y-6 max-w-2xl">
                <Card className="bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg font-display flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      Maintenance Mode
                    </CardTitle>
                    <CardDescription>
                      Enable maintenance mode to prevent customers from accessing the store
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Store Offline</p>
                      <p className="text-sm text-muted-foreground">
                        When enabled, visitors will see a maintenance page
                      </p>
                    </div>
                    <Switch
                      checked={settings.maintenance_mode === "true"}
                      onCheckedChange={toggleMaintenance}
                      disabled={maintenanceToggling}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg font-display flex items-center gap-2">
                      <Server className="w-5 h-5 text-primary" />
                      Server Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <span className="text-muted-foreground">RCON Status</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          Connected
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <span className="text-muted-foreground">Payment Gateway</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          Razorpay Active
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur border-red-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg font-display flex items-center gap-2 text-red-400">
                      <Trash2 className="w-5 h-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Irreversible actions that affect all data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div>
                        <p className="font-medium">Clear All Data</p>
                        <p className="text-sm text-muted-foreground">
                          Delete all orders, logs, and active ranks. Requires maintenance mode.
                        </p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={() => setShowClearDialog(true)}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg font-display flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Admin Email</Label>
                      <Input value={settings.admin_email || "admin@axisstore.com"} disabled className="bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Support Email</Label>
                      <Input value={settings.support_email || "support@axisstore.com"} disabled className="bg-background/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Admin;
