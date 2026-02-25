# Peaky App

This app shows silhouettes of mountain ridges. The ridges are calculated using NASAs SRTM data.

## Development

Run a web based version using `npx ionic serve`

## Build

```
npx ionic build
```
Step 2: Add support for the Android platform
```
npx ionic capacitor add android
```
Step 3: Sync changes from your Ionic project to the Android part
```
npx ionic capacitor sync
```
Step 4: Build for Android and generate apk
```
cd android && ./gradlew assembleDebug && cd ..
```

Optional: Build for release
```
cd android && ./gradlew assembleDebug && cd ..
```

