# Development Setup

## Demo Application

This repository includes a demo application located in the `src/` directory that showcases the model-cropper library.

### Running the Demo App

To run both the library in watch mode and the demo application:

```bash
npm run dev
```

This command will:

1. Build the library in production mode first
2. Start the library in watch mode (automatically rebuilds on changes)
3. Start the Angular dev server for the demo app (with a 3-second delay to ensure the library is ready)

The demo app will be available at: **http://localhost:4200/**

### Available Scripts

- `npm run dev` - Run both library watch and demo app together
- `npm run start` - Run only the demo app (requires library to be built first)
- `npm run watch:lib` - Run only the library in watch mode
- `npm run build:lib` - Build the library for production
- `npm test` - Run tests
- `npm run lint` - Lint the code
- `npm run format` - Format code with Prettier

### Demo App Features

The demo application demonstrates:

- Loading 3D models (GLB, GLTF, FBX formats)
- Interactive cropping interface
- Exporting cropped models as GLB
- Using the model-cropper component in a standalone Angular app

### Development Workflow

1. Make changes to the library code in `projects/model-cropper/`
2. The library will automatically rebuild (watch mode)
3. The demo app will automatically reload with the updated library
4. Test your changes in the browser at localhost:4200

### Note

The demo app imports the library using the path mapping configured in `tsconfig.json`:

```json
"paths": {
  "ng-three-model-cropper": ["./dist/model-cropper"]
}
```

This allows the app to use the library as if it were installed from npm, but from the local `dist` folder instead.
