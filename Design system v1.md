# 🎨 RECEPTEN APP — DESIGN SYSTEM V1
## "Warm & Inviting" + Multi-Color + Dashboard Focus

**Version:** 1.0  
**Target:** Premium, Instagram-worthy, family-friendly  
**Platform:** React Native (Expo) + iOS/Android  
**Inspiration:** Pinterest, Tasty, TheCookingShow, Notion  

---

## 📐 FOUNDATION: SPACING & TYPOGRAPHY

### Spacing Grid (8px base)
```
8px   = xs (small gaps)
16px  = sm (padding)
24px  = md (section spacing)
32px  = lg (large sections)
48px  = xl (hero spacing)
```

### Typography Hierarchy
```
FONTS:
- System (San Francisco on iOS, Roboto on Android)
- OR: "Poppins" (friendly, modern) for headers
- OR: "Inter" (clean, professional) for body

SIZES:
32px: Hero titles (dashboard header)
24px: Section titles (weekplanner day headers)
18px: Card titles (recipe name)
16px: Body text (descriptions)
14px: Captions (metadata, timestamps)
12px: Labels (tags, badges)

WEIGHTS:
700/800: Titles (bold, impact)
600: Subtitles (semi-bold)
500: Medium text (default)
400: Body text (regular)

LINE HEIGHT:
1.2: Titles (tight)
1.4: Body (readable)
1.6: Captions (loose)
```

### Example: Poppins Font Pairing
```
Hero: Poppins 32px Bold
Title: Poppins 24px SemiBold
Subtitle: Inter 16px Regular
Body: Inter 14px Regular
```

---

## 🎨 COLOR PALETTE: "Warm & Multi-Color"

### Primary Colors (Vibrant, Food-Centric)
```
WARM ORANGE (Primary Action)
  #FF6B35  (Vibrant, appetite-inducing)
  #FF8551  (Lighter tint)
  #E55100  (Darker shade)

RICH GREEN (Secondary)
  #2D6A4F  (Deep, organic, fresh)
  #40916C  (Medium)
  #52B788  (Light, accent)

WARM YELLOW (Tertiary)
  #FFB703  (Golden, sunny)
  #FFA500  (Orange-yellow)
  #FFD60A  (Bright accent)

SOFT CREAM/BEIGE (Background)
  #FEF9E7  (Warm white, not harsh)
  #FFF8DC  (Cornsilk, inviting)
  #F5F5F0  (Slightly cooler neutral)

NEUTRAL GRAYS (Typography & Borders)
  #1F1F1F  (Near black, for text)
  #4A4A4A  (Dark gray)
  #8B8B8B  (Medium gray)
  #D1D1D1  (Light gray, borders)
  #F0F0F0  (Very light, backgrounds)
```

### Color Usage Rules
```
PRIMARY: Orange (#FF6B35)
  - Main CTA buttons
  - Active tab indicator
  - Highlighted elements
  - Icon highlights

SECONDARY: Green (#2D6A4F)
  - Checked items
  - Success states
  - Recipe saved/favorited
  - Progress indicators

TERTIARY: Yellow (#FFB703)
  - Badges, labels
  - Ratings (stars)
  - Time badges
  - Energy/quick win indicators

BACKGROUND: Cream (#FEF9E7)
  - App background
  - Card backgrounds (slightly darker: #FFF8DC)
  - Creates warmth, not clinical

NEUTRAL: Grays
  - Text: #1F1F1F (titles), #4A4A4A (body)
  - Borders: #D1D1D1
  - Disabled: #8B8B8B
```

### Dark Mode Equivalent (if needed later)
```
Background: #1A1A1A (warm dark)
Card: #2A2A2A
Text: #F5F5F0 (warm white)
Accent: #FF6B35 (same vibrant)
```

---

## 🎭 COMPONENT LIBRARY

### 1️⃣ BUTTONS

#### Primary Button (Orange, Main CTA)
```typescript
// ✅ USE FOR: Add recipe, Save, Continue, Submit
{
  backgroundColor: '#FF6B35',
  color: '#FFFFFF',
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 12,
  fontWeight: '600',
  fontSize: 16,
  
  // Pressed state
  opacity: 0.85,
  
  // Shadow
  shadowColor: '#FF6B35',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
}
```

