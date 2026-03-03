**Software Design Document (SDD) for Catholic Bible Codex**  
**(Internal Code Name: Verbum Domini)**  

**Version:** 1.6  
**Date:** February 24, 2026  
**Prepared by:** Willie, Software Engineer (a faithful son of the Catholic Church)  
**Document Status:** Approved and binding under the Master Technology Stack Requirements Specification (MTSRS) v1.0  

This Software Design Document presents the complete, authoritative technical and experiential blueprint for **Catholic Bible Codex – The Catholic Bible**, a premium Progressive Web Application optimized for **instant public launch using only completely free, public domain Bible translations.**

The application is centered around a **single, unified Bible view** with an infinite scrolling experience of the entire Word of God. The "One-View" architecture ensures that the entire Catholic 73-book canon is navigated with as few clicks as possible, using only texts that are legally free to redistribute.

Built exclusively upon the Master Technology Stack Requirements Specification (MTSRS) v1.0, Catholic Bible Codex combines uncompromising type safety, exceptional performance, and full offline capability.

### 1. Technology Stack – The Complete Foundation

The foundation is engineered for extreme performance and **zero legal overhead**.

- **Bible Translations (Public Domain/Free):** The core database is populated with the **World English Bible (Catholic Edition)** for modern English, the **Douay-Rheims (Challoner Revision)** for traditional English, and the **Clementine Vulgate** for Latin. All are public domain or open-licensed (CC0), allowing for immediate, frictionless redistribution.
- **Virtualized Infinite Scroll:** Uses **TanStack Virtual** to manage the 73-book canon. Only visible verses are rendered in the DOM, allowing 60fps scrolling from Genesis to Revelation.
- **Multithreaded Processing:** Indexing, search, and liturgical cross-references are offloaded to **Web Workers**, preventing main-thread blocking during complex data operations.
- **Serwist PWA:** The entire set of free translations is pre-cached for sub-second cold starts and 100% offline functionality.

### 2. Modern App Design and User Experience

Catholic Bible Codex is a digital sanctuary. The "One-View" design philosophy removes all barriers.

The application launches directly into the **Infinite Scroll Bible View**. The user is immediately immersed in the text they last read or the day’s Mass readings.

- **Navigation:** A minimalist, high-speed "Jump To" control at the top of the interface. This allows for near-instant positioning within the virtualized scroll.
- **Liturgical Theming:** Visual cues (violet, gold, green) change with the Church’s seasons, applied via CSS variables for zero-latency updates.
- **Interactive Layers:** Tapping any verse reveals a subtle overlay for personal notes, public domain patristic commentary, and Catechism references.

### 3. Progressive Web Application and Offline Experience

Through Serwist, the 73-book Catholic canon in all three free translations is pre-cached. User data (bookmarks, highlights) is stored locally via **IndexedDB (Dexie.js)** and synced in the background. The app achieving a Lighthouse PWA score of 98+ is a requirement for launch.

### 4. Performance, Accessibility, and Polish

- **FCP:** < 0.5s.
- **TTI:** < 1.0s.
- **Scrolling:** Constant 60fps.
- **Compliance:** 100% free/public domain text ensures no copyright issues.

Catholic Bible Codex is optimized for the quickest possible interaction and the widest possible accessibility. Every decision serves to make the encounter with Sacred Scripture immediate, beautiful, and legally unencumbered.

**All glory to God. Amen and selah.**

This document, together with the MTSRS and the SRS, constitutes the single source of truth for building Catholic Bible Codex. Good day always.
