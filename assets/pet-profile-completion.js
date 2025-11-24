import { Component } from '@theme/component';

/**
 * Pet Profile Completion Component
 *
 * This component automatically checks for and submits pending pet profiles
 * after a user logs in. It handles the OAuth/Google sign-in redirect flow
 * by persisting form data in localStorage across the login redirect.
 */
export class PetProfileCompletion extends Component {
  connectedCallback() {
    super.connectedCallback();

    // Only run if customer is logged in
    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';
    const customerId = this.getAttribute('customer-id');

    if (isLoggedIn && customerId) {
      // Check for both simple form and stepper form pending data
      this.checkForPendingPetProfile(customerId);
      this.checkForPendingStepperData(customerId);
    }
  }

  /**
   * Check localStorage for pending pet profile submission
   * @param {string} customerId - The logged-in customer's ID
   */
  async checkForPendingPetProfile(customerId) {
    const pendingDataStr = localStorage.getItem('pending_pet_profile');

    if (!pendingDataStr) {
      // No pending pet profile
      return;
    }

    try {
      const pendingData = JSON.parse(pendingDataStr);
      const petData = pendingData.pet_data;
      const processing = pendingData.processing;

      // Prevent double submission if already processing
      if (processing) {
        console.log('⏸️ Pet profile data already being processed, skipping...');
        return;
      }

      if (!petData) {
        console.warn('⚠️ Pending pet data is invalid');
        localStorage.removeItem('pending_pet_profile');
        return;
      }

      console.log('🐾 Found pending pet profile! Auto-submitting for customer:', customerId);
      console.log('Pet data:', petData);

      // Mark as processing to prevent double submission
      pendingData.processing = true;
      localStorage.setItem('pending_pet_profile', JSON.stringify(pendingData));

      // Show notification to user
      this.showNotification('Completing your pet profile...', 'info');

      // Submit the pet profile
      await this.submitPetProfile(customerId, petData);

      // Clear pending data after successful submission
      localStorage.removeItem('pending_pet_profile');

      // Show success message
      this.showNotification('Pet profile created successfully! 🎉', 'success');

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('petProfileCompleted', {
        detail: { petData, customerId }
      }));

      // Optionally redirect to pets page after a delay
      setTimeout(() => {
        // Uncomment to redirect to a pets management page
        // window.location.href = '/account#pets';
      }, 2000);

    } catch (error) {
      console.error('❌ Error completing pet profile:', error);

      // Show error to user
      this.showNotification(`Failed to create pet profile: ${error.message}`, 'error');

      // Keep the pending data so user can try again
      console.log('⚠️ Pending data preserved for retry');
    }
  }

  /**
   * Submit pet profile to the API
   * @param {string} customerId - Customer ID
   * @param {Object} petData - Pet profile data
   */
  async submitPetProfile(customerId, petData) {
    const payload = {
      customer_id: customerId,
      pet_data: petData
    };

    console.log('Submitting pending pet profile...');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://pet-profile-app.vercel.app/apps/pet-profile/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const responseText = await response.text();
      let errorMessage = 'Failed to save pet profile';

      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        if (responseText) {
          errorMessage = `Server error (${response.status}): ${responseText.substring(0, 100)}`;
        } else {
          errorMessage = `Server returned ${response.status} ${response.statusText}`;
        }
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Pet profile saved:', result);

    return result;
  }

  /**
   * Check localStorage for pending pet signup stepper data
   * @param {string} customerId - The logged-in customer's ID
   */
  async checkForPendingStepperData(customerId) {
    const pendingDataStr = localStorage.getItem('pet_signup_pending_data');

    if (!pendingDataStr) {
      // No pending stepper data
      return;
    }

    try {
      const pendingData = JSON.parse(pendingDataStr);
      const { petType, petName, formData, processing } = pendingData;

      // Prevent double submission if already processing
      if (processing) {
        console.log('⏸️ Stepper data already being processed, skipping...');
        return;
      }

      if (!formData || !petType) {
        console.warn('⚠️ Pending stepper data is invalid');
        localStorage.removeItem('pet_signup_pending_data');
        return;
      }

      // Check if data is too old (> 1 hour)
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - pendingData.timestamp > oneHour) {
        console.warn('⚠️ Saved pet signup data is too old, clearing...');
        localStorage.removeItem('pet_signup_pending_data');
        return;
      }

      console.log('🐾 Found pending pet stepper data! Auto-submitting for customer:', customerId);
      console.log('Pet data:', { petType, petName, formData });

      // Mark as processing to prevent double submission
      pendingData.processing = true;
      localStorage.setItem('pet_signup_pending_data', JSON.stringify(pendingData));

      // Show notification to user
      this.showNotification(`Completing ${petName || 'your pet'}'s profile...`, 'info');

      // Prepare complete pet data with type
      const completePetData = {
        ...formData,
        type: petType
      };

      // Submit the pet profile
      await this.submitPetProfile(customerId, completePetData);

      // Clear pending data after successful submission
      localStorage.removeItem('pet_signup_pending_data');

      // Show success message
      this.showNotification(`${petName || 'Pet'} profile created successfully! 🎉`, 'success');

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('petProfileCompleted', {
        detail: { petData: completePetData, customerId }
      }));

      // Optionally redirect to pets page after a delay
      setTimeout(() => {
        // Uncomment to redirect to a pets management page
        // window.location.href = '/pages/my-pets';
      }, 2000);

    } catch (error) {
      console.error('❌ Error completing pet stepper profile:', error);

      // Show error to user
      this.showNotification(`Failed to create pet profile: ${error.message}`, 'error');

      // Keep the pending data so user can try again
      console.log('⚠️ Pending stepper data preserved for retry');
    }
  }

  /**
   * Show a notification to the user
   * @param {string} message - The message to display
   * @param {string} type - 'info', 'success', or 'error'
   */
  showNotification(message, type = 'info') {
    // Check if there's a notification container
    if (this.refs.notification) {
      this.refs.notificationText.textContent = message;
      this.refs.notification.className = `pet-profile-notification pet-profile-notification--${type}`;
      this.refs.notification.hidden = false;

      // Auto-hide after 5 seconds for success/info
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          if (this.refs.notification) {
            this.refs.notification.hidden = true;
          }
        }, 5000);
      }
    } else {
      // Fallback: Create a simple notification
      const notification = document.createElement('div');
      notification.className = `pet-profile-notification pet-profile-notification--${type}`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);

      // Auto-remove after 5 seconds for success/info
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          notification.remove();
        }, 5000);
      }
    }
  }
}

customElements.define('pet-profile-completion', PetProfileCompletion);
