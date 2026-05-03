# 🔍 CODE REVIEW: RECEPTEN APP V0.1.2
## Senior App Developer Analysis - Recepten & Boodschappen App

**Review datum:** Mei 2026  
**Reviewer:** Senior App Developer (Expo + GitHub + React Native specialist)  
**Project:** Recepten App - Sprint 11 - Migratie naar Firebase-ready structuur

---

## 📋 EXECUTIVE SUMMARY

✅ **CODE KWALITEIT: 7.5/10**
- Goed structured project met TypeScript
- Solide patterns: Zustand store, repository pattern, hooks
- Clean separation of concerns (database, types, utils)
- **Maar:** Enkele kritieke issues in de huidige architectuur

⚠️ **KRITIEKE BEVINDINGEN:**
1. **Merge logica in `hooks.ts` is onschaalbaar** → DELETE + REINSERT strategy slecht voor multi-user
2. **Geen error handling in transacties**
3. **Image storage cleanup incompleet**
4. **Veel potentieel voor data inconsistency**

✨ **STERKTES:**
- Goed getypede codebase (TypeScript 5.3.3)
- Zustand state management is lean
- Database schema met WAL mode is production-ready
- Recipe Parser framework aanwezig

---

## 🏗️ ARCHITECTUUR ANALYSE

### 1. PROJECTSTRUCTUUR - SCORE: 8/10

**Layout:**
```
V0.1.2/
├── app/                    # Expo Router routes
├── components/             # Shared UI
├── database/               # SQLite init + schema
├── features/               # Domain logic (recipes, grocery)
├── services/               # Business logic (parser, sync)
├── store/                  # Zustand stores
├── types/                  # Type definitions
└── utils/                  # Helpers
```

✅ **GOED:**
- Feature-based organization
- Clear separation: types → repository → hooks → components
- Zustand store is lightweight
- `utils/merge.ts` shows good domain logic extraction

❌ **ISSUES:**
- `services/sync/` folder exists but empty (future Firebase?)
- No `utils/logger.ts` for debugging
- Image storage path not documented

---

### 2. DATABASE LAYER - SCORE: 8/10

**`database/schema.ts` & `database/index.ts`:**

✅ **GOED:**
```typescript
- WAL mode enabled (concurrent reads)
- Foreign keys enforced
- Migrations system in plaats (PRAGMA user_version)
- JSON storage voor nested arrays (ingredients, steps)
```

✅ **STERK:**
```typescript
// Correct migration pattern
const currentVersion = result?.user_version ?? 0;
for (let i = currentVersion; i < MIGRATIONS.length; i++) {
  try {
    await db.execAsync(MIGRATIONS[i]);
  } catch {
    // Column already exists — safe to ignore
  }
}
```

❌ **PROBLEMEN:**

**PROBLEEM #1: Migraties zijn fragiel**
```typescript
// Line 33: Deze migratiehandelt aanname dat 'quantity' kolom bestaat
UPDATE grocery_items SET total_quantity = quantity 
WHERE total_quantity = 0 AND quantity > 0
```
- **ISSUE:** Geen `quantity` kolom in huidige schema!
- **RISK:** Eerste user krijgt SQL error
- **FIX:** Voeg conditional logic toe of drop deze migratie

**PROBLEEM #2: Schema updates direct in CREATE statements**
- Beter: Alle kolommen in CREATE, extra via migrations

---

### 3. REPOSITORY PATTERN - SCORE: 7.5/10

#### **recipes/repository.ts - Goed** ✅
```typescript
- Type-safe row transformations (RecipeRow → Recipe)
- CRUD operations zijn clean
- Image deletion op delete/update
- Correct NULL handling (sourceUrl, imageUri)
```

#### **grocery/repository.ts - PROBLEEM!** ❌

