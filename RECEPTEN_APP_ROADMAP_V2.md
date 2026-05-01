# RECEPTEN APP — ROADMAP V2

**Starting point:** V0.1.2 (SQLite, local, single-user)  
**End goal:** Firebase, multi-user, real-time sync, offline-first  
**Approach:** Refactor → Migrate (keep UI intact, replace backend)  
**Timeline:** ~12-15 sprints (je hebt al 60% done!)  
**Tech Stack:** React Native Expo + TypeScript + Zustand + Firebase

---

## OVERZICHT: WAT VERANDERT

### BEHOUDEN ✅
- Alle UI screens (recepten list, detail, create, edit, boodschappen)
- Zustand store pattern
- useRecipes, useGrocery hooks (structure)
- Components (RecipeCard, GroceryItem, CategoryPicker)
- Colors + styling

### REFACTOREN 🔧
- **GroceryItem type** → add `sources: SourceLineage[]`
- **merge.ts** → track sourceId + quantity per source
- **GroceryRepository** → becomes FirebaseRepository

### TOEVOEGEN 🆕
- Firebase project + Firestore
- Authentication (family login)
- Real-time listeners (onSnapshot)
- Offline persistence
- Multi-user conflict resolution

---

## DEEL 1: JOUW PLANNING

### SPRINT 0: Voorbereiding + Code Review (0,5 dag)

**Wat je doet:**
- [ ] Backup bestaande V0.1.2 (git branch)
- [ ] Read door `merge.ts` + `types/grocery.ts` current state
- [ ] Read door `useGrocery` hook logic
- [ ] Understand: hoe works aggregation nu?

**Waarom:**
Om te zien wat je gaat refactoren. Niet blind gaan veranderen.

**Done when:**
Je begrijpt: "recipes: ['Lasagna', 'Spaghetti']" is simpel maar fragiel.

---

### SPRINT 1: Refactor GroceryItem → SourceLineage (1.5 dag)

**De kritieke refactor.** Dit is de foundation voor alles daarna.

**Wat je doet:**

1. **Update types/grocery.ts:**
```typescript
export interface SourceLineage {
  sourceId: string              // recipeId of "manual-{uuid}"
  sourceType: 'recipe' | 'manual'
  sourceName: string            // "Lasagna" of "Handmatig"
  quantity: number              // 1 tomaat van Lasagna
}

export interface GroceryItem {
  id: string
  name: string                  // "Tomaat"
  unit: string                  // "stuks"
  totalQuantity: number         // auto-calculated: sum(sources.quantity)
  sources: SourceLineage[]      // [{ sourceId: "recipe-1", sourceName: "Lasagna", quantity: 1 }, ...]
  isChecked: boolean
  createdAt: string
  createdBy?: string            // for Firebase later
}
```

2. **Refactor merge.ts:**
```typescript
// OLD:
recipes: ["Lasagna", "Spaghetti", "Manual"]

// NEW:
sources: [
  { sourceId: "recipe-abc", sourceType: "recipe", sourceName: "Lasagna", quantity: 1 },
  { sourceId: "recipe-def", sourceType: "recipe", sourceName: "Spaghetti", quantity: 1 },
  { sourceId: "manual-xyz", sourceType: "manual", sourceName: "Handmatig", quantity: 3 }
]
totalQuantity: 5  // auto-calculated
```

