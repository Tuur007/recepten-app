# 🎨 RECEPTEN APP — DESIGN ROADMAP V10
## From Generic to Premium (Warm & Inviting + Multi-Color)

**Current State:** V0.1.2 (Functional but bland)  
**Target:** Premium, Instagram-worthy, family-friendly  
**Design Style:** Warm & Inviting + Multi-Color + Dashboard-first  
**Timeline:** 6-8 weeks (fulltime) / 3-4 months (part-time)  

---

## 🎯 WHAT "PREMIUM" MEANS FOR THIS APP

### Visual Premium
✅ Beautiful color palette (warm orange, green, yellow accents)  
✅ Ample whitespace (not cramped)  
✅ Consistent spacing grid (8px base)  
✅ High-quality shadows and depth  
✅ Smooth animations (0.2-0.4s)  
✅ Recipe images as hero elements  

### UX Premium
✅ Loading states (splash screen with progress)  
✅ Empty states (beautiful, not sad)  
✅ Feedback on every interaction (button press, haptics)  
✅ Clear visual hierarchy (titles > subtitles > body)  
✅ Readable typography (proper sizes, weights, line heights)  

### Brand Premium
✅ Memorable splash screen with animated logo  
✅ Consistent app name and tagline  
✅ Icon-based navigation (not text heavy)  
✅ Branded colors throughout  
✅ Professional feel, not generic  

---

## 📋 PHASE 0: DISCOVERY (DONE! ✅)

### What We Decided
✅ **Design Style:** Warm & Inviting (Pinterest/cooking vibes)  
✅ **Color Palette:** Multi-Color (Orange + Green + Yellow + Warm creams)  
✅ **Main Screen:** Dashboard (stats + quick actions)  
✅ **Weekplanner:** Super simple (7 days, click to add recipes)  
✅ **Splash Screen:** Animated logo with progress bar  

### Deliverables Created
✅ `DESIGN_SYSTEM_V1.md` — Complete design specs (colors, spacing, typography)  
✅ `designSystem.ts` — Ready-to-use TypeScript file  
✅ `SplashScreen.tsx` — 3 variants (full, minimal, modern)  
✅ `WeekPlanner.tsx` — Simple weekplanner component  

---

## 📋 PHASE 1: DESIGN SYSTEM IMPLEMENTATION (WEEK 1-2)

### SPRINT 28: Setup Design System & Colors
**Priority:** 🔴 CRITICAL  
**Effort:** 2-3 days  
**Status:** BACKLOG  

#### What to Do
```
1. Create components/ui/designSystem.ts
   - Copy designSystem.ts file (already created!)
   - Add to your project

2. Create colors.ts (already exists, update it)
   - Replace with warm palette:
   - #FF6B35 (orange primary)
   - #2D6A4F (green secondary)
   - #FFB703 (yellow tertiary)
   - #FEF9E7 (warm cream background)

3. Create spacing.ts (if not exists)
   - 8px grid system
   - xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48

4. Create typography.ts (enhance existing)
   - 32px: Hero titles
   - 24px: Section titles
   - 18px: Card titles
   - 16px: Body text
   - Use weights: 400/500/600/700
```

#### Testing Checklist
- [ ] Colors.ts loaded correctly
- [ ] Spacing values used consistently
- [ ] Typography sizes look good on screen
- [ ] No magic numbers (use const from designSystem)

#### Done Criteria
✅ No more hardcoded colors  
✅ All components use designSystem  
✅ Consistent 8px grid  
✅ Clear typography hierarchy  

---

### SPRINT 29: Refactor Existing Components
**Priority:** 🔴 CRITICAL  
**Effort:** 3-4 days  
**Status:** BACKLOG  

#### What to Do
Update these components to use design system:

```
components/ui/Button.tsx
  - Primary button (orange bg, white text)
  - Secondary button (green bg, white text)
  - Tertiary button (outlined, transparent)
  - Icon button (rounded, gray bg)
  - All with proper shadow + animation

components/ui/Card.tsx
  - Update background color (#FFF8DC instead of white)
  - Add proper shadow depth
  - Add padding: spacing.md
  - Update rounded corners: 16px

components/ui/AppTextInput.tsx
  - Background: colors.backgroundLight
  - Border color: colors.borderColor
  - Focused: orange border
  - Text size: 16px, line-height: 1.4

features/recipes/components/RecipeCard.tsx
  - Add image display (16:9 aspect ratio)
  - Show category badge (yellow)
  - Show time badge (gray)
  - Show rating (stars)
  - Action buttons (heart, more)
```