#### Secondary Button (Green, Important but not primary)
```typescript
// ✅ USE FOR: Save recipe, Mark as done, Approve
{
  backgroundColor: '#2D6A4F',
  color: '#FFFFFF',
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 12,
  fontWeight: '600',
  fontSize: 16,
}
```

#### Tertiary Button (Outlined, Lower priority)
```typescript
// ✅ USE FOR: Cancel, Skip, Secondary action
{
  backgroundColor: 'transparent',
  borderColor: '#D1D1D1',
  borderWidth: 1.5,
  color: '#1F1F1F',
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 12,
  fontWeight: '500',
  fontSize: 16,
}
```

#### Icon Button (Minimal, for quick actions)
```typescript
// ✅ USE FOR: Like, Share, Delete, Menu
{
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#F0F0F0',
  justifyContent: 'center',
  alignItems: 'center',
  
  // Pressed state
  opacity: 0.7,
}
```

---

### 2️⃣ CARDS

#### Recipe Card (Main content display)
```typescript
{
  backgroundColor: '#FFFFFF', // OR #FFF8DC for slightly tinted
  borderRadius: 16,
  padding: 0, // Image flush to edge
  marginVertical: 8,
  marginHorizontal: 16,
  
  // Shadow (gives depth)
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  
  // Structure:
  // ┌─────────────────┐
  // │   [Image] (9:16)│ ← 100% width, 200px height
  // ├─────────────────┤
  // │ RECIPE TITLE    │ ← Poppins 18px Bold
  // │ Category • Time │ ← Inter 14px, gray
  // ├─────────────────┤
  // │ [Like] [More]   │ ← Action buttons
  // └─────────────────┘
}
```

#### Weekplanner Day Card
```typescript
{
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  marginVertical: 8,
  marginHorizontal: 16,
  borderLeftWidth: 4,
  borderLeftColor: '#FF6B35', // Or color per day
  
  // Structure:
  // MON, Jan 15
  // ├─ Lasagna (5 ingredients)
  // ├─ Pasta (3 ingredients)
  // └─ [+ Add meal]
}
```

#### Stats Card (Dashboard)
```typescript
{
  backgroundColor: 'linear-gradient(135deg, #FFB703 0%, #FF6B35 100%)',
  borderRadius: 16,
  padding: 20,
  marginVertical: 8,
  marginHorizontal: 16,
  
  // Structure:
  // 24
  // Recipes this week  ← number + label
  // └─ 3 new favorites
}
```

---

### 3️⃣ INPUT FIELDS

#### Text Input (Consistent across app)
```typescript
{
  backgroundColor: '#F5F5F0',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#D1D1D1',
  paddingVertical: 12,
  paddingHorizontal: 16,
  fontFamily: 'Inter',
  fontSize: 16,
  
  // When focused
  borderColor: '#FF6B35',
  borderWidth: 2,
  
  // Placeholder
  placeholderTextColor: '#8B8B8B',
}
```

#### Search Bar (Special input)
```typescript
{
  backgroundColor: '#F0F0F0',
  borderRadius: 20, // Very rounded for premium feel
  paddingVertical: 12,
  paddingHorizontal: 16,
  paddingLeft: 40, // Space for search icon
  
  // Left icon (magnifying glass)
  // Right icon (clear/mic)
}
```

---

### 4️⃣ TABS & NAVIGATION

#### Bottom Tab Bar (iOS style)
```typescript
{
  backgroundColor: '#FFFFFF',
  borderTopColor: '#E0E0E0',
  borderTopWidth: 1,
  height: 80, // Space for notch
  
  // Each tab:
  {
    icon: 40,         // Large icon
    label: 12px,      // Small label
    activeColor: '#FF6B35',
    inactiveColor: '#8B8B8B',
    
    // Structure:
    // [🏠]
    // Dashboard
  }
}
```

#### Tab States
```
Active: Orange icon + darker label
Inactive: Gray icon + lighter label
Transition: Smooth color animation (0.3s)
```

---

### 5️⃣ BADGES & LABELS

