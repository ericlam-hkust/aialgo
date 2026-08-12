Refactor the dashboard sidebar toggle so it lives on the sidebar edge near the logo and is easy to reach.

## What we will change
- Add a small chevron/arrow toggle button at the top edge of the sidebar (beside the logo) that collapses the sidebar to an icon-only strip and expands it back to full width.
- Keep the existing icon-only strip behavior (`w-16` collapsed, `w-60` expanded) and smooth `transition-all` width animation.
- Update the existing bottom "Collapse" button: either remove it so there is a single, consistent toggle, or keep it as a secondary duplicate only if the top edge toggle remains visible. To avoid duplicate controls, we will remove the bottom toggle and rely on the new edge toggle.
- Ensure the toggle has clear accessible labels: "Expand sidebar" / "Collapse sidebar" and `aria-controls` pointing to the sidebar navigation.
- Maintain the current sticky layout and dark-fintech styling; no new dependencies.

## Out of scope
- No changes to mobile behaviour (the sidebar remains hidden on mobile as it is today).
- No changes to the sidebar menu items, routing, or the market status bar.
