# LaserBench

A web-based laser cutter control interface with G-code generation, serial communication, and real-time printer console.

## Features

- **G-Code Generation**: Generate laser cutting G-code from SVG paths
- **Serial Communication**: Connect to laser cutters via Web Serial API
- **Real-time Console**: Live feed of printer communication with manual command input
- **Manual Controls**: Jog controls for X/Y/Z axes, fire laser, and emergency stop
- **Material Presets**: Pre-configured settings for different materials
- **Time Estimation**: Estimate job duration based on G-code
- **Dark/Light Theme**: Toggle between dark and light interface themes
- **Machine Profiles**: Support for multiple laser cutter configurations

## Prerequisites

- Node.js (v18 or higher)
- Modern web browser with Web Serial API support (Chrome, Edge, or Opera)
- Laser cutter with serial/USB connection

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/TheRealFredP3D/LaserBench.git
   
   cd LaserBench
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

## Usage

1. **Connect to Printer**: Click "Connect" in the Printer Console to establish serial connection
2. **Load SVG**: Upload an SVG file to generate G-code
3. **Configure Settings**: Adjust power, speed, and other parameters for your material
4. **Generate G-Code**: Click "Generate G-Code" to create the cutting path
5. **Preview**: Review the generated G-code in the output panel
6. **Print**: Send G-code to the printer and monitor progress in the console

## Manual Controls

- **Jog Controls**: Use arrow buttons to move the laser head in X/Y/Z directions
- **Fire**: Hold to fire laser at 30% power for testing
- **E-STOP**: Immediately stop all printer operations (sends M112 command)
- **Manual Commands**: Type G-code commands directly in the console input

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Configuration

Machine profiles can be configured in the application settings. Default profiles include common laser cutter configurations.

## Browser Compatibility

This application requires the Web Serial API, which is currently supported in:
- Google Chrome (v89+)
- Microsoft Edge (v89+)
- Opera (v75+)

Firefox and Safari do not currently support the Web Serial API.

## License

Private project - All rights reserved