#### Done Criteria
✅ All components use design system colors  
✅ Consistent shadows across app  
✅ Button variants all styled correctly  
✅ No visual regressions  

---

## 📋 PHASE 2: SPLASH SCREEN & LOADING (WEEK 3)

### SPRINT 30: Implement Splash Screen
**Priority:** 🔴 CRITICAL  
**Effort:** 2 days  
**Status:** BACKLOG  

#### What to Do
```
1. Create screens/SplashScreen.tsx (or use provided)
   - Animated logo (emoji 🍽️ in circle)
   - App name "RECEPTEN" (orange, Poppins bold)
   - Tagline "Plan • Cook • Share"
   - Progress bar (warm color)
   - Loading message

2. Integrate into App.tsx root
   - Show while Firebase/database initializing
   - Min duration: 2 seconds (for brand impression)
   - Fade out when ready
   - Navigate to auth/tabs

3. Add 3 variants
   - Full: with progress bar
   - Minimal: just logo + spinner
   - Modern: inverted colors (orange bg)

4. Make it feel premium
   - Smooth animations (0.8s fade-in)
   - Proper shadows on logo circle
   - Warm colors throughout
```

#### Testing
- [ ] Splash shows on app start
- [ ] Progress bar animates
- [ ] Fade out smooth
- [ ] iOS + Android both work
- [ ] Logo looks good in both light/dark
- [ ] Min 2 second duration

#### Done Criteria
✅ Memorable splash screen  
✅ Shows app branding clearly  
✅ Progress bar for perception of speed  
✅ Professional entry point to app  

---

### SPRINT 31: Loading States
**Priority:** 🟡 HIGH  
**Effort:** 1-2 days  
**Status:** BACKLOG  

#### What to Do
Add loading feedback everywhere:

```
1. Skeleton Screens
   - Recipe list: show skeleton cards while loading
   - Dashboard: show skeleton stats
   - Use gray placeholder blocks

2. Loading Spinners
   - Use ActivityIndicator (React Native)
   - Color: primary orange
   - Size: Large (40px) for modals

3. Toast Messages
   - Success: green, checkmark ✅
   - Error: red, X ❌
   - Info: blue, ℹ️
   - Duration: 2-3 seconds, auto-dismiss

4. Button States
   - Disabled during loading
   - Show spinner inside button
   - Cursor change (web)

5. Empty States
   - "No recipes yet" with emoji 🍽️
   - Call-to-action button
   - Helpful message
```

#### Done Criteria
✅ Never show raw loading spinners  
✅ Always provide feedback to user  
✅ Skeleton screens on all list views  
✅ Toast for success/error messages  

---

## 📋 PHASE 3: DASHBOARD (WEEK 4)

### SPRINT 32: Dashboard Screen Implementation
**Priority:** 🔴 CRITICAL  
**Effort:** 3-4 days  
**Status:** BACKLOG  

#### What to Do
Create the main dashboard that shows after login:

```
UI Layout:

┌─────────────────────────────┐
│                             │
│   Hallo, [Name]! 👋        │ ← Greeting (warm)
│                             │
│   This week                 │
│   ┌─────────────────────┐   │
│   │  24                 │   │ ← Stat card (orange gradient)
│   │  Recipes planned    │   │
│   │  3 new favorites    │   │
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │  5                  │   │ ← Another stat card (green)
│   │  Ingredients to buy │   │
│   │  2 new recipes      │   │
│   └─────────────────────┘   │
│                             │
│   Quick Actions             │
│   [+ Add Recipe] [📅 Week] │
│                             │
│   Your recent               │
│   ┌───────────────────────┐ │
│   │ [IMG] LASAGNA       │ │ ← Recipe card
│   │ Italian • 45 min     │ │
│   │ ⭐⭐⭐⭐              │ │
│   └───────────────────────┘ │
│                             │
└─────────────────────────────┘
```