**PROBLEEM #1: Transaction handling in hooks, niet in repository**
```typescript
// In features/grocery/hooks.ts line 50-67
// BUG: DELETE all + INSERT all is WRONG for multi-user
const addFromRecipe = useCallback(
  async (ingredients: Ingredient[]): Promise<void> => {
    const merged = mergeIngredientsIntoGrocery(items, ingredients, recipeId, recipeName);
    
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM grocery_items');  // ← WIPES EVERYTHING!
      for (const item of merged) {
        // Re-insert all
      }
    });
  },
  [db, items, setItems],
);
```

**WHY THIS IS CRITICAL:**
- Stel: User 1 voegt ingredient A toe
- Ondertussen: User 2 voegt ingredient B toe
- User 1's transaction: DELETE ALL → INSERT A only
- **RESULT:** User 2's B is VERLOREN!

**FIX:** Upsert pattern in plaats van delete-all
```typescript
// Better:
for (const item of merged) {
  await db.runAsync(
    `INSERT INTO grocery_items (...) VALUES (...)
     ON CONFLICT(id) DO UPDATE SET ...`,
    [...]
  );
}
```

---

### 4. ZUSTAND STORE - SCORE: 8/10

**store/recipeStore.ts & store/groceryStore.ts:**

✅ **GOED:**
- Minimalistisch, geen extra complexity
- Clear action naming
- `hasLoaded` flag prevents duplicate fetches

❌ **LICHTE ISSUES:**
```typescript
// Line 32 in recipeStore: updatedAt timestamp is LOCAL
updateRecipeInStore: (id, updates) =>
  set((state) => ({
    recipes: state.recipes.map((r) =>
      r.id === id 
        ? { ...r, ...updates, updatedAt: new Date().toISOString() } // ← Client time!
        : r
    ),
  })),
```

**PROBLEM:** Voor Firebase sync zal je server-time nodig hebben
- **FIX:** Laat `updatedAt` uit de local update, sync vanuit DB

---

### 5. TYPES - SCORE: 9/10

**types/recipe.ts & types/grocery.ts:**

✅ **EXCELLENT:**
- Discriminated unions (`RecipeCategory` as const)
- Proper type narrowing
- `computeTotalQuantity` geëxporteerd (utility!)
- `SourceLineage` object is perfect voor multi-source tracking

```typescript
// types/grocery.ts
export interface SourceLineage {
  sourceId: string;
  sourceType: 'recipe' | 'manual';
  sourceName: string;
  quantity: number;
}
```

✅ **Dit is toekomstproof voor Firebase!**

---

### 6. MERGE LOGIC - SCORE: 7/10

**utils/merge.ts - Core business logic**

✅ **SMART RULES:**
```typescript
// Same recipe re-added: overwrite (idempotent)
// Different recipe: append source
// Different unit: separate row
```

⚠️ **MAAR ACHTUNG:**

**Issue #1: removeSourceFromGrocery filter is veilig**
```typescript
// Line 101: Correct filtering
.filter((item) => item.totalQuantity > 0 || item.sources.length > 0);
```
✅ Goed!

**Issue #2: Performance bij grote lijsten**
```typescript
// Line 30: O(n) findIndex voor elk ingredient
const matchIndex = result.findIndex((item) =>
  item.name.toLowerCase().trim() === normalizedName &&
  areUnitsCompatible(item.unit, normalizedUnit)
);
```
- **IMPROVEMENT:** Bij >100 items: maak lookup map
- Niet critical nu, maar onthouden

---

### 7. HOOKS LAYER - SCORE: 6.5/10

#### **features/recipes/hooks.ts - SOLID** ✅
```typescript
- Lazy loading met hasLoaded flag
- Proper error logging
- useCallback memoization correct
```

#### **features/grocery/hooks.ts - DESIGN ISSUES** ⚠️

**Issue #1: Massive hook, alles in één plaats**
- 7 actions: addManual, addFromRecipe, removeSource, removeSingleSource, toggleChecked, remove, clearChecked
- 160+ lines
- **BETER:** Split in 2 hooks: useGroceryCore + useGroceryRecipes

