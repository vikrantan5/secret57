# ServiceHub - Phase 1 Foundation

## Multi-Vendor Marketplace & Service Booking Platform

**Version:** 1.0.0 (Phase 1)
**Tech Stack:** React Native (Expo), TypeScript, Supabase, Zustand

---

## 📱 About ServiceHub

ServiceHub is a hybrid platform combining:
- **Ecommerce Marketplace** - Browse and purchase products
- **Service Booking Platform** - Book services from verified providers
- **Multi-Vendor System** - Supports Customers, Sellers, and Admin roles

### Phase 1 Features (Current)

✅ **Completed Features:**
- Professional app architecture and folder structure
- Supabase backend integration
- Authentication system (Login/Register)
- Role-based access (Customer/Seller)
- Navigation system (Auth Stack + Tab Navigation)
- State management with Zustand
- Modern UI with professional blue/purple theme
- Reusable components (Button, Input, Cards)
- Core screens:
  - Splash Screen
  - Role Selection
  - Login/Register
  - Home (with categories preview)
  - Profile
  - Categories (placeholder)
  - Bookings (placeholder)
  - Cart (placeholder)

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or later)
- Yarn package manager
- Expo CLI
- Supabase account

### Installation

1. **Clone or extract the project:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
yarn install
```

3. **Configure environment variables:**
The `.env` file is already configured with your Supabase credentials.

4. **Set up Supabase Database:**
Run the SQL script from `SUPABASE_SETUP.md` in your Supabase SQL Editor.

5. **Start the development server:**
```bash
yarn start
```

6. **Run on device:**
- **iOS:** Press `i` or scan QR code with Expo Go app
- **Android:** Press `a` or scan QR code with Expo Go app
- **Web:** Press `w` to open in browser

---

## 📁 Project Structure

```
frontend/
├── app/                          # Expo Router file-based routing
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── _layout.tsx          # Tab bar configuration
│   │   ├── home.tsx             # Home screen
│   │   ├── categories.tsx       # Categories screen
│   │   ├── bookings.tsx         # Bookings screen
│   │   ├── cart.tsx             # Cart screen
│   │   └── profile.tsx          # Profile screen
│   ├── auth/                     # Authentication screens
│   │   ├── role-selection.tsx   # Role selection screen
│   │   ├── login.tsx            # Login screen
│   │   └── register.tsx         # Register screen
│   ├── _layout.tsx              # Root layout
│   └── index.tsx                # Splash/Entry screen
├── src/
│   ├── components/              # Reusable components
│   │   ├── ui/                  # UI components
│   │   │   ├── Button.tsx       # Custom button
│   │   │   └── Input.tsx        # Custom input field
│   │   └── cards/               # Card components
│   │       └── RoleCard.tsx     # Role selection card
│   ├── constants/               # Constants and theme
│   │   └── theme.ts             # Theme configuration
│   ├── services/                # External services
│   │   └── supabase.ts          # Supabase client
│   └── store/                   # State management
│       ├── authStore.ts         # Authentication state
│       ├── userStore.ts         # User data state
│       └── cartStore.ts         # Cart state
├── assets/                       # Images and fonts
├── .env                          # Environment variables
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## 🎨 Design System

### Color Palette

- **Primary:** `#5B7CFF` (Professional Blue)
- **Secondary:** `#8B5CF6` (Purple)
- **Customer Role:** `#5B7CFF`
- **Seller Role:** `#8B5CF6`
- **Admin Role:** `#EF4444`
- **Success:** `#10B981`
- **Error:** `#EF4444`
- **Warning:** `#F59E0B`

### Typography

- **H1:** 32px, Bold
- **H2:** 28px, Bold
- **H3:** 24px, Semi-bold
- **H4:** 20px, Semi-bold
- **Body:** 16px, Regular
- **Caption:** 12px, Regular

### Spacing

- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **xxl:** 48px

---

## 🔐 Authentication Flow

1. **Splash Screen** → Checks authentication status
2. **Role Selection** → User chooses Customer or Seller
3. **Login/Register** → User authenticates with role
4. **Home Screen** → Main app interface

### User Roles