#### Implementation
```typescript
// screens/(tabs)/index.tsx (Dashboard)

export default function DashboardScreen() {
  const { user } = useAuth()
  const { recipes } = useRecipes()
  const { groceryItems } = useGrocery()

  const stats = {
    thisWeekRecipes: calculateThisWeekRecipes(),
    newFavorites: calculateNewFavorites(),
    ingredientsToBuy: groceryItems.filter(i => !i.checked).length,
  }

  return (
    <ScrollView style={styles.container}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={typography.hero32Bold}>
          Hallo, {user?.name}! 👋
        </Text>
      </View>

      {/* Stat Cards */}
      <Text style={typography.title20}>This week</Text>
      <View style={styles.statsContainer}>
        <StatCard
          number={stats.thisWeekRecipes}
          label="Recipes planned"
          color={colors.primary}
        />
        <StatCard
          number={stats.newFavorites}
          label="New favorites"
          color={colors.secondary}
        />
      </View>

      {/* Quick Actions */}
      <Text style={typography.title20}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <PrimaryButton label="+ Add Recipe" onPress={...} />
        <SecondaryButton label="📅 Plan Week" onPress={...} />
      </View>

      {/* Recent Recipes */}
      <Text style={typography.title20}>Your recent</Text>
      <FlatList
        data={recentRecipes}
        renderItem={({ item }) => <RecipeCard recipe={item} />}
      />
    </ScrollView>
  )
}
```

#### Done Criteria
✅ Dashboard shows after login  
✅ Stats cards with correct numbers  
✅ Quick action buttons work  
✅ Recent recipes display  
✅ Looks premium and warm  

---

## 📋 PHASE 4: WEEKPLANNER (WEEK 5)

### SPRINT 33: Weekplanner Tab Implementation
**Priority:** 🟡 HIGH  
**Effort:** 3-4 days  
**Status:** BACKLOG  

#### What to Do
Create weekplanner screen with simple 7-day view:

```
UI Layout:

┌─────────────────────────────┐
│  Plan your week             │
│  Jan 15-21                  │
├─────────────────────────────┤
│  MON, Jan 15                │ ← Day header (colored left border)
│  ├─ [x] Lasagna             │ ← Meal with checkbox
│  ├─ [ ] Pasta Carbonara     │
│  └─ [+ Add meal]            │
│                             │
│  TUE, Jan 16                │
│  ├─ [x] Tomato Soup         │
│  └─ [+ Add meal]            │
│                             │
│  ...                        │
│  SUN, Jan 21                │
│  └─ [+ Add meal]            │
└─────────────────────────────┘
```

#### Implementation
```typescript
// screens/(tabs)/weekplanner.tsx

import { WeekPlanner } from '@/components/WeekPlanner'

export default function WeekplannerScreen() {
  const [weekMeals, setWeekMeals] = useState<MealPlan>({
    MON: [],
    TUE: [],
    // ...
  })

  return (
    <WeekPlanner
      weekMeals={weekMeals}
      recipes={recipes}
      onAddMeal={handleAddMeal}
      onRemoveMeal={handleRemoveMeal}
    />
  )
}
```

#### Features
- [ ] 7 days with dates
- [ ] Each day can have multiple meals
- [ ] Click [+ Add meal] → modal with recipe picker
- [ ] Swipe to remove meal
- [ ] Different color for each day (visual variety)
- [ ] Save to Firebase

#### Done Criteria
✅ All 7 days display correctly  
✅ Can add/remove meals  
✅ Changes save to database  
✅ Looks cohesive with design system  

---

## 📋 PHASE 5: RECIPE LIST REDESIGN (WEEK 6)

### SPRINT 34: Recipe Cards with Images
**Priority:** 🟡 HIGH  
**Effort:** 2-3 days  
**Status:** BACKLOG  

#### What to Do
Update recipe display from text list to beautiful cards:

```
BEFORE (Text list):
[Lasagna] [Delete]
[Pasta]   [Delete]
[Soup]    [Delete]

AFTER (Card-based):
┌─────────────────────┐
│ [Hero Image]        │ ← 16:9 aspect ratio
├─────────────────────┤
│ LASAGNA             │ ← Title (18px bold)
│ Italian • 45 min    │ ← Meta (gray, 14px)
│ ⭐⭐⭐⭐            │ ← Rating
├─────────────────────┤
│ [❤️ Save] [⋯ More]  │ ← Actions
└─────────────────────┘
```

