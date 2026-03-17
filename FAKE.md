"# 🔐 ADMIN ACCESS GUIDE - Hybrid Bazaar

## Admin Account Credentials

**Email:** `admin@hybridbazaar.com`  
**Password:** `admin123`

---

## How to Access Admin Dashboard

### Method 1: Through Mobile App

1. **Open the app** on your device/emulator
2. On the **Role Selection** screen, tap **\"Login as Customer\"**
3. Enter admin credentials:
   - Email: `admin@hybridbazaar.com`
   - Password: `admin123`
4. After successful login, you'll be **automatically redirected to Admin Dashboard** (if role is admin)

### Method 2: Direct Navigation

If you're already logged in with admin account, navigate to:
- Route: `/admin/dashboard`

---

## Admin Features

### 📊 Dashboard Overview
- View total platform revenue
- Monitor user statistics
- Track sellers, products, and orders
- Quick access to pending approvals

### ✅ Seller Management
- **Pending Approvals:** Review and approve/reject new seller registrations
- **All Sellers:** View complete list of approved sellers
- **Seller Actions:**
  - Approve pending sellers
  - Reject with reason
  - Suspend sellers (coming in next phase)

### 👥 User Management
- View all registered users
- Filter by role (customer/seller/admin)
- Monitor user activity

### 📦 Product Management
- View all products across all sellers
- Remove illegal or inappropriate products
- Monitor product listings

### 📋 Order Management
- View all orders from all sellers
- Track order status
- Monitor platform transactions

### 📁 Category Management
- Add new categories
- Edit existing categories
- Set category types (ecommerce/booking/hybrid)

---

## Test Accounts Available

### 👤 Customer Accounts
- **Customer 1:** `customer1@test.com` / `customer123`
- **Customer 2:** `customer2@test.com` / `customer123`

### 🏪 Seller Accounts (All Approved)
1. **Mehndi Magic by Meera**
   - Email: `seller1@test.com` / Password: `seller123`
   - Category: Mehndi Artist

2. **Glamour Studio by Anjali**
   - Email: `seller2@test.com` / Password: `seller123`
   - Category: Makeup Artist

3. **Ritu Fashion House**
   - Email: `seller3@test.com` / Password: `seller123`
   - Category: Fashion Designer

4. **Sweet Delights by Kavita**
   - Email: `seller4@test.com` / Password: `seller123`
   - Category: Home Bakers

5. **Crafty Creations by Pooja**
   - Email: `seller5@test.com` / Password: `seller123`
   - Category: Handmade Gifts

---

## Sample Data Populated

### Categories (7 total)
- ✋ Mehndi Artist
- 💄 Makeup Artist
- 👗 Fashion Designer
- 🍰 Home Bakers
- 🎁 Handmade Gifts
- 🎉 Event Manager
- 📚 Private Tutor

### Products
- **Fashion Designer:** Designer sarees, lehengas, kurtis
- **Home Bakers:** Cakes, cupcakes, custom baked goods
- **Handmade Gifts:** Photo frames, gift hampers

### Services
- **Mehndi Artist:** Bridal mehndi, party mehndi
- **Makeup Artist:** Bridal makeup, party makeup
- **Event Manager:** Wedding planning
- **Private Tutor:** Subject tutoring

---

## Admin Permissions

✅ **Can Do:**
- Approve/reject seller registrations
- View all users, sellers, products, orders
- Manage categories
- Remove inappropriate content
- View platform analytics
- Monitor all transactions

❌ **Cannot Do (Yet - Coming in Next Phases):**
- Edit user profiles directly
- Process refunds
- Suspend users temporarily
- Send notifications
- Generate reports

---

## Navigation Routes

```
/admin/dashboard           → Main admin dashboard
/admin/pending-sellers     → Pending seller approvals
/admin/users              → All users list (coming soon)
/admin/sellers            → All sellers list (coming soon)
/admin/products           → All products list (coming soon)
/admin/orders             → All orders list (coming soon)
/admin/categories         → Category management (coming soon)
```

---

## Troubleshooting

### Issue: Cannot login with admin credentials
**Solution:** 
1. Make sure you ran the seed script: `node /app/seed-data.js`
2. Check if admin user exists in database
3. Verify you selected \"Customer\" role (admin logs in through customer flow)

### Issue: Redirected to home instead of admin dashboard
**Solution:**
- Check user role in database (should be 'admin')
- Clear app data and login again

### Issue: Admin routes showing \"Unmatched Route\"
**Solution:**
- Restart the frontend service: `sudo supervisorctl restart frontend`
- Check if admin routes are registered in `_layout.tsx`

---

## Security Notes

⚠️ **IMPORTANT:** These are test credentials. In production:
- Change all default passwords
- Implement proper authentication
- Add two-factor authentication for admin
- Use environment variables for sensitive data
- Implement role-based access control (RBAC)
- Add audit logs for admin actions

---

## Next Steps

After logging in as admin, you can:
1. ✅ Test the seller approval workflow
2. ✅ Browse all products and services
3. ✅ Monitor platform activity
4. ⏳ Wait for remaining admin features in upcoming phases

---

📧 **Need Help?** Contact support or check the documentation.
"