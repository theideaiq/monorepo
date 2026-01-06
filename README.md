# Next.js 16 Project

This is a modern web application built with [Next.js 16](https://nextjs.org/), leveraging [Supabase](https://supabase.com/) for the backend and [Tailwind CSS 4](https://tailwindcss.com/) for styling.

## Features

-   **App Router**: Utilizes the latest Next.js App Router for efficient routing and layouts.
-   **Internationalization**: Built-in support for multiple languages using `next-intl`.
-   **Authentication**: Secure authentication via Supabase.
-   **Animations**: Smooth UI transitions and animations powered by `framer-motion` and `Three.js` (via `@react-three/fiber`).
-   **Styling**: Modern, utility-first styling with Tailwind CSS v4.

## Tech Stack

-   **Framework**: Next.js 16
-   **Language**: TypeScript
-   **Backend**: Supabase (PostgreSQL, Auth)
-   **Styling**: Tailwind CSS 4
-   **State/Payment**: Wayl integration (via `lib/wayl.ts`)
-   **Icons**: Lucide React

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   npm

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory based on the following template:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    NEXT_PUBLIC_ADMIN_EMAIL=your_admin_email
    YOUTUBE_API_KEY=your_youtube_api_key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

-   `app/`: Application source code (pages, layouts, api routes).
    -   `[locale]/`: Locale-dependent routes.
-   `components/`: Reusable React components.
-   `lib/`: Utility libraries and configurations (e.g., `wayl.ts`).
-   `messages/`: Translation files for `next-intl`.
-   `public/`: Static assets.

## Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts the production server.
-   `npm run lint`: Runs ESLint to check for code quality issues.

## Learn More

To learn more about the technologies used:

-   [Next.js Documentation](https://nextjs.org/docs)
-   [Supabase Documentation](https://supabase.com/docs)
-   [Tailwind CSS Documentation](https://tailwindcss.com/docs)
-   [Framer Motion](https://www.framer.com/motion/)

## License

[Add License Information Here]
