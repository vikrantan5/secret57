# ServiceHub Phase 1 - Quick Start Guide

## 📦 Installation & Setup

Follow these steps to get ServiceHub running on your machine.

---

## Step 1: Extract the Project

Extract the zip file to your desired location:

```bash
unzip servicehub-phase1.zip
cd servicehub-phase1/frontend
```

---

## Step 2: Install Node.js & Yarn

### Install Node.js (if not already installed):
- Download from: https://nodejs.org/
- Recommended version: v16 or later
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### Install Yarn (if not already installed):
```bash
npm install -g yarn
```

Verify:
```bash
yarn --version
```

---

## Step 3: Install Project Dependencies

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
yarn install
```

This will install all required packages including:
- React Native
- Expo
- Supabase
- Zustand
- React Navigation
- And more...

**Note:** This may take 2-5 minutes depending on your internet speed.

---

## Step 4: Set Up Supabase Database

### A. Create Database Tables

1. Go to your Supabase project dashboard: https://supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**
4. Open the file `SUPABASE_SETUP.md` from the project root
5. Copy the **entire SQL script** from "Step 2: Create Users Table"
6. Paste it into the Supabase SQL Editor
7. Click **"Run"** to execute

### B. Verify Table Creation

Run this query to verify:

```sql
SELECT * FROM public.users;
```

You should see an empty table with columns: id, name, email, phone, role, seller_status, created_at

---

## Step 5: Configure Environment Variables

The `.env` file in the frontend directory is already configured with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**Note:** These credentials are already set up. No changes needed!

---

## Step 6: Install Expo Go App (For Mobile Testing)

### For iOS:
1. Open App Store
2. Search for "Expo Go"
3. Install the app

### For Android:
1. Open Google Play Store
2. Search for "Expo Go"
3. Install the app

---

## Step 7: Start the Development Server

In the frontend directory, run:

```bash
yarn start
```

You should see:
- Metro bundler starting
- QR code displayed in terminal
- Web interface at http://localhost:3000

---

## Step 8: Run the App

### Option A: Test on Your Phone (Recommended)

**iOS:**
1. Open Expo Go app
2. Tap "Scan QR Code"
3. Scan the QR code from your terminal
4. App will load on your device

**Android:**
1. Open Expo Go app
2. Tap "Scan QR code"
3. Scan the QR code from your terminal
4. App will load on your device

### Option B: Test on Web

Press `w` in the terminal where you ran `yarn start`

Browser will open with the app running.

### Option C: Test on Simulator/Emulator

**iOS Simulator (Mac only):**
```bash
yarn ios
```

**Android Emulator:**
```bash
yarn android
```

*Note: Requires Xcode (iOS) or Android Studio (Android) to be installed.*

---

## Step 9: Create Test Accounts

### Create a Customer Account:

1. Open the app
2. Tap "Customer" on the Role Selection screen
3. Tap "Register"
4. Fill in the form:
   - Name: Test Customer
   - Email: customer@test.com
   - Phone: 1234567890
   - Password: test123456
5. Tap "Register"
6. Login with the same credentials

### Create a Seller Account:

1. Tap "Seller" on the Role Selection screen
2. Tap "Register"
3. Fill in the form:
   - Name: Test Seller
   - Email: seller@test.com
   - Phone: 0987654321
   - Password: test123456
4. Tap "Register"
5. **Important:** Seller accounts need approval before they can login

### Approve Seller Account:

Go to Supabase and run:

```sql
UPDATE public.users
SET seller_status = 'approved'
WHERE email = 'seller@test.com';
```

Now the seller can login!

---

## Step 10: Explore the App

### As Customer:
- Browse home screen
- View categories
- Check profile
- Navigate between tabs

### As Seller:
- Same as customer (Phase 2 will add seller-specific features)

---

## 🎯 Available Commands

```bash
# Start development server
yarn start

# Run on iOS simulator (Mac only)
yarn ios

