# Modular Package JSON (mpj)

A CLI tool for managing npm scripts in a modular way using YAML files. Break down your complex package.json scripts into organized, documented, and maintainable YAML files.

## Features

- 📁 Organize scripts in separate YAML files
- 🔍 Interactive fuzzy-search script runner
- 👥 Group related scripts together
- 📝 Add descriptions to your scripts
- ✅ Validate script dependencies
- 🔄 Auto-generate package.json

## Installation


## Setup

1. Create a `package` directory in your project root
2. Create a `scripts` subdirectory inside it

your-project/  
  ├── package.json  
  └── package/  
      └── scripts/  
        ├── build.yaml  
        ├── test.yaml  
        └── deploy.yaml  


### Interactive script runner with fuzzy search
`mpj run`
### Generate a preview of the package.json
`mpj parse`
### Update package.json with the scripts
`mpj write`


###   Example dev.yaml

```
scripts:
  - name: vite-port-3033
    description: Run Vite on port 3033
    command: vite
    args:
      port: 3033

  - name: dev:vite
    description: Start Vite dev server with Node 16
    commands:
      - command: turbo vite-port-3033
        node: 16

  - name: dev:electron
    description: Start Electron in development mode
    command: electron .

  - name: dev:plugins
    description: Build and watch Vite plugins
    command: vite build
    args:
      config: vite.plugins.config.ts
      watch: true

  - name: dev:web
    description: Start Vite dev server and plugins in watch mode
    command: yarn dev:vite & yarn dev:plugins

  - name: dev
    description: Start all development servers (Electron, Vite, and plugins)
    command: yarn dev:web & yarn dev:electron
```

### Example build-app-local-quick.script.yaml

```
name: build:app:local:quick
description: Quick local build of Electron app with development settings
group: build

commands:
  - yarn clean
  - yarn build:vite:plugins
  - turbo vite:build
  - command: turbo electron:bundle
    node: 16
    env:
      FAST_DEV_BUILD: true
  - command: electron-builder
    node: 16
    env:
      SKIP_SIGN: true
      FAST_DEV_BUILD: true
```

### Example: release.script.yaml

```
name: release
description: Build and publish a full release for all platforms
group: release

commands:
  - yarn clean
  - yarn
  - yarn build:vite
  - yarn electron:bundle
  - yarn node:sentry
  - command: electron-builder
    args:
      win: true
      mac: true
      linux: true
      publish: always
    env:
      ENV_FILE: .env.dev
```
