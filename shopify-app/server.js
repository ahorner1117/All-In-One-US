/**
 * Shopify Pet Profile App - Backend Server
 *
 * This Express server handles pet profile metaobject operations
 * Deploy this as a Shopify app or standalone service
 */

const express = require('express');
const { Shopify } = require('@shopify/shopify-api');
require('dotenv').config();

const app = express();
app.use(express.json());

// Shopify API configuration
const shopify = new Shopify.Clients.Rest(
  process.env.SHOPIFY_SHOP_DOMAIN,
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
);

/**
 * Create a new pet profile metaobject
 * POST /apps/pet-profile/create
 */
app.post('/apps/pet-profile/create', async (req, res) => {
  try {
    const { customer_id, pet_data } = req.body;

    console.log('Creating pet profile for customer:', customer_id);

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
          { key: 'health_boost', value: pet_data.healthBoost || '' }
        ]
      }
    };

    const response = await shopify.graphql(mutation, variables);
    const result = response.body.data.metaobjectCreate;

    if (result.userErrors && result.userErrors.length > 0) {
      console.error('Metaobject creation errors:', result.userErrors);
      return res.status(400).json({
        success: false,
        error: result.userErrors[0].message
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
    console.error('Error creating pet profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

    const customerResponse = await shopify.graphql(customerQuery, {
      id: `gid://shopify/Customer/${customer_id}`
    });

    const metafields = customerResponse.body.data.customer?.metafields?.edges || [];
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

    const response = await shopify.graphql(mutation, {
      id: petId
    });

    const result = response.body.data.metaobjectDelete;

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

    const response = await shopify.graphql(customerQuery, {
      id: `gid://shopify/Customer/${customerId}`
    });

    const existingMetafield = response.body.data.customer?.metafield;
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

    const updateResponse = await shopify.graphql(updateMutation, {
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

    const response = await shopify.graphql(query, { id: petId });
    const metaobject = response.body.data.metaobject;

    if (!metaobject) return null;

    // Convert fields array to object
    const pet = {
      id: metaobject.id,
      handle: metaobject.handle
    };

    metaobject.fields.forEach(field => {
      if (field.key === 'allergies') {
        pet[field.key] = JSON.parse(field.value || '[]');
      } else if (field.key === 'health_boost') {
        pet.healthBoost = field.value;
      } else {
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
