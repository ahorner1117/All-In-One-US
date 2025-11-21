import { Component } from '@theme/component';

/**
 * Pet Signup Stepper Component
 * Handles a multi-step pet profile creation flow with initial pet type selection
 */
export class PetSignupStepper extends Component {
  constructor() {
    super();
    this.currentStep = 1;
    this.totalSteps = 7;
    this.petName = '';
    this.petType = '';
    this.formData = {};
  }

  connectedCallback() {
    super.connectedCallback();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Pet type selection cards
    if (this.refs.dogCard) {
      this.refs.dogCard.addEventListener('click', () => {
        this.selectPetType('dog');
      });
    }

    if (this.refs.catCard) {
      this.refs.catCard.addEventListener('click', () => {
        this.selectPetType('cat');
      });
    }

    // Pet name input - update dynamic text
    if (this.refs.petNameInput) {
      this.refs.petNameInput.addEventListener('input', (e) => {
        this.updateDynamicText(e.target.value);
      });
    }

    // Navigation buttons
    if (this.refs.nextButton) {
      this.refs.nextButton.addEventListener('click', () => {
        this.nextStep();
      });
    }

    if (this.refs.backButton) {
      this.refs.backButton.addEventListener('click', () => {
        this.previousStep();
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
   * Select pet type and transition to stepper
   * @param {string} type - 'dog' or 'cat'
   */
  selectPetType(type) {
    // Check if customer is logged in
    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';

    if (!isLoggedIn) {
      // Redirect to login page with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/account/login?return_url=${returnUrl}`;
      return;
    }

    this.petType = type;

    // Hide pet type selection and show stepper form
    if (this.refs.petTypeSelection) {
      this.refs.petTypeSelection.hidden = true;
    }

    if (this.refs.stepperForm) {
      this.refs.stepperForm.hidden = false;
    }

    // Set up weight options based on pet type
    this.updateWeightOptions(type);

    // Scroll to the stepper form on mobile only
    const isMobile = window.matchMedia('(max-width: 749px)').matches;
    if (isMobile && this.refs.stepperForm) {
      setTimeout(() => {
        this.refs.stepperForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }

    // Focus on first input
    if (this.refs.petNameInput) {
      setTimeout(() => {
        this.refs.petNameInput.focus();
      }, 200);
    }
  }

  /**
   * Update weight options based on pet type
   * @param {string} type - 'dog' or 'cat'
   */
  updateWeightOptions(type) {
    const dogOptions = this.refs.dogWeightOptions;
    const catOptions = this.refs.catWeightOptions;

    if (type === 'cat') {
      if (dogOptions) {
        dogOptions.hidden = true;
      }
      if (catOptions) {
        catOptions.hidden = false;
      }
    } else {
      if (dogOptions) {
        dogOptions.hidden = false;
      }
      if (catOptions) {
        catOptions.hidden = true;
      }
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

    // Update all dynamic labels
    const dynamicLabels = [
      { ref: 'birthdayTitle', original: null },
      { ref: 'breedTitle', original: null },
      { ref: 'weightTitle', original: null },
      { ref: 'allergiesTitle', original: null },
      { ref: 'boostTitle', original: null },
      { ref: 'reviewTitle', original: null }
    ];

    dynamicLabels.forEach(({ ref }) => {
      const element = this.refs[ref];
      if (element) {
        // Store original text on first run
        if (!element.dataset.original) {
          element.dataset.original = element.textContent;
        }

        // Replace [pet_name] placeholder
        element.textContent = element.dataset.original.replace(/\[pet_name\]/g, this.petName);
      }
    });
  }

  /**
   * Validate current step
   * @returns {boolean} - Whether current step is valid
   */
  validateStep() {
    const currentStepElement = this.refs.step?.[this.currentStep - 1];
    if (!currentStepElement) return false;

    // Get all inputs in current step
    const inputs = currentStepElement.querySelectorAll('input[type="text"], input[type="date"], input[type="radio"], input[type="checkbox"]');

    // For text and date inputs
    const textInputs = currentStepElement.querySelectorAll('input[type="text"], input[type="date"]');
    for (const input of textInputs) {
      if (input.hasAttribute('required') && !input.value.trim()) {
        this.showError('Please fill in this field to continue.');
        input.focus();
        return false;
      }
    }

    // For radio inputs (at least one must be checked)
    const radioGroups = {};
    const radioInputs = currentStepElement.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(radio => {
      const name = radio.name;
      if (!radioGroups[name]) {
        radioGroups[name] = [];
      }
      radioGroups[name].push(radio);
    });

    for (const name in radioGroups) {
      const radios = radioGroups[name];
      const checked = radios.some(radio => radio.checked);
      if (!checked) {
        this.showError('Please select an option to continue.');
        return false;
      }
    }

    // Step 5 (allergies) is optional - checkboxes don't require validation

    return true;
  }

  /**
   * Move to next step
   */
  nextStep() {
    // Validate current step
    if (!this.validateStep()) {
      return;
    }

    // Hide current step
    if (this.refs.step?.[this.currentStep - 1]) {
      this.refs.step[this.currentStep - 1].hidden = true;
    }

    // Move to next step
    this.currentStep++;

    // Show next step
    if (this.refs.step?.[this.currentStep - 1]) {
      this.refs.step[this.currentStep - 1].hidden = false;
    }

    // Update progress
    this.updateProgress();

    // Update buttons
    this.updateButtons();

    // If on review step, generate summary
    if (this.currentStep === this.totalSteps) {
      this.generateReviewSummary();
    }

    // Scroll to top of form
    this.scrollToTop();
  }

  /**
   * Move to previous step
   */
  previousStep() {
    // Hide current step
    if (this.refs.step?.[this.currentStep - 1]) {
      this.refs.step[this.currentStep - 1].hidden = true;
    }

    // Move to previous step
    this.currentStep--;

    // Show previous step
    if (this.refs.step?.[this.currentStep - 1]) {
      this.refs.step[this.currentStep - 1].hidden = false;
    }

    // Update progress
    this.updateProgress();

    // Update buttons
    this.updateButtons();

    // Scroll to top of form
    this.scrollToTop();
  }

  /**
   * Update progress bar and text
   */
  updateProgress() {
    const progressPercent = (this.currentStep / this.totalSteps) * 100;

    if (this.refs.progressFill) {
      this.refs.progressFill.style.width = `${progressPercent}%`;
    }

    if (this.refs.progressText) {
      this.refs.progressText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
    }
  }

  /**
   * Update button visibility
   */
  updateButtons() {
    // Back button - show if not on first step
    if (this.refs.backButton) {
      this.refs.backButton.hidden = this.currentStep === 1;
    }

    // Next button - hide on last step
    if (this.refs.nextButton) {
      this.refs.nextButton.hidden = this.currentStep === this.totalSteps;
    }

    // Submit button - show on last step
    if (this.refs.submitButton) {
      this.refs.submitButton.hidden = this.currentStep !== this.totalSteps;
    }
  }

  /**
   * Generate review summary
   */
  generateReviewSummary() {
    if (!this.refs.reviewSummary || !this.refs.form) return;

    const formData = new FormData(this.refs.form);
    const data = this.getFormData(formData);

    // Build summary HTML
    let summaryHTML = '';

    const fields = [
      { label: 'Pet Type', value: this.petType === 'dog' ? '🐕 Dog' : '🐱 Cat' },
      { label: 'Name', value: data.name || 'Not provided' },
      { label: 'Birthday', value: data.birthday || 'Not provided' },
      { label: 'Breed', value: data.breed || 'Not provided' },
      { label: 'Weight', value: this.formatWeight(data.weight) },
      { label: 'Allergies', value: data.allergies.length > 0 ? data.allergies.join(', ') : 'None' },
      { label: 'Health Boost', value: this.formatHealthBoost(data.health_boost) }
    ];

    fields.forEach(field => {
      summaryHTML += `
        <div class="review-summary__item">
          <span class="review-summary__label">${field.label}</span>
          <span class="review-summary__value">${field.value}</span>
        </div>
      `;
    });

    this.refs.reviewSummary.innerHTML = summaryHTML;
  }

  /**
   * Format weight value for display
   * @param {string} weight
   * @returns {string}
   */
  formatWeight(weight) {
    const weights = {
      'tiny': 'Tiny but mighty (<10lbs)',
      'medium': 'Perfect medium (25-50lbs)',
      'large': 'Large and in charge (50+lbs)',
      'cat': 'Standard cat size'
    };
    return weights[weight] || weight;
  }

  /**
   * Format health boost value for display
   * @param {string} boost
   * @returns {string}
   */
  formatHealthBoost(boost) {
    const boosts = {
      'joint_support': '🦴 Joint support',
      'gut_health': '🌟 Gut health',
      'probiotic': '💚 Pre + pro biotic'
    };
    return boosts[boost] || boost;
  }

  /**
   * Scroll to top of stepper form
   */
  scrollToTop() {
    if (this.refs.stepperProgress) {
      this.refs.stepperProgress.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

      // Add pet type
      petData.type = this.petType;

      // Submit to Shopify
      await this.submitPetData(petData);

      // Show success message
      this.showSuccess();

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('petProfileCreated', {
        detail: { petData }
      }));

      // Redirect after delay
      setTimeout(() => {
        window.location.href = '/pages/my-pets';
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
      birthday: formData.get('pet_birthday'),
      breed: formData.get('pet_breed'),
      weight: formData.get('pet_weight'),
      allergies: allergies,
      health_boost: formData.get('health_boost')
    };
  }

  /**
   * Submit pet data to Shopify metaobject
   * @param {Object} petData
   */
  async submitPetData(petData) {
    // Check if customer is logged in using the attribute from Liquid
    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';
    const customerId = this.getAttribute('customer-id');

    if (!isLoggedIn) {
      throw new Error('You must be logged in to create a pet profile.');
    }

    const payload = {
      customer_id: customerId,
      pet_data: petData
    };

    console.log('Submitting pet data for customer:', customerId);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Submit to Shopify app endpoint to create metaobject
    try {
      const response = await fetch('https://pet-profile-app.vercel.app/apps/pet-profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Pet profile saved to Shopify metaobject:', result);

        // Also save to localStorage as a cache
        this.savePetToLocalStorage(petData, result.metaobject_id, customerId);

        return result;
      } else {
        // Get response as text first, then try to parse as JSON
        const responseText = await response.text();
        let errorMessage = 'Failed to save pet profile';

        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use the text directly
          if (responseText) {
            errorMessage = `Server error (${response.status}): ${responseText.substring(0, 100)}`;
          } else {
            errorMessage = `Server returned ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error calling API:', error);

      // Fallback: Store in localStorage only (development mode)
      console.warn('⚠️ API endpoint not available. Saving to localStorage only.');
      console.warn('⚠️ This pet will NOT sync across devices until API is set up.');

      const newPet = this.savePetToLocalStorage(petData, `temp-${Date.now()}`, customerId);

      // Show warning to user
      console.log('💡 To sync pets across devices, set up the Shopify app endpoint.');

      return { success: true, pet: newPet, local_only: true };
    }
  }

  /**
   * Save pet to localStorage as cache/fallback
   * @param {Object} petData
   * @param {string} metaobjectId
   * @param {string} customerId
   * @returns {Object} The saved pet object
   */
  savePetToLocalStorage(petData, metaobjectId, customerId) {
    const pets = JSON.parse(localStorage.getItem('customer_pets') || '[]');
    const newPet = {
      ...petData,
      id: metaobjectId,
      customer_id: customerId,
      created_at: new Date().toISOString()
    };
    pets.push(newPet);
    localStorage.setItem('customer_pets', JSON.stringify(pets));
    console.log('💾 Pet cached to localStorage:', newPet);
    return newPet;
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

customElements.define('pet-signup-stepper', PetSignupStepper);
