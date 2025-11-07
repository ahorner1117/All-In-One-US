# Shopify Metaobject Integration - Complete Setup Guide

This guide walks you through setting up Shopify metaobjects for pet profiles so customers can access their pets across devices.

## Overview

The system works like this:
1. **Frontend** (theme) → Collects pet data via form
2. **Backend** (Shopify app) → Creates metaobjects and links to customer
3. **Shopify** → Stores pet data in metaobjects
4. **Syncs** → Pets available on any device when customer logs in

## Part 1: Create Metaobject Definition in Shopify

### Step 1: Define Pet Profile Metaobject

1. In Shopify Admin, go to **Settings > Custom data**
2. Click **Metaobjects** tab
3. Click **Add definition**
4. Configure as follows:

**Definition Details:**
- **Name:** Pet Profile
- **Type:** `pet_profile`
- **Access:** Storefront and Admin API

**Fields to Add:**

| Field Name | Type | Required | Validations |
|------------|------|----------|-------------|
| name | Single line text | Yes | Max 100 characters |
| type | Single line text | Yes | (dog or cat) |
| birthday | Date | No | - |
| breed | Single line text | No | Max 100 characters |
| weight | Single line text | Yes | (tiny, medium, large, cat) |
| allergies | JSON | No | - |
| health_boost | Single line text | No | - |

5. Click **Save**

### Step 2: Link Metaobject to Customers

1. Still in **Settings > Custom data**
2. Click **Customers** tab
3. Click **Add definition**
4. Configure metafield:
   - **Name:** Pets
   - **Namespace and key:** `custom.pets`
   - **Type:** List of metaobject references
   - **Reference:** Pet Profile (select the metaobject you just created)
   - **Access:** Storefront and Admin API
5. Click **Save**

## Part 2: Create Shopify Custom App

### Step 1: Create Custom App

1. In Shopify Admin, go to **Settings > Apps and sales channels**
2. Click **Develop apps**
3. Click **Create an app**
4. Name it: "Pet Profile Manager"
5. Click **Create app**

### Step 2: Configure Admin API Scopes

1. Click **Configure Admin API scopes**
2. Enable these scopes:
   - `read_customers` - Read customer data
   - `write_customers` - Update customer metafields
   - `read_metaobjects` - Read pet profile metaobjects
   - `write_metaobjects` - Create/delete pet metaobjects
3. Click **Save**

### Step 3: Install App and Get Access Token

1. Click **Install app**
2. Click **Install** to confirm
3. Click **Reveal token once** and **COPY THE TOKEN**
4. Save this token securely - you'll need it for the backend app

## Part 3: Deploy Backend App

### Option A: Deploy to Heroku (Recommended for beginners)

1. **Install Heroku CLI:** https://devcenter.heroku.com/articles/heroku-cli

2. **Navigate to app directory:**
   ```bash
   cd "All In One US/shopify-app"
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create Heroku app:**
   ```bash
   heroku create your-pet-profile-app
   ```

5. **Set environment variables:**
   ```bash
   heroku config:set SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
   heroku config:set SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
   ```

6. **Deploy:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

7. **Verify deployment:**
   ```bash
   heroku logs --tail
   ```

8. **Test health check:**
   ```bash
   curl https://your-pet-profile-app-96d901c94a97.herokuapp.com/health
   ```

### Option B: Deploy to Digital Ocean, AWS, or VPS

1. **Install Node.js** on your server (v16+)

2. **Upload app files** to server

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create .env file:**
   ```bash
   cp .env.example .env
   nano .env
   ```

   Fill in your values:
   ```
   SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
   PORT=3000
   ```

5. **Install PM2** (process manager):
   ```bash
   npm install -g pm2
   ```

6. **Start the app:**
   ```bash
   pm2 start server.js --name pet-profile-app
   pm2 save
   pm2 startup
   ```

7. **Set up Nginx** as reverse proxy (optional but recommended)

### Option C: Local Testing

For development/testing only:

1. **Navigate to app directory:**
   ```bash
   cd "All In One US/shopify-app"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

   Edit .env with your values

4. **Run the app:**
   ```bash
   npm run dev
   ```

5. **Use ngrok for testing:**
   ```bash
   ngrok http 3000
   ```

   This gives you a public URL like: `https://abc123.ngrok.io`

## Part 4: Configure Theme to Use Backend

### Configure Shopify App Proxy

The theme uses relative paths like `/apps/pet-profile/*` which need to be routed to your Heroku app:

1. In Shopify Admin, go to your custom app **"Pet Profile Manager"**
2. Click **Configuration** tab
3. Scroll to **App proxy** section
4. Click **Set up**
5. Configure:
   - **Subpath prefix:** `apps`
   - **Subpath:** `pet-profile`
   - **Proxy URL:** `https://your-pet-profile-app-96d901c94a97.herokuapp.com`
6. Click **Save**

This routes requests from:
- `https://your-store.myshopify.com/apps/pet-profile/create` → `https://your-pet-profile-app-96d901c94a97.herokuapp.com/apps/pet-profile/create`
- `https://your-store.myshopify.com/apps/pet-profile/list` → `https://your-pet-profile-app-96d901c94a97.herokuapp.com/apps/pet-profile/list`
- `https://your-store.myshopify.com/apps/pet-profile/delete/*` → `https://your-pet-profile-app-96d901c94a97.herokuapp.com/apps/pet-profile/delete/*`

## Part 5: Test the Integration

### Test 1: Create a Pet

1. Log into a customer account on your store
2. Go to your "Add Pet" page
3. Fill out the form completely
4. Submit
5. Check browser console - you should see:
   ```
   ✅ Pet profile saved to Shopify metaobject: gid://shopify/Metaobject/123456
   ```

