# Soccer Team Management System

A web-based application for organizing casual soccer games with balanced team generation, player management, and weekly signups.

## Features

- **User Authentication**: Login with Google or Facebook
- **Player Management**: Add/remove players with skill levels
- **Weekly Signups**: Manage player signups for specific game dates
- **Smart Team Generation**: Advanced algorithm for balanced team creation
- **Balance Analysis**: Detailed metrics on team fairness and balance
- **Responsive Design**: Works on desktop and mobile devices

## File Structure

```
soccer-team-manager/
├── index.html              # Main HTML structure
├── css/
│   └── styles.css          # All styling and responsive design
├── js/
│   ├── auth.js            # Authentication module (Google/Facebook)
│   ├── app.js             # Core application logic
│   └── teams.js           # Advanced team generation with balance analysis
└── README.md              # This file
```

## Setup Instructions

### 1. Basic Setup

1. **Clone or download** this project to your local machine
2. **Open** the project folder in VS Code
3. **Install Live Server extension** in VS Code (recommended)
4. **Right-click** on `index.html` and select "Open with Live Server"

### 2. Authentication Setup (Optional but Recommended)

#### Google Authentication

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins
6. Replace `660296369599-2t5u6qmve8q8tpkoh4o9uau9i6e4pmbj.apps.googleusercontent.com` in:
   - `index.html` (meta tag)
   - `js/auth.js` (client_id field)

#### Facebook Authentication

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure valid OAuth redirect URIs
5. Replace `1234567890` with your Facebook App ID in `js/auth.js`

### 3. Alternative Setup (Without Authentication)

If you want to test without setting up authentication:

1. Comment out the login overlay in `index.html`
2. Modify `js/auth.js` to auto-authenticate with a dummy user
3. The app will work with local storage only

## Usage Guide

### Getting Started

1. **Login**: Use Google or Facebook to authenticate
2. **Add Players**: Go to "Players" tab and add your regular players with skill levels
3. **Create Signup**: Go to "Weekly Signup" tab, select a date, and open signup
4. **Sign Up Players**: Click on available players to sign them up for the game
5. **Generate Teams**: Go to "Generate Teams" tab and create balanced teams

### Player Management

- **Add Player**: Enter name and select skill level (Excellent, Good, Average, Bad)
- **Skill Points**: Each skill level has points (Excellent=4, Good=3, Average=2, Bad=1)
- **Remove Player**: Click the × button on any player card
- **Edit**: Currently not supported - remove and re-add if needed

### Weekly Signups

- **Select Date**: Choose the game date using the date picker
- **Open Signup**: Click "Open Signup" to show available players
- **Sign Up**: Click on player cards to sign them up
- **Remove**: Use the "Remove" button next to signed-up players
- **View Count**: See how many players are signed up

### Team Generation

- **Minimum Players**: Need at least 6 players to generate teams
- **Team Count**: Algorithm automatically determines optimal team count
  - 6-14 players: 2 teams
  - 15-21 players: 3 teams
  - 22+ players: 4 teams
- **Balance Algorithm**: Uses snake draft + optimization for fairness
- **Regenerate**: Click "Regenerate Teams" for different combinations

### Balance Analysis

The system provides detailed balance metrics:

- **Overall Balance**: How evenly matched the teams are (0-100%)
- **Size Balance**: How even the team sizes are
- **Skill Balance**: How evenly skills are distributed
- **Team Averages**: Average skill points per team
- **Recommendation**: Suggestion on team quality

## Technical Details

### Architecture

- **Frontend Only**: Pure HTML, CSS, and JavaScript
- **No Backend**: Uses localStorage for data persistence
- **Modular Design**: Separate files for different concerns
- **Responsive**: Mobile-friendly design

### Data Storage

- **Local Storage**: All data stored in browser's localStorage
- **User-Specific**: Data tied to authenticated user ID
- **Automatic Save**: Changes saved immediately
- **Session Management**: 24-hour login sessions

### Team Generation Algorithm

1. **Sorting**: Players sorted by skill level (highest first)
2. **Snake Draft**: Alternating team assignment (1,2,3,3,2,1,1,2,3...)
3. **Optimization**: Iterative swapping to improve balance
4. **Metrics**: Multiple balance calculations for quality assessment

### Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: iOS Safari, Android Chrome
- **Requirements**: ES6+ support, localStorage, CSS Grid

## Customization

### Styling

Edit `css/styles.css` to customize:
- Colors and themes
- Layout and spacing
- Mobile breakpoints
- Animation effects

### Skill Levels

Modify skill points in `js/app.js`:
```javascript
this.skillPoints = {
    'excellent': 4,
    'good': 3,
    'average': 2,
    'bad': 1
};
```

### Team Names

Change team naming in `js/teams.js`:
```javascript
name: `Team ${String.fromCharCode(65 + i)}` // Team A, B, C...
```

### Balance Algorithm

Adjust balance parameters in `js/teams.js`:
- Maximum optimization iterations
- Balance score weighting
- Swap improvement threshold

## Troubleshooting

### Common Issues

1. **Teams not generating**: Check if at least 6 players are signed up
2. **Login not working**: Verify API keys and domain configuration
3. **Data not saving**: Ensure authentication is working properly
4. **Mobile display issues**: Check CSS media queries and viewport meta tag

### Debug Mode

Open browser developer tools and check console for error messages. The app logs authentication and data operations.

### Data Reset

To reset all data:
1. Open browser developer tools
2. Go to Application/Storage tab
3. Clear localStorage items starting with "soccerData_" and "soccerManager_"

## Development

### Adding Features

1. **New Pages**: Add sections to `index.html` and corresponding CSS/JS
2. **New APIs**: Extend authentication in `js/auth.js`
3. **New Algorithms**: Modify team generation in `js/teams.js`
4. **New Styles**: Add responsive designs to `css/styles.css`

### Testing

- **Local Testing**: Use Live Server for development
- **Mobile Testing**: Use browser dev tools device simulation
- **Authentication**: Test with real Google/Facebook accounts
- **Edge Cases**: Test with various player counts and skill distributions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check this README for common solutions
2. Review browser console for error messages
3. Test with different browsers
4. Verify authentication setup if using social login

---

**Version**: 1.0  
**Last Updated**: September 2025  
**Compatibility**: Modern browsers with ES6+ support