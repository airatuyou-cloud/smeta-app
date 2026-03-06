This project contains a simple Vite + React application implementing a cost and revenue calculator for a fictional agency.  

**Features**

* Add, edit and remove purchase items (закупка) and sales items (продажа).
* Import and export data as CSV files.
* Calculate taxes, margins and profits based on payment type and fees.
* Visualize key metrics for both purchases and sales, including cash flows and payment schedules.
* Adjustable sliders for agency commission (акк) and credit term.

## Running locally

Ensure you have Node.js (v18 or newer) installed. From the project root, install dependencies and start the development server:

```bash
npm install
npm run dev
```

Vite will print a local URL (by default `http://localhost:5173`) where you can preview the application.  

## Building for production

To create an optimized build, run:

```bash
npm run build
```

This outputs static files in the `dist/` folder. You can then serve the content of `dist/` using any static web server or deploy it to a hosting service.
