Current Progress Audit
   1. Immersive Reader & Library:
       * Completed: A high-performance, virtualized "One-View" reader with infinite scroll. The Library is compact and allows for 3-click navigation (Library → Book → Chapter).
       * Under the Hood: Multithreaded Web Workers handle the heavy lifting of processing the 73-book canon.
   2. Offline-First (PWA):
       * Partial: Service Worker (Serwist) is configured to cache JSON data and assets. Dexie.js is set up for local storage.
       * Missing: A robust "Sync Status" indicator and explicit offline state management.
   3. Note-taking & Personal Study:
       * Partial: VerseOverlay supports highlighting, bookmarking, and local note-taking (Markdown enabled).
       * Missing: Cloud sync for notes (they currently only live in IndexedDB) and a "Notes" tab in the sidebar to browse all personal reflections.
   4. Liturgical Integration:
       * Completed: Daily Mass readings are integrated into the scroll and have a dedicated navigator.
   5. Accounts & Security:
       * Foundation Only: NextAuth v5 is present but has no providers (Google/OAuth) configured. There is no "User Profile" UI.
   6. Progress Saving:
       * Foundation Only: Reading position is tracked in Zustand but is not yet persisted across sessions or synced to an account.

  ---

  Strategic Plan: The "City of Jerusalem" Expansion
  I will now take over development to implement the following features, focusing on compactness and architectural precision.

  Phase 1: Sovereignty & Continuity (Accounts & Progress)
   * Action: Configure Google/OAuth providers in authConfig.
   * Action: Implement Automatic Progress Persistence. Save the currentOrder to the database (if logged in) or LocalStorage (if guest) so the user always returns to where they left off.
   * Action: Create a minimalist "Account" tab in the sidebar nav for sign-in/profile.

  Phase 2: The Archive (Advanced Note Management)
   * Action: Add a "Journal" tab to the sidebar. This will be a compact, chronological list of all highlights and notes across the Bible.
   * Action: Implement Server Actions to sync IndexedDB notes to the PostgreSQL database for cross-device availability.

  Phase 3: The Wall (Security & Polish)
   * Action: Implement Middleware for protected routes (notes/profile).
   * Action: Add a "Sync Status" pillar in the footer to show when the City (app) is fully cached and synced.
