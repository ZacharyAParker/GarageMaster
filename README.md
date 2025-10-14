
## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

This app is fully self-hosted and stores data in your browser's localStorage. No external services are required.

## Self-hosting

- Install dependencies
	- Windows PowerShell:
		- `npm install`
- Start the dev server
	- `npm run dev`
- Build for production
	- `npm run build`

Data is persisted in your browser via localStorage under the key `garagemaster_data_v1`. Clearing site data or using a different browser/device will reset the app. To move data, export/import the value of that key from your browser devtools.