#### Implementation
```typescript
// features/recipes/components/RecipeCard.tsx (UPDATED)

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Pressable
      style={[styles.card, shadows.medium]}
      onPress={() => navigateToDetail(recipe.id)}
    >
      {/* Image */}
      <Image
        source={{ uri: recipe.image }}
        style={styles.heroImage}
      />

      {/* Content */}
      <View style={styles.content}>
        <Text style={typography.title18}>{recipe.title}</Text>
        
        <Text style={typography.caption14}>
          {recipe.category} • ⏱️ {recipe.cookingTime} min
        </Text>

        {/* Rating */}
        <Text style={typography.caption14}>
          {'⭐'.repeat(Math.round(recipe.rating))}
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.iconBtn} onPress={() => toggleLike(recipe.id)}>
            <Text>{recipe.liked ? '❤️' : '🤍'}</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => showMenu(recipe.id)}>
            <Text>⋯</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  )
}
```

#### Design Details
- Image: 16:9 aspect ratio, 200px height
- Shadow: medium depth
- Rounded corners: 16px
- Padding: 16px (spacing.md)
- Background: white
- Border radius: 16px

#### Done Criteria
✅ Recipe cards with images  
✅ Metadata displayed (category, time, rating)  
✅ Action buttons (like, more)  
✅ Looks premium and inviting  

---

## 📋 PHASE 6: NAVIGATION & POLISH (WEEK 7)

### SPRINT 35: Bottom Tab Navigation Redesign
**Priority:** 🟡 HIGH  
**Effort:** 2 days  
**Status:** BACKLOG  

#### What to Do
Update tab navigation to match premium design:

```
BEFORE (Text tabs):
Home    Recipes    Grocery    Settings

AFTER (Icon-based tabs):
🏠      📚         🛒        ⚙️
Home   Recipes   Grocery  Settings

- Active: Orange icon + orange indicator
- Inactive: Gray icon
- Smooth color transition (0.3s)
```

#### Implementation
```typescript
// app/(tabs)/_layout.tsx

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.borderColor,
        },
        tabBarLabelStyle: typography.caption12,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      {/* ... other tabs */}
    </Tabs>
  )
}
```

#### Done Criteria
✅ Icon-based tabs  
✅ Smooth color transitions  
✅ Active state indicator  
✅ Labels below icons  

---

### SPRINT 36: Animations & Micro-interactions
**Priority:** 🟢 MEDIUM  
**Effort:** 2-3 days  
**Status:** BACKLOG  

#### What to Do
Add subtle animations for premium feel:

```
1. Button Press
   - Scale down 0.95
   - Duration: 0.15s
   - Easing: easeInOut

2. Tab Switch
   - Icon color fade (0.3s)
   - Slight scale up on new tab
   - Smooth transition

3. Card Swipe
   - Delete swiped card with fadeOut + slideLeft
   - Show undo button

4. Add Action
   - New item slides down + checkmark
   - Haptic feedback (if available)

5. Loading Spinner
   - Smooth rotation
   - Color: primary orange
   - Size: 40px
```

#### Implementation
```typescript
// Example: Button press animation

const handlePress = () => {
  Animated.sequence([
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }),
    Animated.timing(scale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }),
  ]).start()

  // Haptic feedback
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

  // Your action
  onPress?.()
}
```

#### Done Criteria
✅ Smooth transitions on all interactions  
✅ No jank or stuttering  
✅ Haptic feedback where appropriate  
✅ Polished, professional feel  

---

## 📋 PHASE 7: ADVANCED FEATURES (WEEK 8+)

### SPRINT 37: Empty & Error States
**Priority:** 🟢 MEDIUM  
**Effort:** 1-2 days  
**Status:** BACKLOG  

#### What to Do
Design beautiful empty states:

```
No recipes yet:
┌─────────────────┐
│                 │
│    🍽️ (large)  │
│                 │
│ No recipes yet  │
│                 │
│ [+ Add first]   │
│                 │
└─────────────────┘

No ingredients:
┌─────────────────┐
│                 │
│    🛒 (large)  │
│                 │
│ Nothing to buy  │
│                 │
│ [Add recipes]   │
│                 │
└─────────────────┘
```

### SPRINT 38: Dark Mode Support
**Priority:** 🟢 MEDIUM  
**Effort:** 2-3 days  
**Status:** BACKLOG  

#### What to Do
```
1. Create dark color palette
   - Background: #1A1A1A
   - Card: #2A2A2A
   - Text: #F5F5F0
   - Keep primary colors vibrant

2. Use useColorScheme() hook
3. Toggle in settings
4. Persist preference
5. Test all screens in dark mode
```

### SPRINT 39: Dark Mode Completion
**Priority:** 🟢 MEDIUM  
**Effort:** 2 days  
**Status:** BACKLOG  