#### Category Badge
```typescript
{
  backgroundColor: '#FFB703', // Yellow
  color: '#1F1F1F',           // Dark text
  paddingVertical: 4,
  paddingHorizontal: 12,
  borderRadius: 20,
  fontSize: 12,
  fontWeight: '600',
  
  // Example: "Italian", "Vegetarian", "Quick"
}
```

#### Rating Stars
```
⭐ ⭐ ⭐ ⭐ ☆  (4/5)
Color: #FFB703 (yellow)
Size: 16px
```

#### Time Badge
```typescript
{
  backgroundColor: '#F0F0F0',
  icon: '⏱️',
  text: '45 min',
  borderRadius: 8,
  paddingVertical: 4,
  paddingHorizontal: 8,
  fontSize: 14,
}
```

---

## 🎬 SCREENS: LAYOUT EXAMPLES

### 1️⃣ Dashboard (Main Screen)

```
┌─────────────────────────────────┐
│                                 │
│   Hallo, [Name]! 👋            │ ← Greeting (warm)
│                                 │
│   This week                     │ ← Section title
│   ┌───────────────────────────┐ │
│   │  24                       │ │ ← Stat card with gradient
│   │  Recipes planned          │ │
│   │  3 new favorites          │ │
│   └───────────────────────────┘ │
│                                 │
│   ┌───────────────────────────┐ │
│   │  5                        │ │ ← Another stat
│   │  Ingredients to buy       │ │
│   │  2 substitutes available  │ │
│   └───────────────────────────┘ │
│                                 │
│   Quick Actions                 │ ← Buttons
│   [+ Add Recipe] [📅 Plan Week] │
│                                 │
│   Your recent                   │ ← Scroll
│   ┌────────────────────────────┐│
│   │ [IMG] LASAGNA             ││
│   │ Italian • 45 min • ⭐⭐⭐⭐ ││
│   └────────────────────────────┘│
│                                 │
│   ┌────────────────────────────┐│
│   │ [IMG] PASTA CARBONARA     ││
│   │ Italian • 30 min • ⭐⭐⭐⭐⭐││
│   └────────────────────────────┘│
│                                 │
├─────────────────────────────────┤
│ [🏠] [📅] [🛒] [❤️] [⚙️]          │ ← Tab bar
└─────────────────────────────────┘
```

### 2️⃣ Weekplanner

```
┌─────────────────────────────────┐
│                                 │
│  Plan your week                 │ ← Title
│  Jan 15-21                      │ ← Date range
│                                 │
│  MON, Jan 15                    │ ← Day header (left border)
│  ├─ [x] Lasagna                │ ← Meal with checkbox
│  ├─ [ ] Pasta Carbonara        │
│  └─ [+ Add meal]               │
│                                 │
│  TUE, Jan 16                    │ ← Next day
│  ├─ [x] Tomato Soup            │
│  └─ [+ Add meal]               │
│                                 │
│  WED, Jan 17                    │ ← Empty day
│  └─ [+ Add meal]               │
│                                 │
│  [+ Add Week] (for planning)    │
│                                 │
├─────────────────────────────────┤
│ [🏠] [📅] [🛒] [❤️] [⚙️]          │
└─────────────────────────────────┘
```

### 3️⃣ Recipe List (with filters)

```
┌─────────────────────────────────┐
│                                 │
│  🔍 [Search recipes...]         │ ← Search bar
│                                 │
│  Filters: [Category ▼] [Time ▼] │ ← Quick filters
│                                 │
│  ┌────────────────────────────┐ │
│  │ [IMG]  LASAGNA            │ │ ← Recipe card
│  │ Italian • 45 min • ⭐⭐⭐⭐ │ │
│  └────────────────────────────┘ │
│                                 │
│  ┌────────────────────────────┐ │
│  │ [IMG]  PASTA CARBONARA    │ │
│  │ Italian • 30 min • ⭐⭐⭐⭐⭐│ │
│  └────────────────────────────┘ │
│                                 │
│  ┌────────────────────────────┐ │
│  │ [IMG]  TOMATO SOUP        │ │
│  │ European • 20 min • ⭐⭐⭐  │ │
│  └────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ [🏠] [📅] [🛒] [❤️] [⚙️]          │
└─────────────────────────────────┘
```

