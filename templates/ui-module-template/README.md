# __module-name__ — solid-ui module

## Structure

```
__module-name__/
├── __module-name__.ui-module.ts    ← module registry (auto-discovered)
├── admin-layout/                   ← use custom-layout/ for bespoke routes
│   └── {model-name}/               ← matches the model key in SolidX
│       ├── extension-components/   ← custom React components
│       └── extension-functions/    ← event handlers
└── redux/                          ← RTK Query APIs / Redux slices (optional)
```
