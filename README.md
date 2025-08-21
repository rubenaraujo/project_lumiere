
# Lumiere - Discover Quality Movies and Series

A static web application to discover high-quality movies, series, and mini-series using the TMDb API.

## Features

- **Smart filtering**: Select content type (movie/series), genres, date range, and language
- **Quality suggestions**: Content with a minimum score of 7.0 and a significant number of ratings
- **Random suggestions**: Discover new content based on your filters
- **Full details**: View synopsis, cast, ratings, and technical information
- **Responsive design**: Interface optimized for desktop and mobile
- **Dark theme**: Elegant cinematic design

## Technologies Used

- React 18 with TypeScript
- Tailwind CSS for styling
- Shadcn/ui for components
- TMDb API for movie and series data
- Vite for build and development

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the project: `npm run dev`

The application is already configured with a TMDb API key for immediate use.

## Deployment

This project is set up for automatic deployment to GitHub Pages via GitHub Actions.

✅ **Status**: Deployment configured and working  
🔄 **Trigger**: Automatic on push to main branch  
🌐 **URL**: https://rubenaraujo.github.io/project_lumiere/

### Manual deployment:
1. Build the project: `npm run build`
2. Deploy the `dist` folder to GitHub Pages

## License

This project was developed by Ruben Araujo.

## Note about the API

The application uses the TMDb API to fetch movie and series data. Data is retrieved directly from TMDb without being stored on a separate server.
