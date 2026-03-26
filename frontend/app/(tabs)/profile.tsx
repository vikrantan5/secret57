import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../src/store/authStore";
import { useCartStore } from "../../src/store/cartStore";
import { useWishlistStore } from "../../src/store/wishlistStore";
import { useOrderStore } from "../../src/store/orderStore";
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "../../src/constants/theme";

interface MenuItemProps {
  icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  color?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  color = colors.primary,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View
          style={[styles.menuIconContainer, { backgroundColor: color + "15" }]}
        >
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
        {rightElement || (
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

interface StatCardProps {
  icon: any;
  count: number;
  label: string;
  color: string;
  onPress?: () => void; // ✅ optional
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  count,
  label,
  color,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  onPress?.(); // ✅ safe call
}}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[color, color + "CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statGradient}
      >
        <Ionicons name={icon} size={28} color={colors.surface} />
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { items: cartItems } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { orders } = useOrderStore();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/auth/role-selection" as any);
        },
      },
    ]);
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case "customer":
        return colors.customer;
      case "seller":
        return colors.seller;
      case "admin":
        return colors.admin;
      default:
        return colors.primary;
    }
  };

const getRoleGradient = () => {
  const roleColor = getRoleColor() || "#4F46E5"; // fallback
  return [roleColor, `${roleColor}CC`];
};

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header with Gradient */}
        <LinearGradient
          colors={getRoleGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.profileHeader}>
            {/* Avatar with Gradient Ring */}
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[colors.surface || "#fff", `${colors.surface || "#fff"}CC`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* User Info */}
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>

            {/* Role Badge */}
            <View style={styles.roleBadge}>
              <Ionicons
                name={
                  user?.role === "seller"
                    ? "storefront"
                    : user?.role === "admin"
                      ? "shield-checkmark"
                      : "person"
                }
                size={16}
                color={colors.surface}
              />
              <Text style={styles.roleText}>
                {user?.role?.charAt(0).toUpperCase()}
                {user?.role?.slice(1)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
       <StatCard
  icon="bag-handle-outline"
  count={orders?.length || 0}
  label="Orders"
  color={colors.primary}
  onPress={() => router.push("/orders" as any)}
/>

<StatCard
  icon="heart-outline"
  count={wishlistItems?.length || 0}
  label="Wishlist"
  color={colors.error}
  onPress={() => router.push("/wishlist" as any)}
/>
          <StatCard
            icon="calendar-outline"
            count={0}
            label="Bookings"
            color={colors.secondary}
            onPress={() => router.push("/(tabs)/bookings")}
          />
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.menuCard}>
            <MenuItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => router.push("/profile/edit" as any)}
              color={colors.primary}
            />
            <MenuItem
              icon="location-outline"
              title="Manage Addresses"
              subtitle="Add or edit delivery addresses"
              onPress={() => router.push("/profile/addresses" as any)}
              color={colors.secondary}
            />
            <MenuItem
              icon="card-outline"
              title="Payment Methods"
              subtitle="Saved cards and payment options"
              onPress={() => router.push("/profile/payments" as any)}
              color={colors.success}
            />
          </View>
        </View>

        {/* Orders & Activity */}
        {user?.role === "customer" && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Orders & Activity</Text>

            <View style={styles.menuCard}>
              <MenuItem
                icon="bag-handle-outline"
                title="My Orders"
                subtitle="Track and view your orders"
                onPress={() => router.push("/orders" as any)}
                color={colors.primary}
                rightElement={
                  (orders?.length || 0) > 0 ? (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{orders?.length || 0}</Text>
  </View>
) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textLight}
                    />
                  )
                }
              />
              <MenuItem
                icon="heart-outline"
                title="Wishlist"
                subtitle="Your saved items"
                onPress={() => router.push("/wishlist" as any)}
                color={colors.error}
                rightElement={
                  (wishlistItems?.length || 0) > 0 ? (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{wishlistItems?.length || 0}</Text>
  </View>
) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textLight}
                    />
                  )
                }
              />
              <MenuItem
                icon="star-outline"
                title="Reviews & Ratings"
                subtitle="Your reviews and ratings"
                onPress={() => router.push("/profile/reviews" as any)}
                color={colors.warning}
              />
            </View>
          </View>
        )}

        {/* Seller/Admin Section */}
        {user?.role === "seller" && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Seller Tools</Text>

            <View style={styles.menuCard}>
              <MenuItem
                icon="storefront-outline"
                title="Seller Dashboard"
                subtitle="Manage your products & services"
                onPress={() => router.push("/seller/dashboard" as any)}
                color={colors.seller}
              />
            </View>
          </View>
        )}

        {user?.role === "admin" && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Admin Tools</Text>

            <View style={styles.menuCard}>
              <MenuItem
                icon="shield-checkmark-outline"
                title="Admin Panel"
                subtitle="Manage platform settings"
                onPress={() => router.push("/admin/dashboard" as any)}
                color={colors.admin}
              />
            </View>
          </View>
        )}

        {/* Settings & Support */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings & Support</Text>

          <View style={styles.menuCard}>
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage notification preferences"
              onPress={() => router.push("/notifications" as any)}
              color={colors.info}
            />
            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get help with your account"
              onPress={() => router.push("/profile/help" as any)}
              color={colors.warning}
            />
            <MenuItem
              icon="settings-outline"
              title="Settings"
              subtitle="App preferences and privacy"
              onPress={() => router.push("/profile/settings" as any)}
              color={colors.textSecondary}
            />
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutButtonContent}>
              <Ionicons name="log-out-outline" size={24} color={colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>Version 1.0.0</Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    ...shadows.lg,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: "700",
  },
  userName: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
    marginBottom: spacing.md,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
  },
  roleText: {
    ...typography.bodySmall,
    color: colors.surface,
    fontWeight: "700",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: -spacing.xl,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.md,
  },
  statGradient: {
    padding: spacing.md,
    alignItems: "center",
  },
  statCount: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  menuSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: "700",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  menuCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.surface,
    fontWeight: "700",
  },
  logoutSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  logoutButton: {
    backgroundColor: colors.error + "15",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error + "30",
    overflow: "hidden",
  },
  logoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: "700",
  },
  versionText: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