**Issue #2: Transaction logic in hooks**
```typescript
// Line 50-67 & 78-95: Duplicate transaction code
// ← Should be repository method
```

**Issue #3: State sync bugs**
```typescript
// Line 145-146: clearChecked do full reload
const updated = await GroceryRepository.getAll(db);
setItems(updated);
```
**PROBLEM:** Daarmee verlies je cached state als DB slow is
**BETTER:** Local update first, optim

---

### 8. COMPONENT STRUKTUR - QUICK CHECK

**components/ui/colors.ts:**
✅ Centralized colors (good for theming)

**UI Components:** (zonder full code review)
- AppTextInput.tsx
- Button.tsx  
- Card.tsx
- EmptyState.tsx
- RecipeCard.tsx
- GroceryItem.tsx

✅ **Verwachting:** Props-based, reusable, styled  
✅ **Gestuurd:** Zustand stores, proper typing

---

## 🚨 KRITIEKE ISSUES (Fix antes de producción)

### ISSUE #1: DELETE-ALL-REINSERTION PATTERN ⚠️⚠️⚠️

**File:** `features/grocery/hooks.ts` lines 50-67, 78-95  
**Severity:** CRITICAL (multi-user data loss)

**Current:**
```typescript
await db.withTransactionAsync(async () => {
  await db.runAsync('DELETE FROM grocery_items');  // WIPES ALL
  for (const item of merged) {
    await db.runAsync('INSERT INTO...');
  }
});
```

**Problems:**
1. Another user's concurrent write gets lost
2. No upsert logic
3. Violates transaction isolation

**Action Items:**
- [ ] Replace con UPSERT (INSERT ... ON CONFLICT)
- [ ] Test with concurrent writes
- [ ] Add transaction ID tracking

---

### ISSUE #2: Migration #4 References Non-Existent Column

**File:** `database/schema.ts` line 33

```typescript
UPDATE grocery_items SET total_quantity = quantity 
WHERE total_quantity = 0 AND quantity > 0
```

**Problem:**
- `quantity` column NEVER exists in schema
- First run fails
- Workaround is catch-all (line 18) is HIDING error

**Fix:**
```typescript
// Option 1: Remove migration (quantity was never in schema)
// Option 2: Make it conditional
```

---

### ISSUE #3: Image Storage Cleanup Incomplete

**Files:** 
- `features/recipes/repository.ts` lines 79-81
- `features/recipes/repository.ts` lines 103-104

```typescript
if (changes.imageUri && current.imageUri !== changes.imageUri && current.imageUri) {
  await deleteRecipeImage(current.imageUri);
}
```

**Problem:**
- Only deletes if imageUri CHANGES
- On recipe DELETE, cleans up (OK)
- On recipe UPDATE with new image, old image deleted (OK)
- **BUT:** What if user removes image from edit? (imageUri = undefined)

**Missing:** Update path for: image DELETE case

```typescript
// MISSING CASE:
if (changes.imageUri === undefined && current.imageUri) {
  await deleteRecipeImage(current.imageUri);
  // THEN continue with NULL update
}
```

---

### ISSUE #4: Missing Error Boundaries & Logging

**Severity:** MEDIUM

**Problem:**
- `features/grocery/hooks.ts` line 31 has try-catch ✅
- `features/recipes/hooks.ts` line 29 just calls console.error ❌
- No structured logging for app-wide error tracking

**Action:**
- [ ] Create `utils/logger.ts` with error tracking
- [ ] Add error boundaries in app/_layout
- [ ] Implement recovery strategies

---

### ISSUE #5: No Input Validation

**Files:** repository.ts create methods