### 4️⃣ Recipe Detail (Full view)

```
┌─────────────────────────────────┐
│ [<] Recipe [Share] [...]        │ ← Header
├─────────────────────────────────┤
│                                 │
│  [LARGE IMAGE]                  │ ← Hero image (full width)
│                                 │
│  LASAGNA                        │ ← Title
│  Italian • 45 min • ⭐⭐⭐⭐⭐    │ ← Metadata
│                                 │
│  [❤️ Save] [📄 Source]          │ ← Actions
│                                 │
│  Ingredients                    │ ← Section
│  ┌────────────────────────────┐ │
│  │ □ 500g ground beef        │ │ ← Checkable
│  │ □ 2 cans tomatoes         │ │
│  │ □ 200g pasta              │ │
│  └────────────────────────────┘ │
│                                 │
│  Steps                          │
│  ┌────────────────────────────┐ │
│  │ 1. Preheat oven to 200°C  │ │
│  │ 2. Brown the meat...      │ │
│  │ 3. Layer in baking dish...│ │
│  └────────────────────────────┘ │
│                                 │
│  [+ Add to Shopping List]       │
│  [+ Add to Weekly Planner]      │
│                                 │
└─────────────────────────────────┘
```

### 5️⃣ Login/Splash Screen

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│           🍽️ LOGO              │ ← Animated (fade/scale)
│                                 │
│      RECEPTEN APP              │ ← App name (Poppins bold)
│      Plan. Cook. Share.        │ ← Tagline (warm)
│                                 │
│                                 │
│        [=======] 85%            │ ← Progress bar (warm color)
│                                 │
│      Loading your kitchen...   │ ← Friendly message
│                                 │
│                                 │
└─────────────────────────────────┘

↓ Then ↓

┌─────────────────────────────────┐
│                                 │
│      RECEPTEN APP              │
│                                 │
│   [Email input]                 │
│   [Password input]              │
│                                 │
│   [🔐 Login] (Orange button)    │
│                                 │
│   Don't have account?           │
│   [Create account] (link)       │
│                                 │
│   [Google] [Apple] (if enabled) │
│                                 │
└─────────────────────────────────┘
```

---

## 🌟 MICRO-INTERACTIONS (Subtle polish)

### 1️⃣ Button Press
```
Duration: 0.15s
Effect: Scale down 0.95, opacity 0.8
Then: Scale back to 1, opacity 1
Easing: easeInOut
```

### 2️⃣ Tab Switch
```
Duration: 0.3s
Effect: Icon color fade + slight scale
Previous tab: fade to gray
New tab: fade to orange, scale up slightly
```

### 3️⃣ Card Swipe
```
Duration: 0.4s
Effect: Delete swiped card with fadeOut + slideLeft
Shows: Undo button (green)
```

### 4️⃣ Add to List
```
Duration: 0.5s
Effect: Item slides down + checkmark appears
Sound: Soft "pop" (optional)
```

### 5️⃣ Loading Spinner
```
Color: Gradient orange → red
Rotation: Smooth, infinite
Size: 40px
```

---

## 📱 RESPONSIVE DESIGN

### Breakpoints (React Native doesn't have CSS media queries, but handle in code)
```
Small phones: 320-375px width
Regular phones: 375-428px width
Large phones: 428-480px width
Tablets: 768px+ width

