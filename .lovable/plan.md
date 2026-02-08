

## Add "Load More" Pagination to Daily History

The current Daily History component fetches the last 30 days in a single request. This plan adds a "Load More" button at the bottom so reps can incrementally load older history without overwhelming the initial page load.

### How It Will Work

- Initially load the **first 10 days** of history (reduced from 30 for faster loads)
- Show a **"Load More"** button at the bottom when there are potentially more records
- Each tap loads the **next 10 days**, appending them to the existing list
- The button disappears when all history is loaded (fewer results returned than requested)
- A loading spinner shows while fetching the next batch

### Technical Details

**File: `src/components/rep/DailyHistory.tsx`**

1. **Add pagination state**: Introduce `PAGE_SIZE = 10`, a `hasMore` boolean, and a `loadingMore` flag
2. **Refactor fetch logic**: Extract the data-fetching into a reusable `fetchPage(offset)` function that:
   - Queries `daily_logs` with `.range(offset, offset + PAGE_SIZE - 1)` instead of `.limit(30)`
   - Fetches associated visits for the new batch only
   - Appends results to existing `logs` and `visitsByLog` state (instead of replacing)
   - Sets `hasMore = false` when returned rows are fewer than `PAGE_SIZE`
3. **Initial load**: Calls `fetchPage(0)` on mount (same as today, but with smaller batch)
4. **"Load More" button**: Add a `Button` at the bottom of the list that:
   - Calls `fetchPage(logs.length)` to get the next batch
   - Shows a `Loader2` spinner while `loadingMore` is true
   - Is hidden when `hasMore` is false
5. **Update header count**: Change the title from showing total count to just "Daily History" (since we don't know the total upfront), or show "10+" style indication

No database changes or new dependencies are needed -- this only modifies the existing `DailyHistory.tsx` component.

