import { Component } from '@theme/component';

/**
 * Pet Selector Component
 * Allows customers to select which pet a product is for
 * Attaches pet data to cart line items via properties
 */
export class PetSelector extends Component {
  constructor() {
    super();
    this.pets = [];
    this.isLoggedIn = false;
    this.customerId = null;
  }

  connectedCallback() {
    super.connectedCallback();

    // Get login state from attributes
    this.isLoggedIn = this.getAttribute('data-customer-logged-in') === 'true';
    this.customerId = this.getAttribute('data-customer-id');

    // Load pets and initialize UI
    this.loadPets();
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for pet selection changes
    if (this.refs.petSelect) {
      this.refs.petSelect.addEventListener('change', () => {
        this.handlePetSelection();
      });
    }

    // Listen for storage changes (when a pet is added in another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'customer_pets') {
        this.loadPets();
      }
    });

    // Listen for custom event when a pet is added
    window.addEventListener('petProfileCreated', () => {
      this.loadPets();
    });
  }

  /**
   * Load pets from customer metafield or localStorage
   */
  loadPets() {
    try {
      // First, try to load from customer metafield (passed from Liquid)
      const metafieldPets = this.getAttribute('data-customer-pets');

      if (metafieldPets) {
        try {
          // Parse the JSON data from the metafield
          const parsedPets = JSON.parse(metafieldPets);

          // Metafield data could be an array or a single object
          if (Array.isArray(parsedPets)) {
            this.pets = parsedPets;
          } else if (parsedPets && typeof parsedPets === 'object') {
            this.pets = [parsedPets];
          } else {
            this.pets = [];
          }

          // Normalize allergies field - ensure it's an array
          this.pets = this.pets.map(pet => {
            if (pet.allergies) {
              // If allergies is a string, try to parse it
              if (typeof pet.allergies === 'string') {
                try {
                  pet.allergies = JSON.parse(pet.allergies);
                } catch (e) {
                  // If it's not valid JSON, treat it as a single item
                  pet.allergies = [pet.allergies];
                }
              }
              // Ensure it's an array
              if (!Array.isArray(pet.allergies)) {
                pet.allergies = [];
              }
            } else {
              pet.allergies = [];
            }
            return pet;
          });

          console.log('🐾 Loaded pets from customer metafield:', this.pets);

          // Update UI based on loaded pets
          this.updateUI();
          return;
        } catch (e) {
          console.error('Error parsing metafield pets:', e);
          // Fall through to localStorage
        }
      }

      // Fallback: Load from localStorage
      const storedPets = localStorage.getItem('customer_pets');

      if (storedPets) {
        const allPets = JSON.parse(storedPets);

        // Filter pets for current customer if logged in
        if (this.isLoggedIn && this.customerId) {
          this.pets = allPets.filter(pet =>
            !pet.customer_id || pet.customer_id === this.customerId
          );
        } else {
          // If not logged in, show all pets (fallback)
          this.pets = allPets;
        }
      } else {
        this.pets = [];
      }

      console.log('🐾 Loaded pets from localStorage:', this.pets);

      // Update UI based on loaded pets
      this.updateUI();
    } catch (error) {
      console.error('Error loading pets:', error);
      this.pets = [];
      this.updateUI();
    }
  }

  /**
   * Update UI based on login state and pet availability
   */
  updateUI() {
    // Hide all states initially
    if (this.refs.dropdownWrapper) {
      this.refs.dropdownWrapper.hidden = true;
    }
    if (this.refs.noPetsMessage) {
      this.refs.noPetsMessage.hidden = true;
    }
    if (this.refs.notLoggedInMessage) {
      this.refs.notLoggedInMessage.hidden = true;
    }

    // Show appropriate state
    if (!this.isLoggedIn) {
      // Not logged in - show login prompt
      if (this.refs.notLoggedInMessage) {
        this.refs.notLoggedInMessage.hidden = false;
      }
    } else if (this.pets.length === 0) {
      // Logged in but no pets - show add pet prompt
      if (this.refs.noPetsMessage) {
        this.refs.noPetsMessage.hidden = false;
      }
    } else {
      // Logged in and has pets - show dropdown
      if (this.refs.dropdownWrapper) {
        this.refs.dropdownWrapper.hidden = false;
        this.populateDropdown();
      }
    }
  }

  /**
   * Populate dropdown with pet options
   */
  populateDropdown() {
    if (!this.refs.petSelect || this.pets.length === 0) {
      return;
    }

    // Get the placeholder option
    const placeholderOption = this.refs.petSelect.querySelector('option[value=""]');

    // Clear existing options except placeholder
    this.refs.petSelect.innerHTML = '';

    // Re-add placeholder
    if (placeholderOption) {
      this.refs.petSelect.appendChild(placeholderOption);
    }

    // Add pet options
    this.pets.forEach((pet, index) => {
      const option = document.createElement('option');
      option.value = index; // Use index to reference pet in array

      // Format option text with pet name and type
      const petEmoji = pet.type === 'cat' ? '🐱' : '🐕';
      option.textContent = `${petEmoji} ${pet.name}`;

      // Store pet data as data attributes for easy access
      option.dataset.petId = pet.id;
      option.dataset.petName = pet.name;
      option.dataset.petType = pet.type;
      option.dataset.petAllergies = pet.allergies ? pet.allergies.join(', ') : '';

      this.refs.petSelect.appendChild(option);
    });

    console.log('✅ Dropdown populated with', this.pets.length, 'pets');
  }

  /**
   * Handle pet selection
   */
  handlePetSelection() {
    if (!this.refs.petSelect) {
      return;
    }

    const selectedIndex = this.refs.petSelect.value;

    if (selectedIndex === '') {
      // No pet selected - clear hidden inputs
      this.clearHiddenInputs();
      return;
    }

    // Get selected pet data from the option
    const selectedOption = this.refs.petSelect.selectedOptions[0];

    if (!selectedOption) {
      return;
    }

    // Get pet data from option dataset
    const petData = {
      id: selectedOption.dataset.petId,
      name: selectedOption.dataset.petName,
      type: selectedOption.dataset.petType,
      allergies: selectedOption.dataset.petAllergies
    };

    // Update hidden inputs with pet data
    this.updateHiddenInputs(petData);

    console.log('🐾 Pet selected:', petData);
  }

  /**
   * Update hidden inputs with pet data
   * @param {Object} petData - The selected pet's data
   */
  updateHiddenInputs(petData) {
    if (this.refs.petIdInput) {
      this.refs.petIdInput.value = petData.id;
    }
    if (this.refs.petNameInput) {
      this.refs.petNameInput.value = petData.name;
    }
    if (this.refs.petTypeInput) {
      this.refs.petTypeInput.value = petData.type;
    }
    if (this.refs.petAllergiesInput) {
      this.refs.petAllergiesInput.value = petData.allergies;
    }
  }

  /**
   * Clear hidden inputs
   */
  clearHiddenInputs() {
    if (this.refs.petIdInput) {
      this.refs.petIdInput.value = '';
    }
    if (this.refs.petNameInput) {
      this.refs.petNameInput.value = '';
    }
    if (this.refs.petTypeInput) {
      this.refs.petTypeInput.value = '';
    }
    if (this.refs.petAllergiesInput) {
      this.refs.petAllergiesInput.value = '';
    }
  }

  /**
   * Get selected pet data
   * @returns {Object|null} The selected pet data or null
   */
  getSelectedPet() {
    if (!this.refs.petSelect) {
      return null;
    }

    const selectedIndex = this.refs.petSelect.value;

    if (selectedIndex === '') {
      return null;
    }

    return this.pets[parseInt(selectedIndex)];
  }
}

customElements.define('pet-selector', PetSelector);
