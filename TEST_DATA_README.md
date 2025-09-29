# Test Data Management System

## Overview
The test data system allows you to quickly import dummy data for testing and development purposes. This eliminates the need to manually add players, members, and signups every time you reset the system.

## How to Use

### 1. Access Admin Panel
- Login with admin credentials
- Navigate to the "🔐 Admin" tab
- Scroll down to the "🧪 Test Data Management" section

### 2. Import Test Data
- Click "📥 Import Test Data" button
- Confirm the import when prompted
- The system will import all test data while preserving existing admin users

### 3. Preview Test Data (Optional)
- Click "👁️ Preview Test Data" to see what will be imported
- This shows you all the test members, users, and signup data before importing

## What Gets Imported

### Test Members (6 total)
- **Alex Striker** - Excellent level, Forward/Midfielder, Activated
- **Sarah Defender** - Good level, Defender/Any, Activated  
- **Mike Goalie** - Average level, Goalkeeper/Defender, Activated
- **Lisa Midfielder** - Good level, Midfielder/Forward, Activated
- **Tom Utility** - Beginner level, Any position, Not Activated
- **Emma Winger** - Excellent level, Forward/Midfielder, Not Activated

### Test Users (6 total)
- 4 Google OAuth users (matched with members above)
- 2 Admin-added casual players (John Casual, Maria Quick)

### Test Signups (2 weeks)
- **2025-09-26**: 4 players signed up
- **2025-10-03**: 3 players signed up

## Use Cases

### Development Testing
- Test team generation with various skill levels
- Test member activation status displays
- Test signup functionality with existing data
- Test position-based team balancing

### Demo Purposes
- Show the system with realistic data
- Demonstrate different user types (Google vs Casual)
- Show various skill levels and positions
- Display activation status differences

### After System Reset
1. Click "🔄 Reset All Data" to clear everything
2. Click "📥 Import Test Data" to restore test data
3. System is ready for testing immediately

## API Endpoints

If you need to use the test data system programmatically:

```bash
# Get test data information
GET /api/test-data-info

# Import test data
POST /api/import-test-data
```

## File Structure

The test data is stored in:
- `data/test-dataset.json` - Contains all test data
- Organized into sections: members, users, signups

## Notes

- Admin users are always preserved during import
- Test data includes both activated and non-activated members
- Signups include realistic timestamps and player distributions
- All test emails use recognizable patterns (alex.striker@gmail.com, etc.)
- Test data represents various skill levels for balanced testing