3. **Update mergeIngredientsIntoGrocery logic:**
   - Find existing item by name
   - Append new source (don't replace)
   - Recalculate totalQuantity = sum(sources.quantity)
   - Handle duplicate sourceId (don't double-add Lasagna)

4. **Update GroceryRepository + groceryStore:**
   - Save/load SourceLineage array
   - Calculate totalQuantity on load

**Stress test:**
```
Start: empty
Add Lasagna (1 tomato) 
  → { name: "Tomaat", totalQty: 1, sources: [{ recipeId: "lasagna-id", qty: 1 }] }

Add Spaghetti (1 tomato)
  → { name: "Tomaat", totalQty: 2, sources: [{ recipeId: "lasagna-id", qty: 1 }, { recipeId: "spaghetti-id", qty: 1 }] }

Add Manual (3 tomatoes)
  → { name: "Tomaat", totalQty: 5, sources: [lasagna:1, spaghetti:1, manual:3] }

Remove Lasagna source
  → { name: "Tomaat", totalQty: 4, sources: [spaghetti:1, manual:3] }
```

**Done when:**
- Types compile
- merge.ts logic tested (unit tests for above scenario)
- GroceryItem component still renders (UI unchanged)
- SQLite still works (just different data structure)

**🚨 CRITICAL:** Test thoroughly. Dit is de foundation. Als dit fout is, hele Firebase-migratie gaat fout.

---

### SPRINT 2: Update UI für SourceLineage display (1 dag)

**Wat je doet:**

1. **Update GroceryItem.tsx component:**
   - Show totalQuantity (was quantity)
   - Show sources as tags/chips below
   - Example: "3 stuks (1 Lasagna | 1 Spaghetti | 1 Handmatig)"

2. **Create GrocerySourceTag.tsx component:**
   - Small badge: "1 Lasagna"
   - Show sourceType icon (🍳 for recipe, ✍️ for manual)
   - Tappable → show details or remove option

3. **Update "Add from Recipe" modal:**
   - When user confirms: show which sources will be added
   - Preview: "Adding Lasagna (5 ingredients)" before merge

**Done when:**
- Grocery list shows sources visually
- No visual regression from V0.1.2
- Sources display correctly after merge

---

### SPRINT 3: Firebase Project Setup + Auth (1.5 dag)

**Wat je doet:**

1. **Create Firebase project:**
   - [ ] console.firebase.google.com
   - [ ] Create new project "recepten-app"
   - [ ] Enable Firestore
   - [ ] Enable Firebase Auth (email/password)

2. **Setup React Native Firebase SDK:**
   - [ ] npm install @react-native-firebase/app @react-native-firebase/firestore @react-native-firebase/auth
   - [ ] Create firebase/config.ts (init)
   - [ ] Add google-services.json (Android) + GoogleService-Info.plist (iOS)

3. **Create auth hook (similar to useRecipes pattern):**
```typescript
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // onAuthStateChanged listener
  // login(email, password)
  // logout()
  // createFamily(email, password, familyName)
  
  return { user, loading, login, logout, createFamily }
}
```

4. **Create simple auth screens (BASIC, can improve later):**
   - `app/(auth)/login.tsx` — email/password
   - `app/(auth)/signup.tsx` — create account
   - Redirect logic: no user → login, has user → tabs

**Done when:**
- `expo start` → login screen appears
- Login with test account works
- Redirects to recepten screen on success
- Firebase console shows test user

---

### SPRINT 4: Firestore Schema (1 dag)

**Wat je doet:**

Design + create Firestore collections. Update types/firestore.ts:

```typescript
// Collections:
collections/
  users/{userId}
    - email: string
    - familyId: string
    - createdAt: timestamp
  
  families/{familyId}
    - name: string
    - createdBy: userId
    - members: [userId, ...]
    - createdAt: timestamp
  
  recipes/{recipeId}
    - title: string
    - category: string
    - ingredients: Ingredient[]
    - steps: string[]
    - isFavorite: boolean
    - createdBy: userId
    - createdAt: timestamp
    - updatedAt: timestamp
    - familyId: string (for permission checks)
  
  groceryItems/{itemId}
    - name: string
    - unit: string
    - totalQuantity: number (denormalized, could be computed)
    - sources: SourceLineage[]
    - isChecked: boolean
    - createdAt: timestamp
    - createdBy: userId
    - familyId: string
```

**Security rules (commented in code for now):**
- Only authenticated users
- Only see/edit own family's data
- createdBy + timestamps server-set

**Done when:**
- Types defined
- Security rules drafted
- No Firestore write yet (just schema)

---

### SPRINT 5: Migrate useRecipes Hook (2 dag)

**Wat je doet:**

Replace SQLite with Firestore in useRecipes hook. **Keep UI unchanged.**

**Current (SQLite):**
```typescript
const db = useSQLiteContext()
const { recipes, setRecipes } = useRecipeStore()

useEffect(() => {
  RecipeRepository.getAll(db).then(setRecipes)
}, [])

const create = async (input) => {
  const recipe = await RecipeRepository.create(db, input)
  addRecipe(recipe)
}
```

**New (Firestore):**
```typescript
const { user } = useAuth()
const { recipes, setRecipes } = useRecipeStore()

useEffect(() => {
  if (!user?.familyId) return
  
  // Real-time listener
  const unsubscribe = onSnapshot(
    query(collection(db, 'recipes'), where('familyId', '==', user.familyId)),
    (snapshot) => {
      const recipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setRecipes(recipes)
    }
  )
  
  return () => unsubscribe()
}, [user?.familyId])

const create = async (input) => {
  const newDoc = await addDoc(collection(db, 'recipes'), {
    ...input,
    familyId: user.familyId,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  // Store updates via listener (no manual addRecipe needed)
}
```

**What changes in code:**
- Remove `useSQLiteContext()`
- Add `useAuth()` for familyId
- Replace RecipeRepository with Firestore queries
- Real-time listener (onSnapshot) instead of manual fetch
- Server timestamps (not client)

**What stays the same:**
- useRecipeStore structure
- Return signature: { recipes, create, update, delete, getById }
- All UI calling code (no changes needed!)

**Testing:**
- Create recipe in app
- Check Firestore console (appears?)
- Edit recipe → Firestore updates
- Delete recipe
- Open app in 2 places → real-time sync (if both logged in same family)

**Done when:**
- useRecipes fully migrated
- CRUD works with Firestore
- Real-time listener setup
- No UI changes needed

---

### SPRINT 6: Migrate useGrocery Hook (2 dag)

**Wat je doet:**

Migrate boodschappen hook to Firestore. **Most complex.**

**Key difference:** aggregation happens in Firestore now, not SQLite transaction.

```typescript
// OLD (SQLite):
const addFromRecipe = async (ingredients, recipeTitle) => {
  const merged = mergeIngredientsIntoGrocery(items, ingredients, recipeTitle)
  // DELETE all + INSERT all in transaction
}

// NEW (Firestore):
const addFromRecipe = async (recipeId, ingredients) => {
  for (const ingredient of ingredients) {
    const normalized = ingredient.name.toLowerCase().trim()
    
    // Find existing item
    const existing = await findExistingGroceryItem(normalized, ingredient.unit)
    
    if (existing) {
      // Append source to array
      await updateDoc(doc(db, 'groceryItems', existing.id), {
        sources: arrayUnion({
          sourceId: recipeId,
          sourceType: 'recipe',
          sourceName: recipeName,
          quantity: ingredient.quantity
        }),
        totalQuantity: existing.totalQuantity + ingredient.quantity
      })
    } else {
      // Create new
      await addDoc(collection(db, 'groceryItems'), {
        name: ingredient.name,
        unit: ingredient.unit,
        sources: [{
          sourceId: recipeId,
          sourceType: 'recipe',
          sourceName: recipeName,
          quantity: ingredient.quantity
        }],
        totalQuantity: ingredient.quantity,
        isChecked: false,
        familyId: user.familyId,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      })
    }
  }
}
```

**Critical:** Firestore doesn't have transactions like SQLite. Instead:
- Find → Check existing
- If exists: arrayUnion (Firestore op that safely appends)
- If new: addDoc
- No roll-back if fails mid-way (accept eventual consistency)

**Alternative (better):** Use Firestore Cloud Function for atomic aggregation. But skip for now (add Sprint 10 if needed).

**Testing:**
- Add Lasagna (3 items) → appears in grocery
- Add Spaghetti (overlap) → qtys sum, sources append
- Offline add → queued, synced when online
- Two people add same item → both synced correctly

**Done when:**
- addFromRecipe works
- Merging in Firestore tested
- Real-time grocery updates

---

### SPRINT 7: Offline Persistence (1 dag)

**Wat je doet:**

Enable offline mode. Data cached locally, synced when online.

**In Firebase config.ts:**
```typescript
import { enableIndexedDbPersistence } from '@react-native-firebase/firestore'

await enableIndexedDbPersistence(db)
```

**Test:**
- [ ] Go offline (airplane mode)
- [ ] View recipes (cached data shows)
- [ ] Add boodschap (queued locally)
- [ ] Go online (auto-sync)
- [ ] Check Firestore console (appears)

**Done when:**
- Offline mode works
- Data persists across app restart
- Sync happens transparently

---

### SPRINT 8: Multi-user Sync Test (1 dag)

**Wat je doet:**

Test real-time sync across 2 devices.

**Setup:**
- [ ] Two devices (or simulators)
- [ ] Same Firebase project
- [ ] Same family account (or two accounts in same family)

**Test flows:**
- [ ] Device A adds recipe → Device B sees it (within 1 sec)
- [ ] Device A checks boodschap → Device B sees checked
- [ ] Device A edits recipe → Device B sees update
- [ ] Device A offline, adds item → goes online → Device B sees it

**Deal with conflicts:**
- Two people edit same recipe simultaneously
  - Last write wins (Firestore behavior)
  - Document shows latest updatedAt

**Done when:**
- All flows tested, no crashes
- Sync feels snappy (<1 sec)

---

### SPRINT 9: Remove Source from Grocery (1.5 dag)

**Wat je doet:**

Enable removing a specific source from a grocery item.

**Example:**
- Tomaat has sources: [Lasagna:1, Spaghetti:1, Manual:3]
- User swipes → Remove Lasagna
- Result: Tomaat has sources: [Spaghetti:1, Manual:3], totalQty: 4

**UI:**
- Long-press source tag → delete option
- Or swipe item → "Remove Lasagna" button appears

**Code:**
```typescript
const removeSource = async (itemId: string, sourceId: string) => {
  const item = groceryItems.find(i => i.id === itemId)
  const filtered = item.sources.filter(s => s.sourceId !== sourceId)
  
  if (filtered.length === 0) {
    // No more sources → delete entire item
    await deleteDoc(doc(db, 'groceryItems', itemId))
  } else {
    // Recalc qty and update
    const newQty = filtered.reduce((sum, s) => sum + s.quantity, 0)
    await updateDoc(doc(db, 'groceryItems', itemId), {
      sources: filtered,
      totalQuantity: newQty
    })
  }
}
```

**Done when:**
- Remove source works
- Qty recalculates
- Item deleted if no sources remain

---

### SPRINT 10: Polish + Testing (1.5 dag)

**Wat je doet:**

- [ ] UI Polish (animations, empty states, loading)
- [ ] Error handling (network errors, Firebase errors)
- [ ] Performance (lazy load, pagination if 100+ recipes)
- [ ] QA: iOS + Android + Web
- [ ] Offline stress test (add 20 items offline → sync)

**Checklist:**
- [ ] No console errors
- [ ] No TypeScript warnings (strict mode)
- [ ] Crashes on edge cases handled
- [ ] Feels responsive (no jank)
- [ ] Works on iOS notch, Android nav bar

**Done when:**
- App feels production-ready
- No crashes found in QA

---

### SPRINT 11: Advanced Features (Nice-to-have)

Pick 1-2 based on priority:

**Option A: Image Upload**
- Camera/gallery picker
- Upload to Firebase Storage
- Show in recipe detail

**Option B: Allergen Tracking**
- Tag ingredients with allergens
- Filter recipes
- Show warnings in grocery

**Option C: Week Planning**
- Calendar view
- Drag recipes to days
- Auto-aggregate to grocery

**Option D: Dark Mode**
- Theme toggle
- Persist preference
- Apply globally

**Done when:**
- Feature works + tested

---

### SPRINT 12: Production Deploy (1 day)

**Wat je doet:**
- [ ] Firebase production rules review (security)
- [ ] EAS build (iOS + Android)
- [ ] Sentry error tracking setup
- [ ] Analytics setup (optional)
- [ ] TestFlight + Play Console beta

**Done when:**
- App installable on real devices
- Works end-to-end

---

## DEEL 2: CLAUDE CODE PROMPTS (Token-efficient)

### PROMPT TEMPLATE

```
FEATURE: [Name]

BUILD:
- [Component/Hook 1]
- [Component/Hook 2]

FILES:
- types/xxx.ts
- hooks/useXxx.ts
- components/Xxx.tsx

RULES:
- TypeScript strict
- No console.log
- Error boundaries
- Cleanup listeners (useEffect return)

SELF-REVIEW BEFORE SHIP:
- [ ] Builds without errors
- [ ] No TS warnings
- [ ] No memory leaks
- [ ] Handles offline
- [ ] UI responsive
- [ ] Empty states
- [ ] Loading states

SHIP ONLY IF: ALL ✅
```

---

### SPRINT 1 PROMPT: SourceLineage Refactor

```
FEATURE: Refactor GroceryItem → SourceLineage

UPDATE:
types/grocery.ts:
- SourceLineage: { sourceId, sourceType, sourceName, quantity }
- GroceryItem: sources: SourceLineage[], totalQuantity (auto)

REFACTOR:
utils/merge.ts:
- mergeIngredientsIntoGrocery(items, ingredients, recipeId, recipeName)
- Track sourceId (not just name)
- Append source (not replace)
- Calc totalQuantity = sum(sources.qty)
- Handle duplicate sourceId

TEST:
- Add Lasagna (1 tomato) → sources: [{id: "recipe-abc", qty: 1}]
- Add Spaghetti (1 tomato) → sources: [{id: "recipe-abc", qty: 1}, {id: "recipe-def", qty: 1}]
- Remove Lasagna → sources: [{id: "recipe-def", qty: 1}], totalQty: 1

SELF-REVIEW:
- [ ] Types compile
- [ ] Merge logic tested (above scenarios)
- [ ] totalQuantity always = sum
- [ ] No duplicate sourceIds

SHIP ONLY IF: Tests pass, no duplicates
```

---

### SPRINT 3 PROMPT: Firebase Setup + Auth

```
FEATURE: Firebase + Auth basics

CREATE:
firebase/config.ts:
- initializeApp(firebaseConfig)
- Export db, auth

hooks/useAuth.ts:
- onAuthStateChanged listener
- login(email, password)
- logout()
- return { user, loading }

app/(auth)/login.tsx:
- Email + password inputs
- Login button
- Error message display

RULES:
- Use environment variables for config
- No hardcoded keys
- Listener cleanup on unmount
- Auth state persists

SELF-REVIEW:
- [ ] Firebase connects (check console)
- [ ] Login works
- [ ] Logout clears user
- [ ] State persists on app restart
- [ ] No API keys exposed

SHIP ONLY IF: Login → tabs works end-to-end
```

---

### SPRINT 4 PROMPT: Firestore Schema

```
FEATURE: Firestore types + security rules

CREATE:
types/firestore.ts:
- User interface
- Family interface
- Recipe interface
- GroceryItem interface (with SourceLineage)

firebase/schema.ts (commented):
- Security rules (read/write per collection)
- Family-scoped access
- createdBy permission checks

RULES:
- Use Timestamps, not Date
- Optional fields = undefined
- All IDs auto-generated
- familyId on every doc (for permission scoping)

SELF-REVIEW:
- [ ] All types exported
- [ ] Types match Firestore structure
- [ ] Rules reviewed (no obvious holes)
- [ ] familyId consistent

SHIP ONLY IF: Types compile, rules make sense
```

---

### SPRINT 5 PROMPT: Migrate useRecipes

```
FEATURE: useRecipes SQLite → Firestore

REPLACE:
hooks/useRecipes.ts:
- Remove useSQLiteContext()
- Add useAuth() for familyId
- Replace RecipeRepository with Firestore queries

NEW useRecipes:
- onSnapshot listener (real-time recipes)
- create(input): addDoc + serverTimestamp
- update(id, changes): updateDoc
- delete(id): deleteDoc
- getById(id): find in store

RULES:
- Server timestamps (not client)
- familyId scoped queries
- Listener cleanup on unmount
- Error handling (try-catch)

SELF-REVIEW:
- [ ] No TS warnings
- [ ] Listener unsubscribes
- [ ] CRUD all work
- [ ] Real-time updates in store
- [ ] Firestore console shows data

STRESS TEST:
- Create recipe → appears instantly
- Edit → Firestore updates in <1sec
- Delete → gone from store

SHIP ONLY IF: CRUD works, real-time tested
```

---

### SPRINT 6 PROMPT: Migrate useGrocery + addFromRecipe

```
FEATURE: useGrocery SQLite → Firestore (with aggregation)

REPLACE:
hooks/useGrocery.ts:
- Remove useSQLiteContext()
- Add useAuth()
- Replace GroceryRepository with Firestore

NEW logic:
addFromRecipe(recipeId, recipeName, ingredients):
  for each ingredient:
    normalized = ingredient.name.trim().lowercase
    
    query groceryItems WHERE name == normalized AND unit == ingredient.unit
    
    if exists:
      arrayUnion new source to sources array
      update totalQuantity
    else:
      create new GroceryItem with source

RULES:
- arrayUnion (Firestore op, safe append)
- Server timestamps
- familyId scoped
- Offline queue (Firestore handles)

SELF-REVIEW:
- [ ] Add from recipe works
- [ ] Sources merge correctly
- [ ] totalQuantity auto-updates
- [ ] No duplicate sources
- [ ] Offline queueing works
- [ ] Real-time sync

STRESS TEST:
- Add Lasagna (3 items) → all appear
- Add Spaghetti (1 overlap) → Tomaat qty increases
- Two people add same recipe → no duplicates

SHIP ONLY IF: Aggregation tested, no duplicates
```

---

### SPRINT 9 PROMPT: Remove Source

```
FEATURE: Remove specific source from grocery item

ADD:
hooks/useGrocery.ts:
- removeSource(itemId, sourceId)

LOGIC:
- Find item by id
- Filter out source
- Recalc totalQuantity = sum remaining
- If no sources left: deleteDoc(item)
- Else: updateDoc(item, { sources: filtered, totalQuantity: newQty })

UI:
components/GrocerySourceTag.tsx:
- Long-press or swipe → delete option
- Call removeSource on confirm

RULES:
- sourceId must match exactly
- Delete entire item if no sources remain
- Real-time update

SELF-REVIEW:
- [ ] Remove works
- [ ] Qty recalculates
- [ ] Item deleted if empty
- [ ] No orphaned items
- [ ] Real-time syncs

SHIP ONLY IF: Remove tested, qty correct
```

---

## CHECKLISTE VOOR PRODUCTION

- [ ] All Firestore rules reviewed (security)
- [ ] No console.log in production
- [ ] Error boundaries on all screens
- [ ] Offline mode tested (add 20+ items offline → sync)
- [ ] Real-time sync tested (2+ devices)
- [ ] Images load correctly
- [ ] TypeScript strict: no warnings
- [ ] No memory leaks (React DevTools)
- [ ] iOS + Android builds pass
- [ ] Web responsive
- [ ] All screens handle notch/nav safe areas
- [ ] Loading states on all async operations

---

## GIT WORKFLOW

```bash
git checkout -b sprint/01-source-lineage-refactor
# Make changes
# Test locally
git commit -m "refactor: GroceryItem → SourceLineage design"
git push

# When done
git checkout main
git merge sprint/01-source-lineage-refactor
```

---

## SUMMARY

| Sprint | What | Days | Status |
|--------|------|------|--------|
| 0 | Code review | 0.5 | Prep |
| 1 | SourceLineage refactor | 1.5 | **Critical** |
| 2 | UI update for sources | 1 | UI |
| 3 | Firebase + auth | 1.5 | Backend |
| 4 | Firestore schema | 1 | Design |
| 5 | Migrate useRecipes | 2 | Core |
| 6 | Migrate useGrocery | 2 | **Complex** |
| 7 | Offline persistence | 1 | Feature |
| 8 | Multi-user sync test | 1 | QA |
| 9 | Remove source | 1.5 | Feature |
| 10 | Polish + testing | 1.5 | Polish |
| 11 | Advanced (pick 1) | 1-2 | Nice-to-have |
| 12 | Deploy | 1 | Ship |
| | | **~18 days** | |

**Realistically:** With V0.1.2 already done, this is 3-4 weeks fulltime, or 6-8 weeks part-time.

---

## NOTES

- SourceLineage refactor is **first priority** — foundation for everything
- Firebase migratie keeps all UI intact — low risk
- Offline persistence built-in — no extra work
- Real-time sync just works — Firestore magic
- Token-efficient prompts — small, focused
- Each sprint = tested before moving on

Ready to start Sprint 0? 🚀

