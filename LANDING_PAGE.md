# Rap Map Landing Page

A modern, professional landing page for the Rap Map project - a data-driven exploration of hip-hop vocabulary.

## Features

### Design
- **Gradient Backgrounds**: Beautiful purple/pink gradient color scheme throughout
- **Professional Typography**: System fonts optimized for readability
- **Smooth Animations**: Fade-in, slide, float, and parallax effects
- **Strategic White Space**: High-end aesthetic with proper spacing
- **Responsive Design**: Works on mobile, tablet, and desktop

### Sections
1. **Hero Section**: Eye-catching introduction with animated gradient text and floating statistics cards
2. **About Section**: Three feature cards explaining the project's purpose
3. **Features Section**: Four numbered features with detailed descriptions
4. **App Integration Section**: Email signup form and app preview placeholder
5. **Contact Section**: Simple contact information
6. **Footer**: Branding and copyright

### Interactive Features
- Smooth scrolling navigation
- Email signup with validation (stores emails in localStorage for MVP)
- Parallax scrolling effects
- Hover animations on cards and buttons
- Ripple effect on button clicks
- Intersection Observer for scroll-triggered animations

## Technologies Used
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with custom properties, gradients, and animations
- **JavaScript**: Vanilla JS for interactivity (no frameworks)
- **No external APIs**: Fully self-contained for MVP

## File Structure
```
/
├── index.html      # Main HTML structure
├── styles.css      # All styling and animations
└── script.js       # Interactive features and functionality
```

## How to Use

### View Locally
1. Open `index.html` in a modern web browser
2. Or serve with a simple HTTP server:
   ```bash
   python3 -m http.server 8080
   ```
3. Navigate to `http://localhost:8080`

### Customization
- **Colors**: Modify CSS custom properties in `:root` section of `styles.css`
- **Content**: Update text in `index.html`
- **Animations**: Adjust timing and easing in `styles.css` keyframes
- **Email Collection**: Currently uses localStorage; replace with backend API when ready

## Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility
- Semantic HTML5 elements
- ARIA labels where appropriate
- Keyboard navigation support
- Reduced motion support for users with motion sensitivity
- Focus indicators for interactive elements

## Future Enhancements
- Backend API for email collection
- Integration with actual Rap Map application
- More interactive data visualizations
- Artist search functionality
- User authentication
