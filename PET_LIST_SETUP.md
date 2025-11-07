# Pet List Display - Setup Guide

This guide explains how to use the Pet List section to display customer's pets.

## Overview

The Pet List section displays all pets that a customer has added, with options to:
- View all pet details in a card layout
- Edit pet information
- Delete pets with confirmation
- Add new pets via a button link

## Files

- **`sections/pet-list.liquid`** - Pet list section with schema and styles
- **`assets/pet-list.js`** - Web component handling pet loading and management
- **`templates/page.my-pets.json`** - Ready-to-use template for viewing pets

## Quick Setup

### 1. Create a "My Pets" Page

1. In Shopify Admin, go to **Online Store > Pages**
2. Create a new page:
   - Title: "My Pets"
   - Handle: `my-pets`
3. In the template selector, choose **page.my-pets**
4. Save and publish

### 2. Link to Pet Profile Form

1. Go to your "Add Pet" page (or create one using `page.pet-profile` template)
2. Make sure the handle is `add-pet`

The Pet List section will automatically link to `/pages/add-pet` by default.

### 3. Customize in Theme Editor (Optional)

1. Go to **Online Store > Themes > Customize**
2. Navigate to your "My Pets" page
3. Click on the "Pet List" section
4. Customize:
   - Section title
   - Add button text
   - Empty state message
   - Add pet URL (if different from `/pages/add-pet`)
   - Color scheme

## Features

### Pet Cards Display

Each pet is displayed in a card showing:
- Pet name with type icon (🐕 for dogs, 🐱 for cats)
- Breed (if provided)
- Birthday in friendly format
- Size category with friendly label
- Allergy badges with icons
- Health boost badge

### Empty State

When no pets are added:
- Shows paw print icon 🐾
- Displays friendly message
- Button to add first pet

### Actions

**Edit Button (✏️)**
- Currently shows alert (placeholder)
- Can be connected to edit form
- Stores pet data in sessionStorage

**Delete Button (🗑️)**
- Shows confirmation modal
- Prevents accidental deletion
- Updates list in real-time

### Delete Confirmation

Safe deletion with modal:
- Shows pet name in confirmation
- "Cancel" and "Delete" buttons
- Closes on outside click
- Success toast notification

## Data Source

The Pet List loads data from:

1. **Primary:** API endpoint at `/apps/pet-profile/list`
   - Expected response: `{ pets: [...] }`

2. **Fallback:** Browser localStorage
   - Key: `customer_pets`
   - Used during development or if API unavailable

### Pet Data Structure

```javascript
{
  id: "unique-id",
  name: "Buddy",
  type: "dog", // or "cat"
  birthday: "2020-05-15",
  breed: "Golden Retriever",
  weight: "medium", // tiny, medium, large, cat
  allergies: ["beef", "chicken"],
  healthBoost: "joint_support", // or gut_health, probiotic
  created_at: "2025-01-01T00:00:00Z"
}
```

## Styling

The pet list uses:
- Responsive grid layout (3 columns desktop, 1 column mobile)
- Card-style design with hover effects
- Badge system for allergies and health boosts
- Theme color schemes
- Smooth animations

### Card Hover Effects

- Border color changes to primary
- Slight lift animation
- Box shadow appears

### Badges

- **Allergy badges:** Red background with protein icons
- **Health boost badges:** Green background with icons

## API Integration

### List Pets Endpoint

**GET** `/apps/pet-profile/list`

Expected response:
```json
{
  "pets": [
    {
      "id": "123",
      "name": "Buddy",
      "type": "dog",
      ...
    }
  ]
}
```

### Delete Pet Endpoint

**DELETE** `/apps/pet-profile/{petId}`

Expected response:
```json
{
  "success": true
}
```

## Edit Functionality

The edit button is currently a placeholder. To implement:

### Option 1: Redirect to Form with Pre-fill

1. Create edit page template
2. Load pet data from sessionStorage
3. Pre-fill form fields
4. Update instead of create on submit

### Option 2: Inline Editing

1. Show form fields in modal
2. Load pet data
3. Update and refresh list

Example redirect in `pet-list.js`:
```javascript
handleEdit(petId) {
  const pet = this.pets.find(p => String(p.id) === String(petId));
  sessionStorage.setItem('edit_pet', JSON.stringify(pet));
  window.location.href = `/pages/edit-pet?id=${petId}`;
}
```

## Customization

### Change Card Layout

Edit `pet-list.liquid` stylesheet:
```css
.pet-list__grid {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  /* Change 300px to adjust card width */
}
```

### Add More Information

Edit `createPetCard()` in `pet-list.js`:
```javascript
<div class="pet-card__info-row">
  <span class="pet-card__info-label">Your Label:</span>
  <span class="pet-card__info-value">${pet.yourField}</span>
</div>
```

### Change Icons

Replace emojis in `pet-list.js`:
- Type icons: `typeIcon = pet.type === 'cat' ? '🐱' : '🐕';`
- Allergy icons: `allergyIcons` object
- Boost icons: `boostLabels` object

### Custom Empty State

In theme editor, Pet List section settings:
- Change empty message
- Change button text
- Update button URL

## Common Use Cases

### 1. Account Dashboard

Add Pet List to customer account page:
1. Edit account template
2. Add Pet List section
3. Set "Add Pet" URL to form page

### 2. Subscription Management

Show pets during subscription checkout:
1. Add Pet List to checkout page
2. Allow pet selection for subscription
3. Link to subscription items

### 3. Navigation Link

Add to header menu:
1. Create menu item "My Pets"
2. Link to `/pages/my-pets`
3. Show for logged-in customers only

## Troubleshooting

### Pets Don't Show

1. Check browser console for errors
2. Verify localStorage has data: `localStorage.getItem('customer_pets')`
3. Check API endpoint is accessible
4. Ensure customer is logged in (for API)

### Empty State Shows When Pets Exist

1. Check data format matches expected structure
2. Verify `pets` array is not empty
3. Check console for rendering errors

### Delete Doesn't Work

1. Verify API endpoint is configured
2. Check localStorage permissions
3. Look for errors in console

### Cards Look Wrong

1. Clear browser cache
2. Check theme CSS hasn't overridden styles
3. Verify color scheme is set

## Mobile Optimization

The Pet List is fully responsive:
- Single column layout on mobile
- Touch-friendly buttons
- Optimized card sizing
- Swipe-friendly delete modal

## Accessibility

Built-in accessibility features:
- ARIA labels on action buttons
- Keyboard navigation support
- Screen reader friendly
- Focus management in modal

## Performance

Optimizations included:
- Lazy loads JavaScript
- Efficient DOM rendering
- Cached pet data
- Minimal re-renders

## Next Steps

1. ✅ Pet List section is ready to use
2. ⬜ Set up API endpoints for production
3. ⬜ Implement edit functionality
4. ⬜ Add to customer account dashboard
5. ⬜ Connect to subscription flow

## Integration with Subscriptions

Use pet data to:
- Personalize box contents
- Filter by allergies
- Adjust portion sizes by weight
- Include birthday surprises
- Customize product selection

Access pet data in subscription logic:
```javascript
// Get customer's pets
const pets = await fetch('/apps/pet-profile-manager-2/list').then(r => r.json());

// Filter products by pet needs
const suitableProducts = products.filter(p => {
  return !pets.some(pet =>
    pet.allergies.includes(p.protein)
  );
});
```

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all files are uploaded
3. Test with browser developer tools
4. Check customer login status
