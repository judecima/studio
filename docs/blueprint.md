# **App Name**: TablerosPro

## Core Features:

- Public Panel Listing & Filters: Display a searchable and filterable list of available panels with key details (image, name, brand, basic measures, stock).
- Public Panel Detail Page: Provide a dedicated page for each panel showing all attributes, a detailed description, and a gallery of images.
- User Authentication & Authorization: Implement Firebase Authentication for user and admin roles, restricting access to administrative features for non-admin users.
- Admin Panel Management: A restricted dashboard displaying all panels in a table format with options to toggle visibility, filter data, and access full editing forms.
- Admin Panel Creation & Editing: Forms for creating new panels or editing existing ones, including fields for all data model attributes and stock management.
- AI Panel Data Autocompletion Tool: A generative AI-powered tool leveraging Cloud Functions to scrape external sources or use APIs to automatically suggest and populate panel details like images, brand, and dimensions during creation.
- Firebase Storage for Assets: Integrate Firebase Storage for uploading and managing panel images, including selecting a main image and reordering galleries.

## Style Guidelines:

- Primary accent color: A warm, sophisticated terracotta-like hue (#A16345) to convey material and professionalism, ensuring good contrast on a light background.
- Background color: A very light, subtly tinted off-white (#F4F2F0), providing a clean, open canvas for content in a light color scheme.
- Secondary accent color: A vibrant, complementary reddish-pink (#D1475E) for call-to-action buttons, interactive elements, and important alerts.
- Headline font: 'Space Grotesk' (sans-serif) for a modern, structured, and slightly techy feel appropriate for a professional management application.
- Body font: 'Inter' (sans-serif) for its neutral, objective, and highly legible characteristics, suitable for detailed product descriptions and data tables.
- Utilize modern, outline-style icons that are clean and minimalist, reinforcing the organized and professional aesthetic for both public and admin interfaces.
- Adopt a grid-based responsive layout for panel display, with filtering options logically placed in a sidebar or topbar for clear navigation across devices.
- Incorporate subtle, tasteful hover effects on product cards and form elements, alongside loading spinners for asynchronous data fetching, to provide visual feedback without distraction.