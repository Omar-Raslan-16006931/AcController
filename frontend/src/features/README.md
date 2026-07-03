# features/

Feature-specific logic (hooks, components, API calls) is organized here by
domain as later modules are built, e.g.:

```
features/
  remote/
  schedules/
  timers/
  history/
  system/
```

Cross-cutting UI primitives stay in `components/ui`; shared layout pieces
stay in `components/layout`.
