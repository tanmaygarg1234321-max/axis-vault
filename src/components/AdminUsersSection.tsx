import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/products";
import {
  Search,
  Users,
  Mail,
  User,
  Clock,
  Package,
  Crown,
  Coins,
  Eye,
  CheckCircle2,
  XCircle,
  CreditCard,
} from "lucide-react";

interface UserData {
  email: string;
  minecraftUsernames: string[];
  discordUsernames: string[];
  totalSpent: number;
  orderCount: number;
  orders: any[];
}

interface AdminUsersSectionProps {
  orders: any[];
}

const AdminUsersSection = ({ orders }: AdminUsersSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Group orders by email/discord/minecraft username
  const getUsersFromOrders = (): UserData[] => {
    const userMap = new Map<string, UserData>();

    orders.forEach((order) => {
      // Use email as primary key if available, otherwise discord
      const key = order.user_email || order.discord_username || order.minecraft_username;
      
      if (userMap.has(key)) {
        const existing = userMap.get(key)!;
        existing.orderCount += 1;
        if (order.payment_status === "paid" || order.payment_status === "delivered") {
          existing.totalSpent += order.amount;
        }
        if (!existing.minecraftUsernames.includes(order.minecraft_username)) {
          existing.minecraftUsernames.push(order.minecraft_username);
        }
        if (!existing.discordUsernames.includes(order.discord_username)) {
          existing.discordUsernames.push(order.discord_username);
        }
        existing.orders.push(order);
      } else {
        userMap.set(key, {
          email: order.user_email || "N/A",
          minecraftUsernames: [order.minecraft_username],
          discordUsernames: [order.discord_username],
          totalSpent: (order.payment_status === "paid" || order.payment_status === "delivered") ? order.amount : 0,
          orderCount: 1,
          orders: [order],
        });
      }
    });

    return Array.from(userMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  };

  const users = getUsersFromOrders();

  // Filter users by search
  const filteredUsers = searchQuery.trim()
    ? users.filter((user) =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.minecraftUsernames.some(u => u.toLowerCase().includes(searchQuery.toLowerCase())) ||
        user.discordUsernames.some(u => u.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : users;

  const handleViewUser = (user: UserData) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: (
        <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-medium">
          <Clock className="w-3 h-3" /> Pending
        </span>
      ),
      paid: (
        <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs font-medium">
          <CreditCard className="w-3 h-3" /> Paid
        </span>
      ),
      delivered: (
        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-medium">
          <CheckCircle2 className="w-3 h-3" /> Delivered
        </span>
      ),
      failed: (
        <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs font-medium">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      ),
    };
    return badges[status] || <span className="text-xs text-muted-foreground">{status}</span>;
  };

  const getProductIcon = (type: string) => {
    switch (type) {
      case "rank":
        return <Crown className="w-4 h-4 text-primary" />;
      case "crate":
        return <Package className="w-4 h-4 text-purple-400" />;
      case "money":
        return <Coins className="w-4 h-4 text-yellow-400" />;
      default:
        return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <>
      {/* User Details Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              User Details
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    {selectedUser.email}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                  <p className="font-display font-bold text-xl text-primary">
                    {formatPrice(selectedUser.totalSpent)}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Minecraft Usernames</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.minecraftUsernames.map((u, i) => (
                      <span key={i} className="bg-primary/20 text-primary px-2 py-0.5 rounded text-sm">
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Discord Usernames</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.discordUsernames.map((u, i) => (
                      <span key={i} className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-sm">
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Orders History */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Purchase History ({selectedUser.orderCount} orders)
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {selectedUser.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((order) => (
                    <div key={order.id} className="p-3 bg-muted/20 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getProductIcon(order.product_type)}
                        <div>
                          <p className="font-medium text-sm">{order.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary text-sm">{formatPrice(order.amount)}</p>
                        {getStatusBadge(order.payment_status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Search Bar */}
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, Minecraft username, or Discord..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Minecraft</TableHead>
                  <TableHead className="text-muted-foreground">Discord</TableHead>
                  <TableHead className="text-muted-foreground">Orders</TableHead>
                  <TableHead className="text-muted-foreground">Total Spent</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => (
                  <TableRow key={index} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {user.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.minecraftUsernames.slice(0, 2).map((u, i) => (
                          <span key={i} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">
                            {u}
                          </span>
                        ))}
                        {user.minecraftUsernames.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{user.minecraftUsernames.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.discordUsernames[0]}
                    </TableCell>
                    <TableCell className="font-medium">{user.orderCount}</TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatPrice(user.totalSpent)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleViewUser(user)} className="gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AdminUsersSection;
