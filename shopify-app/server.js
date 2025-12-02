/**
 * Shopify Pet Profile App - Backend Server
 *
 * This Express server handles pet profile metaobject operations
 * Deploy this as a Shopify app or standalone service
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configure CORS to allow requests from your Shopify store
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from Shopify stores (*.myshopify.com) and custom domains
    const allowedOrigins = [
      /\.myshopify\.com$/,
      /^https:\/\/[\w-]+\.myshopify\.com$/,
      /^https?:\/\/paw-in-one\.com$/,
      /^https?:\/\/.*\.paw-in-one\.com$/
    ];

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Shopify API configuration
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

// Helper function to make GraphQL requests
async function shopifyGraphQL(query, variables = {}) {
  const response = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GraphQL request failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result;
}

/**
 * Create a new pet profile metaobject
 * POST /apps/pet-profile/create
 */
app.post('/apps/pet-profile/create', async (req, res) => {
  try {
    console.log('=== CREATE PET REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { customer_id, pet_data } = req.body;

    if (!customer_id) {
      console.error('❌ Missing customer_id');
      return res.status(400).json({ success: false, error: 'customer_id is required' });
    }

    if (!pet_data) {
      console.error('❌ Missing pet_data');
      return res.status(400).json({ success: false, error: 'pet_data is required' });
    }

    console.log('Creating pet profile for customer:', customer_id);
    console.log('Received pet_data:', JSON.stringify(pet_data, null, 2));

    // Create the pet metaobject using GraphQL
    const mutation = `
      mutation CreatePetProfile($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
            fields {
              key
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      metaobject: {
        type: 'pet_profile',
        fields: [
          { key: 'name', value: pet_data.name },
          { key: 'type', value: pet_data.type },
          { key: 'birthday', value: pet_data.birthday || '' },
          { key: 'breed', value: pet_data.breed || '' },
          { key: 'weight', value: pet_data.weight },
          { key: 'allergies', value: JSON.stringify(pet_data.allergies || []) },
          { key: 'health_boost', value: pet_data.health_boost || '' }
        ]
      }
    };

    console.log('GraphQL variables:', JSON.stringify(variables, null, 2));

    const response = await shopifyGraphQL(mutation, variables);
    console.log('GraphQL response:', JSON.stringify(response, null, 2));

    const result = response.data.metaobjectCreate;

    if (result.userErrors && result.userErrors.length > 0) {
      console.error('❌ Metaobject creation errors:', result.userErrors);
      return res.status(400).json({
        success: false,
        error: result.userErrors[0].message,
        userErrors: result.userErrors
      });
    }

    const metaobjectId = result.metaobject.id;

    // Link the metaobject to the customer
    await linkPetToCustomer(customer_id, metaobjectId);

    console.log('✅ Pet profile created:', metaobjectId);

    res.json({
      success: true,
      metaobject_id: metaobjectId,
      pet_data: pet_data
    });

  } catch (error) {
    console.error('❌ Error creating pet profile:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
});

/**
 * List all pets for a customer
 * GET /apps/pet-profile/list?customer_id=xxx
 */
app.get('/apps/pet-profile/list', async (req, res) => {
  try {
    const { customer_id } = req.query;

    console.log('Fetching pets for customer:', customer_id);

    // Get customer's pet metaobject references
    const customerQuery = `
      query GetCustomerPets($id: ID!) {
        customer(id: $id) {
          metafields(first: 10, namespace: "custom") {
            edges {
              node {
                key
                value
                type
              }
            }
          }
        }
      }
    `;

    const customerResponse = await shopifyGraphQL(customerQuery, {
      id: `gid://shopify/Customer/${customer_id}`
    });

    const metafields = customerResponse.data.customer?.metafields?.edges || [];
    const petsField = metafields.find(edge => edge.node.key === 'pets');

    if (!petsField) {
      console.log('No pets found for customer');
      return res.json({ pets: [] });
    }

    // Parse the pet metaobject IDs
    const petIds = JSON.parse(petsField.node.value || '[]');

    if (petIds.length === 0) {
      return res.json({ pets: [] });
    }

    // Fetch each pet metaobject
    const pets = await Promise.all(
      petIds.map(petId => fetchPetMetaobject(petId))
    );

    // Filter out any null results (deleted pets)
    const validPets = pets.filter(pet => pet !== null);

    console.log('✅ Found', validPets.length, 'pets for customer');

    res.json({
      pets: validPets
    });

  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete a pet profile
 * DELETE /apps/pet-profile/delete/:petId
 */
app.delete('/apps/pet-profile/delete/:petId', async (req, res) => {
  try {
    const { petId } = req.params;

    console.log('Deleting pet:', petId);

    // Delete the metaobject
    const mutation = `
      mutation DeleteMetaobject($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await shopifyGraphQL(mutation, {
      id: petId
    });

    const result = response.data.metaobjectDelete;

    if (result.userErrors && result.userErrors.length > 0) {
      console.error('Delete errors:', result.userErrors);
      return res.status(400).json({
        success: false,
        error: result.userErrors[0].message
      });
    }

    console.log('✅ Pet deleted:', result.deletedId);

    res.json({
      success: true,
      deleted_id: result.deletedId
    });

  } catch (error) {
    console.error('Error deleting pet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper: Link pet metaobject to customer
 */
async function linkPetToCustomer(customerId, petMetaobjectId) {
  try {
    // Get existing pets list
    const customerQuery = `
      query GetCustomerMetafields($id: ID!) {
        customer(id: $id) {
          metafield(namespace: "custom", key: "pets") {
            id
            value
          }
        }
      }
    `;

    const response = await shopifyGraphQL(customerQuery, {
      id: `gid://shopify/Customer/${customerId}`
    });

    const existingMetafield = response.data.customer?.metafield;
    let petIds = [];

    if (existingMetafield) {
      petIds = JSON.parse(existingMetafield.value || '[]');
    }

    // Add new pet ID
    petIds.push(petMetaobjectId);

    // Update customer metafield
    const updateMutation = `
      mutation UpdateCustomerMetafield($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const updateResponse = await shopifyGraphQL(updateMutation, {
      input: {
        id: `gid://shopify/Customer/${customerId}`,
        metafields: [
          {
            namespace: 'custom',
            key: 'pets',
            value: JSON.stringify(petIds),
            type: 'list.metaobject_reference'
          }
        ]
      }
    });

    console.log('✅ Linked pet to customer');

  } catch (error) {
    console.error('Error linking pet to customer:', error);
    throw error;
  }
}

/**
 * Helper: Fetch a pet metaobject by ID
 */
async function fetchPetMetaobject(petId) {
  try {
    const query = `
      query GetPetMetaobject($id: ID!) {
        metaobject(id: $id) {
          id
          handle
          fields {
            key
            value
          }
        }
      }
    `;

    const response = await shopifyGraphQL(query, { id: petId });
    const metaobject = response.data.metaobject;

    if (!metaobject) return null;

    // Convert fields array to object
    const pet = {
      id: metaobject.id,
      handle: metaobject.handle
    };

    metaobject.fields.forEach(field => {
      if (field.key === 'allergies') {
        pet[field.key] = JSON.parse(field.value || '[]');
      } else if (field.key !== 'health_boost') {
        pet[field.key] = field.value;
      }
    });

    return pet;

  } catch (error) {
    console.error('Error fetching pet metaobject:', error);
    return null;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Pet Profile API running on port ${PORT}`);
});