RULE: Test on iPhone SE + iPhone 15 Pro Max + iPad
```

### Notch & Safe Area Handling
```
Use: useSafeAreaInsets() from react-native-safe-area-context
Apply padding top on header
Apply padding bottom on tab bar
Test on: iPhone 12/13/14 (notch), iPhone SE (no notch)
```

---

## 🎨 VISUAL CHECKLIST (Premium = Attention to Detail)

✅ **Spacing:**
- [ ] Consistent 8px grid (or 4px for fine-tuning)
- [ ] Ample whitespace (don't cram)
- [ ] Clear visual hierarchy

✅ **Colors:**
- [ ] Primary: Orange accent on all main actions
- [ ] Secondary: Green for success/done
- [ ] Gray: 5 shades for text/borders
- [ ] Consistent use across all screens

✅ **Typography:**
- [ ] Max 2-3 fonts (Poppins + Inter suggested)
- [ ] Clear size hierarchy (32 → 24 → 18 → 16)
- [ ] Line heights for readability (1.4 for body)
- [ ] Font weights: 400/500/600/700 only

✅ **Components:**
- [ ] Rounded corners (12-16px, not 0 or 30+)
- [ ] Shadow depth (1-3 levels, subtle)
- [ ] Consistent padding (16px inside cards)
- [ ] Icons from single library (SF Symbols, Feather, Ionicons)

✅ **Interactions:**
- [ ] Smooth transitions (0.2-0.4s, easeInOut)
- [ ] Feedback on every interaction (button press)
- [ ] Loading states (skeleton screens, spinners)
- [ ] Error messages (helpful, not scary)

✅ **Images:**
- [ ] High quality (2x resolution)
- [ ] Consistent aspect ratios (16:9 for recipe cards)
- [ ] Fallback placeholder while loading
- [ ] Blur-up effect (skeleton → blurred → full)

---

## 🎭 CODE TEMPLATE: USING THIS SYSTEM

### Example: Creating a Recipe Card with Design System

```typescript
import { View, Image, Text, Pressable } from 'react-native'
import { colors, spacing, shadows, typography } from './designSystem'

export function RecipeCard({ recipe }) {
  return (
    <Pressable
      style={[styles.card, shadows.medium]}
      onPress={() => navigateToRecipe(recipe.id)}
    >
      {/* Image */}
      <Image
        source={{ uri: recipe.image }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Content */}
      <View style={styles.content}>
        <Text style={typography.title18}>
          {recipe.title}
        </Text>

        <Text style={typography.caption14}>
          {recipe.category} • {recipe.cookingTime} min
        </Text>

        {/* Rating */}
        <Text style={typography.caption14}>
          {'⭐'.repeat(Math.round(recipe.rating))}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.iconButton, { backgroundColor: colors.background }]}
            onPress={() => toggleLike(recipe.id)}
          >
            <Text>{recipe.liked ? '❤️' : '🤍'}</Text>
          </Pressable>

          <Pressable
            style={[styles.iconButton, { backgroundColor: colors.background }]}
            onPress={() => showMoreOptions(recipe.id)}
          >
            <Text>⋯</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  )
}

const styles = {
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: colors.lightGray, // Placeholder
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
}
```

---

## 📦 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)
- [ ] Create `designSystem.ts` with colors, spacing, typography
- [ ] Create `colors.ts` file in components/ui
- [ ] Update all text sizes to match hierarchy
- [ ] Add shadow depths to cards

### Phase 2: Components (Week 2)
- [ ] Refactor Button.tsx → 4 variants (primary, secondary, tertiary, icon)
- [ ] Refactor Card.tsx → with images + metadata
- [ ] Create AppTextInput.tsx → consistent styling
- [ ] Create Tab navigation → with smooth transitions

### Phase 3: Screens (Week 3)
- [ ] Dashboard screen with stat cards
- [ ] Weekplanner screen with day cards
- [ ] Recipe list → card-based (not text list)
- [ ] Recipe detail → with hero image

### Phase 4: Polish (Week 4)
- [ ] Add micro-interactions (button press, tab switch)
- [ ] Loading states (skeleton screens)
- [ ] Error states (helpful messages)
- [ ] Dark mode support

---

## 🎬 WHAT "PREMIUM" LOOKS LIKE

### Before (Current V0.1.2)
```
[Lasagna] [Delete]
[Pasta]   [Delete]
[Soup]    [Delete]
```
❌ Generic, boring, doesn't invite use

### After (With Design System)
```
┌────────────────────────┐
│ [Beautiful Image]      │
│ LASAGNA                │
│ Italian • 45 min • ⭐⭐⭐⭐│
│ [❤️ Save] [⋯ More]      │
└────────────────────────┘
```
✅ Inviting, professional, makes you want to cook!

---

**Ready to build this?** Let's start with the **SPLASH SCREEN** + **DESIGN SYSTEM.TS** file! 🚀
