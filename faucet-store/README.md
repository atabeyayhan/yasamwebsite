# Premium Faucets E-commerce Website

A modern e-commerce website for selling premium faucets and bathroom fixtures, built with HTML, CSS, and TypeScript.

## Features

- Responsive design that works on all devices
- Product catalog with detailed product information
- Shopping cart functionality
- Google Sign-In integration
- Secure checkout process (dummy implementation)
- Modern and clean user interface

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd faucet-store
```

2. Install dependencies:
```bash
npm install
```

3. Set up Google Sign-In:
   - Go to the [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Enable the Google Sign-In API
   - Create OAuth 2.0 credentials
   - Replace `YOUR_GOOGLE_CLIENT_ID` in `src/scripts/main.ts` with your actual Google Client ID

4. Start the development server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:1234`

## Project Structure

```
faucet-store/
├── src/
│   ├── scripts/
│   │   ├── main.ts          # Main application logic
│   │   └── types.d.ts       # TypeScript type declarations
│   ├── styles/
│   │   └── main.css         # Main stylesheet
│   └── index.html           # Main HTML file
├── package.json             # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## Development

- The project uses Parcel as the bundler
- TypeScript for type safety
- CSS custom properties for theming
- Google Sign-In for authentication
- Responsive design with CSS Grid and Flexbox

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email info@premiumfaucets.com or create an issue in the repository. 