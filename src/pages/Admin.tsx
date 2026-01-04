import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard,
  Package,
  Settings,
  Ticket,
  FileText,
  Shield,
  LogOut,
  RefreshCw,
  Eye,
  Loader2,
  Check,
  X,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { formatPrice } from "@/lib/products";

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    ordersToday: 0,
    revenueToday: 0,
    successful: 0,
    failed: 0,
    pending: 0,
  });

  // Coupon form
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "flat",
    value: 0,
    maxUses: 100,
  });

  // Check auth on load
  useEffect(() => {
    const authStatus = sessionStorage.getItem("admin_auth");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-login", {
        body: { username, password },
      });

      if (error) throw error;
      if (data.success) {
        sessionStorage.setItem("admin_auth", "true");
        setIsAuthenticated(true);
        fetchData();
        toast.success("Login successful");
      } else {
        toast.error("Invalid credentials");
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setOrders(ordersData || []);

      // Calculate stats
      const today = new Date().toISOString().split("T")[0];
      const todayOrders = (ordersData || []).filter(
        (o) => o.created_at.startsWith(today)
      );
      setStats({
        ordersToday: todayOrders.length,
        revenueToday: todayOrders
          .filter((o) => o.payment_status === "paid" || o.payment_status === "delivered")
          .reduce((acc, o) => acc + o.amount, 0),
        successful: (ordersData || []).filter((o) => o.payment_status === "delivered").length,
        failed: (ordersData || []).filter((o) => o.payment_status === "failed").length,
        pending: (ordersData || []).filter((o) => o.delivery_status === "pending" && o.payment_status === "paid").length,
      });

      // Fetch coupons
      const { data: couponsData } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      setCoupons(couponsData || []);

      // Fetch settings
      const { data: settingsData } = await supabase.from("site_settings").select("*");
      const settingsObj: any = {};
      (settingsData || []).forEach((s) => {
        settingsObj[s.key] = s.value;
      });
      setSettings(settingsObj);
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  const toggleMaintenance = async () => {
    const newValue = settings.maintenance_mode === "true" ? "false" : "true";
    const { error } = await supabase.functions.invoke("admin-action", {
      body: { action: "toggle_maintenance", value: newValue },
    });
    if (!error) {
      setSettings({ ...settings, maintenance_mode: newValue });
      toast.success(`Maintenance mode ${newValue === "true" ? "enabled" : "disabled"}`);
    }
  };

  const retryDelivery = async (orderId: string) => {
    const { error } = await supabase.functions.invoke("admin-action", {
      body: { action: "retry_delivery", orderId },
    });
    if (!error) {
      toast.success("Delivery retry initiated");
      fetchData();
    } else {
      toast.error("Retry failed");
    }
  };

  const createCoupon = async () => {
    if (!newCoupon.code) {
      toast.error("Please enter a coupon code");
      return;
    }
    const { error } = await supabase.functions.invoke("admin-action", {
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
      body: { action: "delete_coupon", couponId },
    });
    if (!error) {
      toast.success("Coupon deleted");
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs">Pending</span>,
      paid: <span className="bg-blue-500/20 text-blue-500 px-2 py-1 rounded text-xs">Paid</span>,
      delivered: <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded text-xs">Delivered</span>,
      failed: <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-xs">Failed</span>,
      refunded: <span className="bg-gray-500/20 text-gray-500 px-2 py-1 rounded text-xs">Refunded</span>,
    };
    return badges[status] || status;
  };

  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Admin Login - Axis Economy Store</title>
        </Helmet>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle className="font-display">Admin Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loginLoading}>
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login"}
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
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <span className="font-display font-bold">Admin Panel</span>
          </div>

          <nav className="space-y-2 flex-1">
            {[
              { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
              { id: "orders", icon: Package, label: "Orders" },
              { id: "coupons", icon: Ticket, label: "Coupons" },
              { id: "settings", icon: Settings, label: "Settings" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <Button variant="ghost" onClick={handleLogout} className="mt-auto">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-display text-2xl font-bold capitalize">{activeTab}</h1>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.ordersToday}</div>
                    <p className="text-sm text-muted-foreground">Orders Today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(stats.revenueToday)}
                    </div>
                    <p className="text-sm text-muted-foreground">Revenue Today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-500">{stats.successful}</div>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
                    <p className="text-sm text-muted-foreground">Pending Delivery</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 10).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.order_id}</TableCell>
                          <TableCell>{order.minecraft_username}</TableCell>
                          <TableCell>{order.product_name}</TableCell>
                          <TableCell>{formatPrice(order.amount)}</TableCell>
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
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Minecraft User</TableHead>
                      <TableHead>Discord</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.order_id}</TableCell>
                        <TableCell>{order.minecraft_username}</TableCell>
                        <TableCell>{order.discord_username}</TableCell>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell>{formatPrice(order.amount)}</TableCell>
                        <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                        <TableCell>{getStatusBadge(order.delivery_status)}</TableCell>
                        <TableCell>
                          {order.payment_status === "paid" && order.delivery_status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => retryDelivery(order.id)}>
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Coupons */}
          {activeTab === "coupons" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create Coupon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Code</Label>
                      <Input
                        placeholder="SUMMER10"
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <select
                        className="w-full h-10 px-3 rounded-md border bg-background"
                        value={newCoupon.type}
                        onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
                      >
                        <option value="flat">Flat (₹ off)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        value={newCoupon.value}
                        onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Uses</Label>
                      <Input
                        type="number"
                        value={newCoupon.maxUses}
                        onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button onClick={createCoupon}>Create Coupon</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Coupons</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Uses</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupons.map((coupon) => (
                        <TableRow key={coupon.id}>
                          <TableCell className="font-mono">{coupon.code}</TableCell>
                          <TableCell className="capitalize">{coupon.type}</TableCell>
                          <TableCell>
                            {coupon.type === "flat" ? formatPrice(coupon.value) : `${coupon.value}%`}
                          </TableCell>
                          <TableCell>
                            {coupon.uses_count} / {coupon.max_uses}
                          </TableCell>
                          <TableCell>
                            {coupon.is_active ? (
                              <span className="text-green-500">Active</span>
                            ) : (
                              <span className="text-red-500">Inactive</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="destructive" onClick={() => deleteCoupon(coupon.id)}>
                              <X className="w-3 h-3" />
                            </Button>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Maintenance Mode</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">
                      When enabled, the store will show a maintenance page to all users.
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenance_mode === "true"}
                    onCheckedChange={toggleMaintenance}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Admin Email</Label>
                    <Input value={settings.admin_email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input value={settings.support_email || ""} disabled />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Admin;