### Test 2: View Pets

1. Go to "My Pets" page
2. You should see the pet you just created
3. Check console:
   ```
   ✅ Loaded 1 pets from Shopify metaobjects
   ```

### Test 3: Delete a Pet

1. Click delete button on a pet
2. Confirm deletion
3. Pet should disappear from list
4. Check console:
   ```
   ✅ Pet deleted from Shopify metaobject
   ```

### Test 4: Cross-Device Sync

1. Create a pet on Device A (e.g., desktop)
2. Log into same customer account on Device B (e.g., mobile)
3. Go to "My Pets" page
4. **You should see the same pet!** ✅

### Test 5: Verify in Shopify Admin

1. Go to **Customers** in Shopify Admin
2. Find the test customer
3. Scroll to **Metafields** section
4. You should see "Pets" with metaobject references
5. Click **Content > Metaobjects** to see the pet profiles

## Troubleshooting

### Issue: "API endpoint not available"

**Cause:** Backend app is not running or URL is incorrect

**Solutions:**
1. Check app is running: `curl https://your-app.com/health`
2. Check environment variables are set correctly
3. Check app logs for errors
4. Verify CORS settings if needed

### Issue: "Failed to save pet profile"

**Cause:** Missing API scopes or metaobject definition

**Solutions:**
1. Verify metaobject definition exists with correct type `pet_profile`
2. Check app has required API scopes
3. Verify access token is valid
4. Check app logs for specific error

### Issue: Pets don't sync across devices

**Cause:** Still using localStorage only

**Solutions:**
1. Check browser console - should see "✅ Loaded X pets from Shopify metaobjects"
2. If it says "loading from localStorage cache", the API isn't working
3. Verify backend app is accessible
4. Check customer is logged in

### Issue: GraphQL errors in app logs

**Common errors and solutions:**

**"Access denied"**
- Check API scopes are enabled
- Verify access token is correct

**"Metaobject type not found"**
- Verify metaobject definition type is exactly `pet_profile`
- Check definition has Storefront access enabled

**"Customer not found"**
- Verify customer ID format: `gid://shopify/Customer/{id}`
- Check customer exists in Shopify

## API Endpoints

Your backend app exposes these endpoints:

### Create Pet
```
POST /apps/pet-profile/create
Body: {
  "customer_id": "123456",
  "pet_data": {
    "name": "Buddy",
    "type": "dog",
    "birthday": "2020-05-15",
    "breed": "Golden Retriever",
    "weight": "medium",
    "allergies": ["beef"],
    "healthBoost": "joint_support"
  }
}
Response: {
  "success": true,
  "metaobject_id": "gid://shopify/Metaobject/123",
  "pet_data": {...}
}
```

### List Pets
```
GET /apps/pet-profile/list?customer_id=123456
Response: {
  "pets": [
    {
      "id": "gid://shopify/Metaobject/123",
      "name": "Buddy",
      "type": "dog",
      ...
    }
  ]
}
```

### Delete Pet
```
DELETE /apps/pet-profile/delete/gid://shopify/Metaobject/123
Response: {
  "success": true,
  "deleted_id": "gid://shopify/Metaobject/123"
}
```

## Security Considerations

### Authentication

The current implementation relies on:
1. Customer must be logged into Shopify account
2. Customer ID passed from Liquid (server-side) to JavaScript
3. Backend validates customer ID exists in Shopify

### Recommended Enhancements

For production, consider:

1. **Session tokens:** Use Shopify session tokens to verify requests
2. **Customer verification:** Verify the logged-in customer matches the customer_id
3. **Rate limiting:** Add rate limiting to prevent abuse
4. **Input validation:** Validate all input data
5. **HTTPS only:** Enforce HTTPS for all requests

## Costs and Limits

### Shopify API Limits

- **GraphQL:** 50 points/second (metaobject operations use 1-3 points)
- **REST:** 2 requests/second (not used in this implementation)

### Heroku Costs

- **Free tier:** 1000 dyno hours/month (enough for testing)
- **Hobby tier:** $7/month (recommended for production)

### Other Hosting

- **Digital Ocean:** ~$5-10/month
- **AWS/GCP:** Variable, ~$5-20/month depending on usage

## Maintenance

### Monitoring

Set up monitoring for:
1. **App uptime:** Use UptimeRobot or similar
2. **Error logs:** Check daily for errors
3. **API usage:** Monitor Shopify API calls

### Backups

Metaobject data is stored in Shopify, which:
- Handles backups automatically
- Can be exported via Admin API
- Consider periodic exports for extra safety

### Updates

Keep dependencies updated:
```bash
npm update
npm audit fix
```

## Next Steps

Once set up:

1. ✅ Test thoroughly with multiple customers
2. ✅ Monitor logs for any errors
3. ✅ Consider adding edit functionality
4. ✅ Link pets to subscription products
5. ✅ Use pet data for personalization
6. ✅ Send birthday reminder emails
7. ✅ Create reports on common allergies/breeds

## Support

If you encounter issues:

1. **Check logs first:**
   - Backend: `heroku logs --tail` or `pm2 logs`
   - Browser: Open Developer Console (F12)

2. **Common issues:**
   - 99% of issues are configuration/setup related
   - Check metaobject definition carefully
   - Verify API scopes are correct
   - Test access token works

3. **Test incrementally:**
   - Test health endpoint first
   - Then test create endpoint with Postman
   - Then test from theme

## Summary

✅ **Metaobject definition created** - Defines pet data structure
✅ **Custom app created** - Provides API access
✅ **Backend deployed** - Handles metaobject operations
✅ **Theme updated** - Calls backend endpoints
✅ **Cross-device sync working** - Pets saved to Shopify

Your pets now sync across all devices! 🐕🐱
