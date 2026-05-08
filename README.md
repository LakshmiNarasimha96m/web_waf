# Vulnerable Web App Conversion

This project is a converted version of the legacy Vulnerable Web demo site.
It uses a static frontend in `public/` and serverless API endpoints in `api/`.

## Local development

1. Install Vercel CLI if needed: `npm install -g vercel`
2. Run `npm install` (optional, there are no runtime dependencies)
3. Start development server: `npm run dev`

## Project structure

- `api/` - serverless endpoints: `search`, `login`, `register`, `cart`, `waf`
- `public/` - static site pages and client-side JavaScript
- `utils/` - shared input validation and WAF rules

## Notes

The backend endpoints are intentionally simplified for demo purposes.
The frontend uses the API endpoints for search, login, register, and cart actions.
