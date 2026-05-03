import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Platform,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
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

const { width } = Dimensions.get("window");

interface MenuItemProps {
  icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  color?: string;
  gradient?: string[];
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  color = "#8B5CF6",
  gradient,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
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
        <LinearGradient
          colors={gradient || [`${color}20`, `${color}10`]}
          style={styles.menuIconContainer}
        >
          <Ionicons name={icon} size={22} color={color} />
        </LinearGradient>
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
        {rightElement || (
          <View style={styles.chevronCircle}>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
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
  gradient?: string[];
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  count,
  label,
  color,
  gradient,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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
    <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.statCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradient || [color, `${color}CC`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statGradient}
        >
          <View style={styles.statIconCircle}>
            <Ionicons name={icon} size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.statCount}>{count}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { items: cartItems } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { orders, fetchOrders } = useOrderStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ Fix: Prefetch orders as soon as profile mounts so \"My Orders\" shows data on first click
  useEffect(() => {
    if (user?.id) {
      console.log('[Profile] Prefetching orders for user:', user.id);
      fetchOrders(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
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
      ]
    );
  };

  const getRoleGradient = () => {
    switch (user?.role) {
      case "customer":
        return ["#8B5CF6", "#7C3AED", "#6D28D9"];
      case "seller":
        return ["#10B981", "#059669", "#047857"];
      case "admin":
        return ["#EF4444", "#DC2626", "#B91C1C"];
      default:
        return ["#8B5CF6", "#7C3AED", "#6D28D9"];
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case "customer":
        return "#8B5CF6";
      case "seller":
        return "#10B981";
      case "admin":
        return "#EF4444";
      default:
        return "#8B5CF6";
    }
  };

  const getMenuGradient = (color: string) => {
    return [`${color}15`, `${color}08`];
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Premium Profile Header */}
        <LinearGradient
          colors={getRoleGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.profileHeader}>
            {/* Animated Avatar with Premium Ring */}
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
                  style={styles.avatarRing}
                >

                   {user?.avatar_url ? (
                    <Image
                      source={{ uri: user.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                  <LinearGradient
                    colors={["#FFFFFF", "#F3F4F6"]}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </Text>
                  </LinearGradient>
                    )}
                </LinearGradient>
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                </View>
              </View>
            </Animated.View>

            {/* User Info */}
            <Animated.Text style={[styles.userName, { opacity: fadeAnim }]}>
              {user?.name || "Guest User"}
            </Animated.Text>
            <Animated.Text style={[styles.userEmail, { opacity: fadeAnim }]}>
              {user?.email || "guest@example.com"}
            </Animated.Text>


                 {/* ✅ FIX: Display Gender and DOB if available */}
            {(user?.gender || user?.date_of_birth) && (
              <Animated.View style={[styles.userDetailsContainer, { opacity: fadeAnim }]}>
                {user?.gender && (
                  <View style={styles.userDetailChip}>
                    <Ionicons name="person-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.userDetailText}>
                      {user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
                    </Text>
                  </View>
                )}
                {user?.date_of_birth && (
                  <View style={styles.userDetailChip}>
                    <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.userDetailText}>
                      {new Date(user.date_of_birth).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Premium Role Badge */}
            <Animated.View style={[styles.roleBadge, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
                style={styles.roleBadgeGradient}
              >
                <Ionicons
                  name={
                    user?.role === "seller"
                      ? "storefront"
                      : user?.role === "admin"
                      ? "shield-checkmark"
                      : "person"
                  }
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.roleText}>
                  {user?.role?.charAt(0).toUpperCase()}
                  {user?.role?.slice(1)}
                </Text>
              </LinearGradient>
            </Animated.View>
          </View>
        </LinearGradient>

        {/* Premium Stats Cards */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
          <StatCard
            icon="bag-handle-outline"
            count={orders?.length || 0}
            label="Orders"
            gradient={["#8B5CF6", "#7C3AED"]}
            onPress={() => router.push("/orders" as any)}
          />
          <StatCard
            icon="heart-outline"
            count={wishlistItems?.length || 0}
            label="Wishlist"
            gradient={["#EF4444", "#DC2626"]}
            onPress={() => router.push("/wishlist" as any)}
          />
          <StatCard
            icon="calendar-outline"
            count={0}
            label="Bookings"
            gradient={["#F59E0B", "#D97706"]}
            onPress={() => router.push("/(tabs)/bookings")}
          />
        </Animated.View>

        {/* Account Section */}
        <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={["#1E1B4B", "#312E81"]}
              style={styles.sectionIcon}
            >
              <Ionicons name="person-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <View style={styles.menuCard}>
            <MenuItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => router.push("/profile/edit" as any)}
              color="#8B5CF6"
              gradient={getMenuGradient("#8B5CF6")}
            />
            <MenuItem
              icon="location-outline"
              title="Manage Addresses"
              subtitle="Add or edit delivery addresses"
              onPress={() => router.push("/profile/addresses" as any)}
              color="#10B981"
              gradient={getMenuGradient("#10B981")}
            />
            {/* <MenuItem
              icon="card-outline"
              title="Payment Methods"
              subtitle="Saved cards and payment options"
              onPress={() => router.push("/profile/payments" as any)}
              color="#F59E0B"
              gradient={getMenuGradient("#F59E0B")}
            /> */}
          </View>
        </Animated.View>

        {/* Orders & Activity Section */}
        {user?.role === "customer" && (
          <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={["#8B5CF6", "#7C3AED"]}
                style={styles.sectionIcon}
              >
                <Ionicons name="bag-handle-outline" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Orders & Activity</Text>
            </View>

            <View style={styles.menuCard}>
              <MenuItem
                icon="bag-handle-outline"
                title="My Orders"
                subtitle="Track and view your orders"
                onPress={() => router.push("/orders" as any)}
                color="#8B5CF6"
                gradient={getMenuGradient("#8B5CF6")}
                rightElement={
                  (orders?.length || 0) > 0 ? (
                    <LinearGradient
                      colors={["#8B5CF6", "#7C3AED"]}
                      style={styles.badge}
                    >
                      <Text style={styles.badgeText}>{orders?.length || 0}</Text>
                    </LinearGradient>
                  ) : undefined
                }
              />
              <MenuItem
                icon="heart-outline"
                title="Wishlist"
                subtitle="Your saved items"
                onPress={() => router.push("/wishlist" as any)}
                color="#EF4444"
                gradient={getMenuGradient("#EF4444")}
                rightElement={
                  (wishlistItems?.length || 0) > 0 ? (
                    <LinearGradient
                      colors={["#EF4444", "#DC2626"]}
                      style={styles.badge}
                    >
                      <Text style={styles.badgeText}>{wishlistItems?.length || 0}</Text>
                    </LinearGradient>
                  ) : undefined
                }
              />
              {/* <MenuItem
                icon="star-outline"
                title="Reviews & Ratings"
                subtitle="Your reviews and ratings"
                onPress={() => router.push("/profile/reviews" as any)}
                color="#F59E0B"
                gradient={getMenuGradient("#F59E0B")}
              /> */}
            </View>
          </Animated.View>
        )}

        {/* Seller Tools Section */}
        {user?.role === "seller" && (
          <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.sectionIcon}
              >
                <Ionicons name="storefront-outline" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Seller Tools</Text>
            </View>

            <View style={styles.menuCard}>
              <MenuItem
                icon="storefront-outline"
                title="Seller Dashboard"
                subtitle="Manage your products & services"
                onPress={() => router.push("/seller/dashboard" as any)}
                color="#10B981"
                gradient={getMenuGradient("#10B981")}
              />
            </View>
          </Animated.View>
        )}

        {/* Admin Tools Section */}
        {user?.role === "admin" && (
          <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={["#EF4444", "#DC2626"]}
                style={styles.sectionIcon}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>Admin Tools</Text>
            </View>

            <View style={styles.menuCard}>
              <MenuItem
                icon="shield-checkmark-outline"
                title="Admin Panel"
                subtitle="Manage platform settings"
                onPress={() => router.push("/admin/dashboard" as any)}
                color="#EF4444"
                gradient={getMenuGradient("#EF4444")}
              />
            </View>
          </Animated.View>
        )}

        {/* Settings & Support Section */}
        <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={["#6B7280", "#4B5563"]}
              style={styles.sectionIcon}
            >
              <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Settings & Support</Text>
          </View>

          <View style={styles.menuCard}>
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage notification preferences"
              onPress={() => router.push("/notifications" as any)}
              color="#3B82F6"
              gradient={getMenuGradient("#3B82F6")}
            />
            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get help with your account"
              onPress={() => router.push("/profile/help" as any)}
              color="#F59E0B"
              gradient={getMenuGradient("#F59E0B")}
            />
            <MenuItem
              icon="settings-outline"
              title="Settings"
              subtitle="App preferences and privacy"
              onPress={() => router.push("/profile/settings" as any)}
              color="#6B7280"
              gradient={getMenuGradient("#6B7280")}
            />
          </View>
        </Animated.View>

        {/* Premium Logout Button */}
        <Animated.View style={[styles.logoutSection, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient
              colors={["#FEE2E2", "#FECACA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={22} color="#DC2626" />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* App Version */}
        <Animated.Text style={[styles.versionText, { opacity: fadeAnim }]}>
          Version 1.0.0
        </Animated.Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerGradient: {
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  avatarContainer: {
    marginBottom: spacing.md,
    position: "relative",
  },
  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatar: {
    width: 102,
    height: 102,
    borderRadius: 51,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 44,
    fontWeight: "700",
    color: "#8B5CF6",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: spacing.xs,
  },
  userDetailsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  userDetailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  userDetailText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  roleBadge: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  roleBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statGradient: {
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  statCount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.5,
  },
  menuSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  chevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  logoutSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  logoutButton: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },
  versionText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: spacing.lg,
    letterSpacing: 0.5,
  },
});