#### What to Do
```
- Update all components for dark mode
- Test tab bar, cards, buttons
- Verify readability
- Check images (may need overlay)
```

---

## 📊 TIMELINE SUMMARY

| Phase | Sprint | Feature | Days | Status |
|-------|--------|---------|------|--------|
| 0 | - | Discovery | 1 | ✅ DONE |
| 1 | 28 | Design System | 3 | Next |
| 1 | 29 | Component Refactor | 4 | After 28 |
| 2 | 30 | Splash Screen | 2 | Week 2 |
| 2 | 31 | Loading States | 2 | Week 2 |
| 3 | 32 | Dashboard | 4 | Week 3-4 |
| 4 | 33 | Weekplanner | 4 | Week 4-5 |
| 5 | 34 | Recipe Cards | 3 | Week 5-6 |
| 6 | 35 | Tab Navigation | 2 | Week 6 |
| 6 | 36 | Animations | 3 | Week 6-7 |
| 7 | 37 | Empty States | 2 | Week 7-8 |
| 7 | 38 | Dark Mode | 3 | Week 8 |
| 7 | 39 | Polish | 2 | Week 8 |
| | | **TOTAL** | **~37 days** | |

**Realistic Timeline:**
- Fulltime: 6-8 weeks
- Part-time (20h/week): 4-5 months

---

## 🎬 QUICK START (NEXT 2 WEEKS)

### Week 1
```
MONDAY:
- Set up components/ui/designSystem.ts
- Copy colors (warm palette)
- Test in one component

WEDNESDAY:
- Update all colors.ts references
- Refactor Button.tsx (4 variants)
- Update Card.tsx styling

FRIDAY:
- Finish component refactoring
- Test on device
- No visual regressions
```

### Week 2
```
MONDAY:
- Implement SplashScreen
- Integrate into App.tsx
- Test min 2 second duration

WEDNESDAY:
- Add loading states
- Toast notifications
- Skeleton screens

FRIDAY:
- Review splash screen branding
- Update copy/tagline if needed
- Polish animations
```

---

## ✅ ACCEPTANCE CRITERIA: EACH SPRINT

Before shipping ANY sprint:

```
VISUAL:
- [ ] Uses design system colors
- [ ] 8px grid spacing
- [ ] Proper shadows
- [ ] Rounded corners (12-16px)
- [ ] Typography hierarchy correct

INTERACTION:
- [ ] Button press feedback
- [ ] Smooth transitions
- [ ] No visual jank
- [ ] Loading states shown

CODE:
- [ ] No hardcoded colors
- [ ] No magic numbers
- [ ] Uses designSystem imports
- [ ] TypeScript strict mode

TESTING:
- [ ] On iPhone SE + 14 Pro Max
- [ ] Android device
- [ ] Landscape + portrait
- [ ] Light + dark backgrounds
- [ ] Notch/safe areas handled

SHIP ONLY IF: ALL ✅
```

---

## 🎨 WHAT YOU'LL ACHIEVE

### Before (V0.1.2)
```
Generic, uninspired interface
- Plain text lists
- Boring buttons
- No visual hierarchy
- Looks like 10,000 other apps
- Doesn't inspire cooking
```

### After (V0.2+)
```
Premium, inviting experience
✅ Beautiful warm colors (orange, green, yellow)
✅ Professional card-based layout
✅ Memorable splash screen
✅ Dashboard stats on entry
✅ Simple but powerful weekplanner
✅ Smooth animations throughout
✅ Makes you WANT to cook with it
✅ Looks like a real App Store app
```

---

## 📚 RESOURCES

### Design Inspiration
- Pinterest (cooking/food photography)
- Airbnb (card design, shadows)
- Notion (typography, spacing)
- Apple Notes (minimalism, whitespace)

### React Native Components
- `Animated` API (for animations)
- `FlatList` (efficient list rendering)
- `ScrollView` (for scrollable content)
- `Modal` (for weekplanner recipe picker)
- `ActivityIndicator` (loading spinner)

### Testing Tools
- React Native DevTools (profiling)
- Expo Snack (quick testing)
- Device preview (on real hardware)

---

## 🚀 NEXT QUESTION

Once you're ready to start:

**"Ready to implement SPRINT 28?"**

Or do you have more questions about:
- Color palette (want different colors?)
- Layout (prefer different structure?)
- Animations (too subtle/too bold?)
- Weekplanner (want more features?)

Let me know! 🎨✨