- **Customer:** Can browse and purchase products/services
- **Seller:** Can list products/services (requires admin approval)
- **Admin:** Platform management (not in Phase 1)

---

## 📦 State Management

### Auth Store (`authStore.ts`)

```typescript
const { user, isAuthenticated, login, register, logout } = useAuthStore();
```

- Manages authentication state
- Handles login/register/logout
- Checks session on app start

### User Store (`userStore.ts`)

```typescript
const { userData, setUserData } = useUserStore();
```

- Manages user profile data
- Updates user information

### Cart Store (`cartStore.ts`)

```typescript
const { items, total, addItem, removeItem } = useCartStore();
```

- Manages shopping cart (for Phase 2)
- Add/remove items
- Calculate totals

---

## 🗄️ Supabase Integration

### Database Schema

See `SUPABASE_SETUP.md` for complete SQL schema.

**Users Table:**
- `id` (UUID, Primary Key)
- `name` (Text)
- `email` (Text, Unique)
- `phone` (Text)
- `role` (Enum: customer, seller, admin)
- `seller_status` (Enum: pending, approved, rejected)
- `created_at` (Timestamp)

### Authentication

- Uses Supabase Auth for user authentication
- Email/password based authentication
- Role-based access control
- Session management

---

## 🛠️ Development

### Available Scripts

```bash
# Start development server
yarn start

# Run on iOS simulator
yarn ios

# Run on Android emulator
yarn android

# Run on web
yarn web

# Lint code
yarn lint
```

### Adding New Screens

1. Create file in `app/` directory
2. File path becomes route (e.g., `app/products/[id].tsx` → `/products/:id`)
3. Add navigation logic
4. Update tab configuration if needed

### Creating Components

1. Create component in `src/components/`
2. Use theme from `src/constants/theme.ts`
3. Follow existing component patterns
4. Export from component file

---

## 📝 Next Steps (Phase 2)

### Planned Features:

1. **Category System:**
   - Mehndi Artist (Service booking)
   - Makeup Artist (Service booking)
   - Fashion Designer (Ecommerce)
   - Home Bakers (Hybrid)
   - Handmade Gifts (Hybrid)
   - Event Manager (Service booking)
   - Tutors (Service booking)

2. **Ecommerce Module:**
   - Product listing
   - Product details
   - Cart functionality
   - Checkout process
   - Payment integration (Razorpay)

3. **Booking Module:**
   - Service provider profiles
   - Booking calendar
   - Time slot selection
   - Booking confirmation

4. **Seller Dashboard:**
   - Product management
   - Order management
   - Booking management
   - Analytics

5. **Admin Panel:**
   - Seller approval
   - User management
   - Platform analytics

---

## 🐛 Troubleshooting

### Common Issues:

**1. Supabase Connection Error:**
- Check `.env` file has correct credentials
- Verify Supabase project is active
- Check network connection

**2. Navigation Issues:**
- Clear Metro bundler cache: `yarn start --clear`
- Delete `node_modules` and reinstall: `rm -rf node_modules && yarn install`

**3. Build Errors:**
- Ensure Node.js version is compatible (v16+)
- Update Expo CLI: `npm install -g expo-cli`
- Check for TypeScript errors: `npx tsc --noEmit`

**4. Authentication Issues:**
- Verify Supabase database tables are created
- Check Row Level Security policies in Supabase
- Clear app data and try again

---

## 📱 Testing

### Test Accounts:

Create test accounts using the register screen:

**Customer Account:**
- Email: customer@test.com
- Password: test123456
- Role: Customer

**Seller Account:**
- Email: seller@test.com
- Password: test123456
- Role: Seller
- Note: Requires admin approval (update `seller_status` to 'approved' in Supabase)

---

## 🔒 Security Notes

- Never commit `.env` file to version control
- Use Row Level Security in Supabase
- Validate all user inputs
- Use HTTPS for production
- Implement rate limiting for APIs

---

## 📄 License

This is a private project for ServiceHub.

---

## 👥 Support

For questions or issues:
1. Check this documentation
2. Review Supabase setup guide
3. Check Expo documentation: https://docs.expo.dev
4. Check React Navigation docs: https://reactnavigation.org

---

**Built with ❤️ using React Native, Expo, and Supabase**
