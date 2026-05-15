# Affiliate Product Comparison Website

A scalable affiliate website foundation built with Next.js, TypeScript, and Tailwind CSS.

## Scope

- App Router architecture
- Mobile-first responsive UI
- Reusable layout and page primitives
- RTL/LTR-ready document and spacing structure
- Placeholder routes without API connections or fake product data

## Routes

- `/`
- `/deals`
- `/category/[slug]`
- `/product/[id]`
- `/blog`
- `/blog/[slug]`
- `/admin`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app` contains route segments.
- `src/components` contains reusable layout and UI components.
- `src/lib` contains site configuration and typed shared constants.

## Notes

APIs, affiliate feeds, product records, authentication, and CMS integrations are intentionally not connected yet.

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
