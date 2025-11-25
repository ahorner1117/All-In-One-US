import { Component } from '@theme/component';

/**
 * Pet Signup Stepper Component
 * Handles a multi-step pet profile creation flow with initial pet type selection
 */
export class PetSignupStepper extends Component {
  constructor() {
    super();
    this.currentStep = 1;
    this.petName = '';
    this.petType = '';
    this.formData = {};
    this.petImage = null; // Compressed blob
    this.petImageDataUrl = null; // Data URL for preview
  }

  /**
   * Get total steps based on login status
   * @returns {number} Total steps in the form
   */
  get totalSteps() {
    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';
    return isLoggedIn ? 8 : 9;
  }

  connectedCallback() {
    super.connectedCallback();
    this.setupEventListeners();

    // Check if user returned from authentication
    this.handleAuthenticationReturn();
  }

  /**
   * Handle user returning from authentication
   */
  async handleAuthenticationReturn() {
    // Check if we have the pet_signup URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const isPetSignupReturn = urlParams.get('pet_signup') === 'true';

    if (!isPetSignupReturn) return;

    console.log('🔄 Pet signup return detected, initializing auto-submit...');

    // Add a small delay to ensure DOM and attributes are fully ready
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check if user is now logged in
    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';
    const customerId = this.getAttribute('customer-id');

    console.log('📊 Authentication status:', {
      isLoggedIn,
      hasCustomerId: !!customerId,
      customerIdPreview: customerId ? `${customerId.substring(0, 20)}...` : 'null'
    });

    if (!isLoggedIn) {
      console.error('❌ User returned but not logged in. Attributes:', {
        'customer-logged-in': this.getAttribute('customer-logged-in'),
        'customer-id': this.getAttribute('customer-id')
      });
      this.showError('Authentication failed. Please sign in and try again.');
      this.showRetryButton();
      return;
    }

    if (!customerId || customerId === 'null' || customerId === '') {
      console.error('❌ Customer ID is missing or invalid:', customerId);
      this.showError('We couldn\'t retrieve your account information. Please refresh and try again.');
      this.showRetryButton();
      return;
    }

    // Load saved data
    const savedData = this.loadFormDataFromSession();
    if (!savedData) {
      console.warn('⚠️ No saved pet signup data found in session');
      this.showError('Your form data was not found. Please fill out the form again.');
      return;
    }

    console.log('✅ Saved data loaded successfully:', {
      petType: savedData.petType,
      petName: savedData.petName,
      hasFormData: !!savedData.formData
    });

    // Hide pet type selection and show stepper form
    if (this.refs.petTypeSelection) {
      this.refs.petTypeSelection.hidden = true;
    }

    if (this.refs.stepperForm) {
      this.refs.stepperForm.hidden = false;
    }

    // Populate form with saved data
    this.populateFormFields(savedData);

    console.log('📝 Form populated, attempting auto-submit...');

    // Auto-submit the form
    try {
      await this.handleSubmit();

      // Clear session data after successful submission
      this.clearFormDataFromSession();

      console.log('✅ Pet profile successfully submitted and session data cleared');

      // Clean up URL (remove pet_signup parameter)
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (error) {
      console.error('❌ Auto-submit failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });

      this.showError(`Failed to create pet profile: ${error.message}`);
      this.showRetryButton();

      // Don't clear session data so user can retry
    }
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

    // Authentication step buttons (Step 9 for non-logged-in users)
    if (this.refs.createAccountButton) {
      this.refs.createAccountButton.addEventListener('click', () => {
        this.handleAuthenticationRedirect();
      });
    }

    if (this.refs.signInLink) {
      this.refs.signInLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Save data and redirect to login instead of register
        this.saveFormDataToSession();
        const returnUrl = encodeURIComponent(window.location.pathname + '?pet_signup=true');
        window.location.href = `/account/login?return_url=${returnUrl}`;
      });
    }

    // Image upload handlers
    if (this.refs.imagePreviewWrapper) {
      this.refs.imagePreviewWrapper.addEventListener('click', () => {
        this.refs.imageInput?.click();
      });
    }

    if (this.refs.imageInput) {
      this.refs.imageInput.addEventListener('change', (e) => {
        this.handleImageSelection(e);
      });
    }

    if (this.refs.changeImageButton) {
      this.refs.changeImageButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.refs.imageInput?.click();
      });
    }

    if (this.refs.skipImageButton) {
      this.refs.skipImageButton.addEventListener('click', () => {
        this.nextStep();
      });
    }
  }

  /**
   * Select pet type and transition to stepper
   * @param {string} type - 'dog' or 'cat'
   */
  selectPetType(type) {
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
    // Step 2 (image upload) is optional - always valid
    if (this.currentStep === 2) {
      return true;
    }

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

    // Generate review summary on step 8 (review step)
    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';
    if (this.currentStep === 8) {
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
    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';

    // Back button - show if not on first step
    if (this.refs.backButton) {
      this.refs.backButton.hidden = this.currentStep === 1;
    }

    // For logged-in users: totalSteps = 8 (review is last step with submit)
    // For non-logged-in users: totalSteps = 9 (step 8 = review with next, step 9 = auth with custom buttons)

    if (isLoggedIn) {
      // Logged in: Show submit on step 8 (review)
      if (this.refs.nextButton) {
        this.refs.nextButton.hidden = this.currentStep === 8;
      }
      if (this.refs.submitButton) {
        this.refs.submitButton.hidden = this.currentStep !== 8;
      }
    } else {
      // Not logged in: Show next through step 8, hide both on step 9 (custom buttons)
      if (this.refs.nextButton) {
        this.refs.nextButton.hidden = this.currentStep === 9;
      }
      if (this.refs.submitButton) {
        this.refs.submitButton.hidden = true; // Never show submit for non-logged-in users
      }
    }
  }

  /**
   * Handle image file selection
   */
  async handleImageSelection(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showError('Please select a valid image file (JPG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      this.showError('Image file is too large. Please select an image under 5MB');
      return;
    }

    try {
      // Compress image
      const { blob, dataUrl } = await this.compressImage(file);
      this.petImage = blob;
      this.petImageDataUrl = dataUrl;
      this.showImagePreview(dataUrl);
      this.hideMessages();
    } catch (error) {
      console.error('Failed to process image:', error);
      this.showError('Failed to process image. Please try again.');
    }
  }

  /**
   * Compress image using Canvas API
   */
  async compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Calculate dimensions (max 800x800, maintain aspect ratio)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          // Create canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob at 85% quality
          canvas.toBlob(
            (blob) => {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              resolve({ blob, dataUrl });
            },
            'image/jpeg',
            0.85
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Show image preview
   */
  showImagePreview(dataUrl) {
    if (this.refs.imagePreview && this.refs.imagePlaceholder && this.refs.changeImageButton) {
      this.refs.imagePreview.src = dataUrl;
      this.refs.imagePreview.hidden = false;
      this.refs.imagePlaceholder.hidden = true;
      this.refs.changeImageButton.hidden = false;
    }
  }

  /**
   * Reset image upload
   */
  resetImageUpload() {
    this.petImage = null;
    this.petImageDataUrl = null;

    if (this.refs.imageInput) {
      this.refs.imageInput.value = '';
    }

    if (this.refs.imagePreview && this.refs.imagePlaceholder && this.refs.changeImageButton) {
      this.refs.imagePreview.hidden = true;
      this.refs.imagePlaceholder.hidden = false;
      this.refs.changeImageButton.hidden = true;
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

    // Add image preview if available
    if (this.petImageDataUrl) {
      summaryHTML += `
        <div class="review-summary__image">
          <img src="${this.petImageDataUrl}" alt="Pet photo"
               style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin: 0 auto var(--gap-md) auto; display: block;">
        </div>
      `;
    }

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

      // Create new FormData for submission
      const submitFormData = new FormData();
      submitFormData.append('customer_id', this.getAttribute('customer-id'));
      submitFormData.append('pet_data', JSON.stringify(petData));

      // Append image if available
      if (this.petImage) {
        submitFormData.append('pet_image', this.petImage, `${petData.name}-photo.jpg`);
      }

      // Submit to Shopify
      await this.submitPetData(submitFormData);

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
   * @param {FormData} formData - FormData with customer_id, pet_data, and optional pet_image
   */
  async submitPetData(formData) {
    // Check if customer is logged in using the attribute from Liquid
    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';
    const customerId = this.getAttribute('customer-id');

    console.log('🚀 submitPetData called');

    if (!isLoggedIn) {
      console.error('❌ Login check failed:', {
        'customer-logged-in': this.getAttribute('customer-logged-in')
      });
      throw new Error('You must be logged in to create a pet profile.');
    }

    if (!customerId || customerId === 'null' || customerId === '' || customerId === 'undefined') {
      console.error('❌ Customer ID validation failed:', {
        customerId,
        type: typeof customerId,
        isNull: customerId === null,
        isEmpty: customerId === '',
        isStringNull: customerId === 'null'
      });
      throw new Error('Customer ID is missing. Please refresh the page and try again.');
    }

    console.log('📦 Submitting pet data for customer:', customerId.substring(0, 30) + '...');

    // Submit to Shopify app endpoint to create metaobject
    try {
      const response = await fetch('https://pet-profile-app.vercel.app/apps/pet-profile/create', {
        method: 'POST',
        // Don't set Content-Type - browser will add boundary for multipart
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Pet profile saved to Shopify metaobject:', result);

        // Also save to localStorage as a cache
        if (result.pet) {
          this.savePetToLocalStorage(result.pet, result.metaobject_id, customerId);
        }

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

    // Also hide retry button if it exists
    if (this.refs.retryButton) {
      this.refs.retryButton.hidden = true;
    }
  }

  /**
   * Show retry button for failed auto-submit
   */
  showRetryButton() {
    // Create retry button if it doesn't exist
    if (!this.refs.retryButton) {
      const retryButton = document.createElement('button');
      retryButton.setAttribute('ref', 'retryButton');
      retryButton.className = 'button button--primary retry-button';
      retryButton.textContent = 'Try Submitting Again';
      retryButton.style.marginTop = 'var(--gap-md)';
      retryButton.style.width = '100%';

      retryButton.addEventListener('click', async () => {
        console.log('🔄 Manual retry triggered');
        this.hideMessages();

        try {
          await this.handleSubmit();

          // Clear session data after successful submission
          this.clearFormDataFromSession();

          // Clean up URL
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (error) {
          console.error('❌ Manual retry failed:', error);
          this.showError(`Failed to create pet profile: ${error.message}`);
          // Keep retry button visible
        }
      });

      // Insert after error message
      if (this.refs.errorMessage && this.refs.errorMessage.parentNode) {
        this.refs.errorMessage.parentNode.insertBefore(
          retryButton,
          this.refs.errorMessage.nextSibling
        );
      }
    } else {
      this.refs.retryButton.hidden = false;
    }
  }

  /**
   * Save form data to localStorage before authentication redirect
   * Using localStorage instead of sessionStorage for better persistence across OAuth redirects
   */
  saveFormDataToSession() {
    const formData = new FormData(this.refs.form);
    const petData = this.getFormData(formData);

    const sessionData = {
      petType: this.petType,
      petName: this.petName,
      formData: petData,
      imageDataUrl: this.petImageDataUrl, // Add this
      timestamp: Date.now(),
      currentStep: this.currentStep
    };

    localStorage.setItem('pet_signup_pending_data', JSON.stringify(sessionData));
    console.log('💾 Pet signup data saved to localStorage:', sessionData);
  }

  /**
   * Load form data from localStorage after authentication
   * @returns {Object|null} Saved form data or null if not found
   */
  loadFormDataFromSession() {
    const savedData = localStorage.getItem('pet_signup_pending_data');
    if (!savedData) return null;

    try {
      const data = JSON.parse(savedData);

      // Check if data is too old (> 1 hour)
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - data.timestamp > oneHour) {
        console.warn('⚠️ Saved pet signup data is too old, clearing...');
        this.clearFormDataFromSession();
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error parsing saved pet signup data:', e);
      this.clearFormDataFromSession();
      return null;
    }
  }

  /**
   * Clear form data from localStorage
   */
  clearFormDataFromSession() {
    localStorage.removeItem('pet_signup_pending_data');
    console.log('🗑️ Pet signup session data cleared');
  }

  /**
   * Populate form fields with saved data
   * @param {Object} savedData - The saved form data
   */
  populateFormFields(savedData) {
    if (!savedData || !this.refs.form) return;

    const { petType, petName, formData, imageDataUrl } = savedData;

    // Set pet type and name
    this.petType = petType;
    this.petName = petName;

    // Restore image if available
    if (imageDataUrl) {
      this.petImageDataUrl = imageDataUrl;
      this.showImagePreview(imageDataUrl);
    }

    // Populate form fields
    const form = this.refs.form;

    if (formData.name) {
      const nameInput = form.querySelector('input[name="pet_name"]');
      if (nameInput) nameInput.value = formData.name;
    }

    if (formData.birthday) {
      const birthdayInput = form.querySelector('input[name="pet_birthday"]');
      if (birthdayInput) birthdayInput.value = formData.birthday;
    }

    if (formData.breed) {
      const breedInput = form.querySelector('input[name="pet_breed"]');
      if (breedInput) breedInput.value = formData.breed;
    }

    if (formData.weight) {
      const weightInput = form.querySelector(`input[name="pet_weight"][value="${formData.weight}"]`);
      if (weightInput) weightInput.checked = true;
    }

    if (formData.allergies && formData.allergies.length > 0) {
      formData.allergies.forEach(allergy => {
        const allergyInput = form.querySelector(`input[name="allergies"][value="${allergy}"]`);
        if (allergyInput) allergyInput.checked = true;
      });
    }

    if (formData.health_boost) {
      const boostInput = form.querySelector(`input[name="health_boost"][value="${formData.health_boost}"]`);
      if (boostInput) boostInput.checked = true;
    }

    // Update weight options based on pet type
    this.updateWeightOptions(petType);

    // Update dynamic text
    this.updateDynamicText(petName);

    console.log('✅ Form fields populated with saved data');
  }

  /**
   * Handle authentication redirect for non-logged-in users
   */
  handleAuthenticationRedirect() {
    // Save current form data
    this.saveFormDataToSession();

    // Redirect to registration page with return URL
    const returnUrl = encodeURIComponent(window.location.pathname + '?pet_signup=true');
    window.location.href = `/account/register?return_url=${returnUrl}`;
  }
}

customElements.define('pet-signup-stepper', PetSignupStepper);