# Run on Android emulator
yarn android

# Run on web
yarn web

# Check for errors
yarn lint

# Clear cache and restart
yarn start --clear
```

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to Metro bundler"

**Solution:**
```bash
# Clear cache and restart
yarn start --clear
```

### Issue: "Supabase connection error"

**Solution:**
1. Check internet connection
2. Verify Supabase project is active
3. Confirm database tables are created
4. Check .env file has correct credentials

### Issue: "Can't login as seller"

**Solution:**
Approve seller in Supabase:
```sql
UPDATE users SET seller_status = 'approved' 
WHERE email = 'your-seller-email@example.com';
```

### Issue: "App crashes on start"

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
yarn install
yarn start
```

### Issue: "QR code not scanning"

**Solution:**
1. Ensure phone and computer are on same WiFi network
2. Try using tunnel mode:
   ```bash
   yarn start --tunnel
   ```
3. Or use web version (press 'w')

### Issue: "Expo Go app not loading app"

**Solution:**
1. Update Expo Go app to latest version
2. Restart Metro bundler
3. Clear Expo Go cache (in app settings)

---

## 📱 Testing Checklist

- [ ] App loads without errors
- [ ] Splash screen appears
- [ ] Role selection screen displays
- [ ] Can navigate to login screen
- [ ] Can register new customer
- [ ] Can login as customer
- [ ] Home screen displays correctly
- [ ] Can navigate between tabs
- [ ] Profile shows user data
- [ ] Can logout successfully
- [ ] Can register as seller
- [ ] Seller approval workflow works

---

## 🔍 What to Look For

### On First Launch:
1. **Splash Screen:** Blue background with ServiceHub logo
2. **Auto-navigation:** After 1.5 seconds, moves to Role Selection
3. **Role Selection:** Two cards (Customer and Seller)

### After Registration:
1. **Customer:** Can login immediately
2. **Seller:** Sees "pending approval" message
3. **Home Screen:** Personalized with user name
4. **Tab Navigation:** All 5 tabs accessible

---

## 📚 Next Steps

1. **Familiarize with Code:**
   - Read `README.md` for detailed documentation
   - Explore `PROJECT_SUMMARY.md` for overview
   - Check `SUPABASE_SETUP.md` for database details

2. **Customize:**
   - Update theme colors in `src/constants/theme.ts`
   - Modify app name in `app.json`
   - Add your own assets

3. **Prepare for Phase 2:**
   - Review Phase 2 roadmap in `PROJECT_SUMMARY.md`
   - Plan category implementations
   - Design ecommerce/booking features

---

## 🎓 Learning Resources

- **Expo Docs:** https://docs.expo.dev
- **React Native:** https://reactnavigation.org
- **Supabase:** https://supabase.com/docs
- **Zustand:** https://docs.pmnd.rs/zustand

---

## 💡 Pro Tips

1. **Development:**
   - Keep Metro bundler running
   - Use hot reload (automatic)
   - Check console for errors

2. **Testing:**
   - Test on both iOS and Android
   - Use real device for accurate testing
   - Test different screen sizes

3. **Debugging:**
   - Shake device to open dev menu
   - Enable JS debugging
   - Check network requests in dev tools

---

## ✅ Success Indicators

You've successfully set up ServiceHub when:

- ✅ App loads without errors
- ✅ Can register and login
- ✅ Navigation works smoothly
- ✅ UI looks professional
- ✅ Supabase connection works
- ✅ All tabs are accessible
- ✅ Profile shows user data

---

## 🎉 You're All Set!

ServiceHub Phase 1 is now running on your device!

**Need Help?**
- Check `README.md` for detailed docs
- Review `SUPABASE_SETUP.md` for database help
- Read `PROJECT_SUMMARY.md` for project overview

---

**Built with ❤️ using React Native, Expo, and Supabase**

*Version 1.0.0 - Phase 1*
