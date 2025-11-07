# Pet Profile Form Setup Guide

This guide explains how to use the custom Pet Profile Form that captures pet information in a friendly, conversational way.

## Features

The pet profile form includes:
- **Friendly, conversational copy** for each question
- **Dynamic pet name** that updates questions as the user types
- **Visual weight selector** with friendly options (Tiny but mighty, Perfect medium, Large and in charge)
- **Allergy selector** with protein icons (beef, chicken, lamb, turkey)
- **Health boost selector** (Joint support, Gut health, Pre + pro biotic)
- **Automatic dog/cat toggle** that shows appropriate weight options

## Adding the Form to a Page

### Method 1: Add to Existing Page Template

1. In Shopify Admin, go to **Online Store > Themes**
2. Click **Customize** on your active theme
3. Navigate to the page where you want to add the pet form
4. Click **Add section**
5. Search for **Pet Profile Form**
6. Configure the section settings (questions, button text, etc.)
7. Click **Save**

### Method 2: Create a Dedicated Pet Profile Page

1. Go to **Online Store > Pages**
2. Create a new page (e.g., "Add Your Pet")
3. In the theme editor, customize this page
4. Add the **Pet Profile Form** section
5. Configure and save

## Customizing the Form

All form questions and text are customizable in the theme editor:

### Available Settings

- **Pet Name Question** - Default: "What is your pet's name?"
- **Pet Name Help Text** - Default: "We'll make sure all their goodies are labeled just for them!"
- **Birthday Question** - Default: "When's their birthday?"
- **Birthday Help Text** - Default: "We love sending birthday surprises! 🎉"
- **Breed Question** - Default: "What breed are they?"
- **Weight Question** - Includes dynamic `[pet_name]` placeholder
- **Allergies Question** - Includes dynamic `[pet_name]` placeholder
- **Boost Question** - Includes dynamic `[pet_name]` placeholder
- **Submit Button Text** - Default: "Create Pet Profile"
- **Success Message** - Default: "Pet profile created successfully! 🎉"

## Integrating with Shopify Metaobjects

To properly save pet data to customer metaobjects, you need to set up a backend integration.

### Step 1: Create Metaobject Definition

1. In Shopify Admin, go to **Settings > Custom data**
2. Click **Add definition** under Metaobjects
3. Create a definition named "Pet Profile" with these fields:
   - `name` (Single line text)
   - `type` (Single line text) - dog or cat
   - `birthday` (Date)
   - `breed` (Single line text)
   - `weight` (Single line text)
   - `allergies` (List of single line text)
   - `health_boost` (Single line text)

4. Save the metaobject definition

### Step 2: Link Metaobject to Customer

1. In **Settings > Custom data > Customers**
2. Click **Add definition**
3. Add a field:
   - Name: "Pets"
   - Type: "List of metaobjects"
   - Reference: "Pet Profile" (the metaobject you created)

### Step 3: Create Backend API Endpoint

You'll need to create a Shopify app or use Shopify Functions to handle the form submission.

#### Option A: Using Shopify App

Create a custom app with access to the Customer API and Metaobjects API:

```javascript
// Example endpoint: /apps/pet-profile/submit
app.post('/apps/pet-profile/submit', async (req, res) => {
  const { customer_id, pet_data } = req.body;

  try {
    // Create the pet metaobject
    const petMetaobject = await shopify.metaobject.create({
      type: 'pet_profile',
      fields: [
        { key: 'name', value: pet_data.name },
        { key: 'type', value: pet_data.type },
        { key: 'birthday', value: pet_data.birthday },
        { key: 'breed', value: pet_data.breed },
        { key: 'weight', value: pet_data.weight },
        { key: 'allergies', value: pet_data.allergies },
        { key: 'health_boost', value: pet_data.healthBoost }
      ]
    });

    // Link the metaobject to the customer
    await shopify.customer.updateMetafields(customer_id, {
      metafields: [{
        namespace: 'custom',
        key: 'pets',
        value: petMetaobject.id,
        type: 'list.metaobject_reference'
      }]
    });

    res.json({ success: true, pet_id: petMetaobject.id });
  } catch (error) {
    console.error('Error creating pet profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### Option B: Using Shopify Functions (Simpler)

If you don't want to create a full app, you can use Shopify Functions or a proxy to handle submissions.

#### Option C: Development Fallback

The form currently includes a fallback that stores pet data in `localStorage` during development. This allows you to test the UI before setting up the backend.

To view stored pets in console:
```javascript
JSON.parse(localStorage.getItem('customer_pets'))
```

## Styling and Customization

The form uses the theme's CSS custom properties for consistent styling:
- Colors from the selected color scheme
- Border radius from theme settings
- Spacing variables from theme
- Font sizes and families from theme

### Custom Styling

If you want to customize the form appearance, add CSS to your theme:

```css
.pet-profile-form .radio-card__content {
  /* Custom styling for weight/boost cards */
}

.pet-profile-form .checkbox-card__content {
  /* Custom styling for allergy cards */
}
```

## Form Behavior

### Dynamic Pet Name Updates
As the user types their pet's name, all questions with `[pet_name]` automatically update:
- "How much does **[pet_name]** weigh?" → "How much does **Buddy** weigh?"
- "Does **[pet_name]** have any allergies?" → "Does **Buddy** have any allergies?"

### Smart Weight Options
When the user selects:
- **Dog**: Shows three options (Tiny but mighty, Perfect medium, Large and in charge)
- **Cat**: Shows single option (One size fits all)

### Multi-Select Allergies
Users can select multiple protein allergies if needed.

## Next Steps

1. ✅ Form UI is complete with friendly copy
2. ⬜ Set up metaobject definitions in Shopify Admin
3. ⬜ Create backend API endpoint to handle submissions
4. ⬜ Test form submission with logged-in customer
5. ⬜ Connect to subscription flow

## Using with Subscriptions

Once pet profiles are saved to customer metaobjects, you can:
1. Access pet data in subscription flows
2. Personalize product recommendations based on pet size/allergies
3. Add pet names to shipping labels
4. Send birthday reminders and special offers
5. Customize box contents based on health boost selection

## Troubleshooting

### Form doesn't submit
- Check browser console for errors
- Ensure customer is logged in
- Verify API endpoint is accessible

### Pet name doesn't update questions
- Check that questions include `[pet_name]` placeholder in theme settings
- Verify JavaScript is loading correctly

### Weight options don't toggle
- Ensure both dog and cat radio inputs have correct values
- Check browser console for JavaScript errors

## Support

For questions or issues with the form:
1. Check browser console for error messages
2. Verify all theme files are properly uploaded
3. Test with browser developer tools open
4. Ensure customer account is active and logged in