```typescript
async create(db: SQLiteDatabase, input: RecipeInput): Promise<Recipe> {
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO recipes (...)`,
    [
      id,
      input.title,  // ← No validation!
      JSON.stringify(input.ingredients),  // ← Could fail
      // ...
    ]
  );
}
```

**Problems:**
1. Empty title allowed
2. JSON.stringify could throw
3. No max-length validation
4. Special characters in SQL not escaped (but using params, so OK)

**Fix:**
```typescript
// Add validator
export function validateRecipeInput(input: RecipeInput): string[] {
  const errors: string[] = [];
  if (!input.title?.trim()) errors.push('Title required');
  if (input.title.length > 200) errors.push('Title too long');
  if (!Array.isArray(input.ingredients)) errors.push('Invalid ingredients');
  return errors;
}
```

---

## 📋 CODE QUALITY METRICS

| Aspect | Score | Status |
|--------|-------|--------|
| **Type Safety** | 9/10 | ✅ Excellent |
| **Architecture** | 8/10 | ✅ Good |
| **Error Handling** | 5/10 | ⚠️ Needs work |
| **Testing** | 0/10 | ❌ None found |
| **Documentation** | 6/10 | ⚠️ Some good comments |
| **Performance** | 7/10 | ✅ Decent |
| **Security** | 7/10 | ✅ OK (no auth layer) |

**OVERALL: 6.9/10** → Good foundation, needs hardening

---

## 🛠️ RECOMMENDATIONS

### SHORT TERM (Sprint 12)

1. **FIX DELETE-ALL BUG**
   - [ ] Replace with UPSERT pattern
   - [ ] Write integration tests
   - Priority: CRITICAL

2. **ADD INPUT VALIDATION**
   - [ ] Recipe form validation
   - [ ] Grocery item validation
   - Priority: HIGH

3. **FIX IMAGE CLEANUP**
   - [ ] Handle removal cases
   - [ ] Add cleanup on app uninstall
   - Priority: MEDIUM

4. **MIGRATE ERROR HANDLING**
   - [ ] Create logger.ts
   - [ ] Add error boundaries
   - [ ] Error UI feedback
   - Priority: HIGH

### MEDIUM TERM (Sprint 13-14)

5. **SPLIT HOOKS**
   - [ ] useGroceryCore (CRUD)
   - [ ] useGroceryRecipes (recipe integration)
   - [ ] useRecipeForm (form state)

6. **ADD LOGGING**
   - [ ] Structured logging
   - [ ] Performance tracking
   - [ ] Crash reporting

7. **PERFORMANCE**
   - [ ] Implement name lookup map for merge
   - [ ] Add pagination for recipe list
   - [ ] Memoize computations

### LONG TERM (Sprint 15+)

8. **TESTING**
   - [ ] Unit tests for merge.ts
   - [ ] Integration tests for hooks
   - [ ] E2E tests for user flows

9. **FIREBASE MIGRATION**
   - Reuse types ✅
   - Replace repository ✅
   - Add real-time listeners
   - Implement offline sync

---

## 📸 NEXT STEP: Screenshots

Zegde dat je screenshots gaat toevoegen. Laat die zien zodat ik:
- ✅ UI implementation review kan doen
- ✅ Flow/UX patterns kan controleren
- ✅ Accessibility issues kan spottten
- ✅ Design consistency kan valideren

---

## 📄 GITHUB BEST PRACTICES CHECK

**Setup:**
✅ package.json is clean  
✅ .gitignore verwacht (niet geupload, correct)  
✅ TypeScript strict mode (assuming tsconfig)

**Recommendations:**
1. Add `.github/workflows/` for CI/CD
2. Create PULL_REQUEST_TEMPLATE.md
3. Setup branch protection rules
4. Add CONTRIBUTING.md

---

## ✅ CONCLUSION

**Your codebase is 60% there.** The foundation is solid:
- Good type system
- Clean architecture
- Smart business logic

**But there are 5 critical issues that MUST be fixed before:**
- Multi-user sync
- Firebase migration
- Production deployment

**Next action:** Share the screenshots, then we'll create a sprint plan to fix these issues systematically.

---

**Rating: 6.9/10** → "Good, but harden before Firebase"

---

**Senior Developer Signature:**  
*Reviewed with production-readiness in mind. Ready for sprint planning.*
