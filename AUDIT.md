# Prototype audit and repair notes

The first delivery was a rough scaffold, not a finished product. The most damaging issues were that unrelated tabs could be counted as mission branches, the first normal page after planting a mission was not reliably treated as the true origin, the New Tab resume/browse controls did not respect the active session, and Go Home did not safely close only the tracked wandering branch.

The repair pass changed the navigation model to ignore unrelated tabs unless they are already tracked, linked from a tracked tab, or opened by a tracked tab. It also adopts the first ordinary page after mission creation as the depth-0 origin, makes the New Tab controls end or resume sessions correctly, makes content registration happen before rendering intervention state, and limits Go Home tab closure to tracked branch tabs.

The build still has an important known limitation: Chrome navigation semantics are only approximated, especially around SPA navigation, redirects, search results, and manually entered URLs. The extension is intended as a usable MVP for interaction testing, not a Chrome Web Store-ready release.
