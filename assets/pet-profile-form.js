import { Component } from '@theme/component';

/**
 * Pet Profile Form Component
 * Handles the submission of pet information to create customer metaobjects
 */
export class PetProfileForm extends Component {
  constructor() {
    super();
    this.petName = '';
    this.petType = 'dog';
  }

  connectedCallback() {
    super.connectedCallback();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Pet name input - update dynamic text
    const petNameInput = this.refs.form?.querySelector('[name="pet_name"]');
    if (petNameInput) {
      petNameInput.addEventListener('input', (e) => {
        this.updateDynamicText(e.target.value);
      });
    }

    // Pet type radio - toggle weight options
    const petTypeRadios = this.refs.form?.querySelectorAll('[name="pet_type"]');
    if (petTypeRadios) {
      petTypeRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
          this.updateWeightOptions(e.target.value);
        });
      });
    }

    // Form submission
    if (this.refs.form) {
      this.refs.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  }

  /**
   * Update dynamic text with pet name
   * @param {string} name - The pet's name
   */
  updateDynamicText(name) {
    const newName = name.trim() || 'your pet';

    // Only update if name changed
    if (newName === this.petName) return;

    this.petName = newName;

    // Store original text on first run
    if (!this.originalWeightText && this.refs.weightLabel) {
      this.originalWeightText = this.refs.weightLabel.textContent;
    }
    if (!this.originalAllergiesText && this.refs.allergiesLabel) {
      this.originalAllergiesText = this.refs.allergiesLabel.textContent;
    }
    if (!this.originalBoostText && this.refs.boostLabel) {
      this.originalBoostText = this.refs.boostLabel.textContent;
    }

    // Update weight question
    if (this.refs.weightLabel && this.originalWeightText) {
      this.refs.weightLabel.textContent = this.originalWeightText.replace(/\[pet_name\]/g, this.petName);
    }

    // Update allergies question
    if (this.refs.allergiesLabel && this.originalAllergiesText) {
      this.refs.allergiesLabel.textContent = this.originalAllergiesText.replace(/\[pet_name\]/g, this.petName);
    }

    // Update boost question
    if (this.refs.boostLabel && this.originalBoostText) {
      this.refs.boostLabel.textContent = this.originalBoostText.replace(/\[pet_name\]/g, this.petName);
    }
  }

  /**
   * Toggle weight options based on pet type
   * @param {string} type - 'dog' or 'cat'
   */
  updateWeightOptions(type) {
    this.petType = type;
    const dogOptions = this.refs.dogWeightOptions;
    const catOptions = this.refs.catWeightOptions;

    if (type === 'cat') {
      if (dogOptions) {
        dogOptions.hidden = true;
        dogOptions.querySelectorAll('input').forEach(input => {
          input.required = false;
        });
      }
      if (catOptions) {
        catOptions.hidden = false;
        catOptions.querySelectorAll('input').forEach(input => {
          input.required = true;
        });
      }
    } else {
      if (dogOptions) {
        dogOptions.hidden = false;
        dogOptions.querySelectorAll('input').forEach(input => {
          input.required = true;
        });
      }
      if (catOptions) {
        catOptions.hidden = true;
        catOptions.querySelectorAll('input').forEach(input => {
          input.required = false;
        });
      }
    }
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    const submitButton = this.refs.submitButton;
    const form = this.refs.form;

    if (!form) return;

    // Disable submit button
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
    }

    // Hide any previous messages
    this.hideMessages();

    try {
      const formData = new FormData(form);
      const petData = this.getFormData(formData);

      // Submit to Shopify
      await this.submitPetData(petData);

      // Show success message
      this.showSuccess();

      // Reset form after delay
      setTimeout(() => {
        form.reset();
        this.petName = '';
        this.updateWeightOptions('dog');

        // Optionally redirect to pet list page
        // Uncomment the line below to redirect after successful submission
        // window.location.href = '/pages/my-pets';
      }, 2000);

    } catch (error) {
      console.error('Error submitting pet profile:', error);
      this.showError(error.message || 'Failed to submit pet profile. Please try again.');
    } finally {
      // Re-enable submit button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = this.getAttribute('submit-text') || 'Create Pet Profile';
      }
    }
  }

  /**
   * Extract form data
   * @param {FormData} formData
   * @returns {Object}
   */
  getFormData(formData) {
    const allergies = [];
    formData.getAll('allergies').forEach(allergy => {
      if (allergy) allergies.push(allergy);
    });

    return {
      name: formData.get('pet_name'),
      type: formData.get('pet_type'),
      birthday: formData.get('pet_birthday'),
      breed: formData.get('pet_breed'),
      weight: formData.get('pet_weight'),
      allergies: allergies,
      healthBoost: formData.get('health_boost')
    };
  }

  /**
   * Submit pet data to Shopify
   * @param {Object} petData
   */
  async submitPetData(petData) {
    // Check if customer is logged in using the attribute from Liquid
    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';
    const customerId = this.getAttribute('customer-id');

    if (!isLoggedIn) {
      throw new Error('You must be logged in to create a pet profile.');
    }

    // Try to submit via API endpoint
    try {
      const response = await fetch('/apps/pet-profile/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerId,
          pet_data: petData
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Pet profile saved via API:', result);
        return result;
      } else {
        throw new Error('API endpoint returned error');
      }
    } catch (error) {
      // Fallback: Store in localStorage for development
      console.warn('API endpoint not available, storing in localStorage');
      console.log('Pet data:', petData);

      const pets = JSON.parse(localStorage.getItem('customer_pets') || '[]');
      const newPet = {
        ...petData,
        id: Date.now(),
        customer_id: customerId,
        created_at: new Date().toISOString()
      };
      pets.push(newPet);
      localStorage.setItem('customer_pets', JSON.stringify(pets));

      console.log('Pet saved to localStorage:', newPet);
      return { success: true, pet: newPet };
    }
  }

  /**
   * Show success message
   */
  showSuccess() {
    if (this.refs.successMessage) {
      this.refs.successMessage.hidden = false;
      this.refs.successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Show error message
   * @param {string} message
   */
  showError(message) {
    if (this.refs.errorMessage && this.refs.errorText) {
      this.refs.errorText.textContent = message;
      this.refs.errorMessage.hidden = false;
      this.refs.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Hide all messages
   */
  hideMessages() {
    if (this.refs.successMessage) {
      this.refs.successMessage.hidden = true;
    }
    if (this.refs.errorMessage) {
      this.refs.errorMessage.hidden = true;
    }
  }
}

customElements.define('pet-profile-form', PetProfileForm);
