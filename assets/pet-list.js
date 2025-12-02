import { Component } from '@theme/component';

/**
 * Pet List Component
 * Displays customer's pets with edit and delete functionality
 */
export class PetList extends Component {
  constructor() {
    super();
    this.pets = [];
    this.petToDelete = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadPets();
  }

  /**
   * Load pets from Shopify metaobjects
   */
  async loadPets() {
    this.showLoading();

    const isLoggedIn = this.getAttribute('customer-logged-in') === 'true';
    const customerId = this.getAttribute('customer-id');

    if (!isLoggedIn) {
      console.warn('Customer not logged in, showing empty state');
      this.pets = [];
      this.renderPets();
      return;
    }

    console.log('Loading pets for customer:', customerId);

    try {
      // Fetch from Shopify metaobjects via app endpoint
      const response = await fetch(`https://pet-profile-app.vercel.app/apps/pet-profile/list?customer_id=${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.pets = data.pets || [];
        console.log('✅ Loaded', this.pets.length, 'pets from Shopify metaobjects');

        // Update localStorage cache
        this.updateLocalStorageCache(this.pets, customerId);

        this.renderPets();
        return;
      } else {
        throw new Error('API endpoint not available');
      }
    } catch (error) {
      console.warn('⚠️ API endpoint not available, loading from localStorage cache');

      // Fallback to localStorage - filter by customer ID
      const allPets = JSON.parse(localStorage.getItem('customer_pets') || '[]');
      this.pets = allPets.filter(pet =>
        !pet.customer_id || pet.customer_id === customerId
      );

      console.log('📦 Loaded', this.pets.length, 'pets from localStorage cache');
      console.log('💡 These pets may not be synced. Set up the API endpoint for cross-device sync.');
    }

    this.renderPets();
  }

  /**
   * Update localStorage cache with pets from API
   * @param {Array} pets
   * @param {string} customerId
   */
  updateLocalStorageCache(pets, customerId) {
    // Get all pets from localStorage
    const allPets = JSON.parse(localStorage.getItem('customer_pets') || '[]');

    // Remove this customer's old pets
    const otherPets = allPets.filter(p => p.customer_id !== customerId);

    // Add the fresh pets from API
    const updatedPets = [...otherPets, ...pets];

    localStorage.setItem('customer_pets', JSON.stringify(updatedPets));
    console.log('💾 Updated localStorage cache with', pets.length, 'pets');
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (this.refs.loadingState) {
      this.refs.loadingState.hidden = false;
    }
    if (this.refs.emptyState) {
      this.refs.emptyState.hidden = true;
    }
    if (this.refs.petGrid) {
      this.refs.petGrid.innerHTML = '';
    }
  }

  /**
   * Render pets in the grid
   */
  renderPets() {
    if (this.refs.loadingState) {
      this.refs.loadingState.hidden = true;
    }

    if (this.pets.length === 0) {
      this.showEmptyState();
      return;
    }

    if (this.refs.emptyState) {
      this.refs.emptyState.hidden = true;
    }

    const petsWithImages = this.pets.map(pet => ({
      ...pet,
      image_url: this.normalizeImageUrl(pet.image_url, pet)
    }));

    console.log('🎨 Rendering pets with images:', petsWithImages.map(p => ({ name: p.name, hasImage: !!p.image_url, image_url: p.image_url })));

    if (this.refs.petGrid) {
      this.refs.petGrid.innerHTML = petsWithImages.map(pet => this.createPetCard(pet)).join('');
      this.attachCardEventListeners();
    }
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    if (this.refs.emptyState) {
      this.refs.emptyState.hidden = false;
    }
    if (this.refs.petGrid) {
      this.refs.petGrid.innerHTML = '';
    }
  }

  /**
   * Create HTML for a pet card
   * @param {Object} pet - Pet data
   * @returns {string} HTML string
   */
  createPetCard(pet) {
    const typeIcon = pet.type === 'cat' ? '🐱' : '🐕';
    const defaultPlaceholder = pet.type === 'cat' ? '🐱' : '🐕';
    const weightLabels = {
      'tiny': 'Tiny but mighty (<10lbs)',
      'medium': 'Perfect medium (25-50lbs)',
      'large': 'Large and in charge (50+lbs)',
      'cat': 'One size fits all'
    };
    const weightLabel = weightLabels[pet.weight] || pet.weight;


    const allergyIcons = {
      'beef': '🥩',
      'chicken': '🍗',
      'lamb': '🐑',
      'turkey': '🦃'
    };

    const birthdayFormatted = pet.birthday ? new Date(pet.birthday).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : '';

    // Image rendering
    let imageHtml = '';
    const hasValidImage = pet.image_url && pet.image_url.trim() !== '';

    console.log("Pet - ", pet)
    if (hasValidImage) {
      imageHtml = `
        <div class="pet-card__image-container">
          <img src="${this.escapeHtml(pet.image_url)}"
               alt="${this.escapeHtml(pet.name)}"
               class="pet-card__image"
               loading="lazy"
               data-placeholder="${defaultPlaceholder}">
        </div>
      `;
    } else {
      imageHtml = `
        <div class="pet-card__image-container">
          <div class="pet-card__placeholder-image">${defaultPlaceholder}</div>
        </div>
      `;
    }

    return `
      <div class="pet-card" data-pet-id="${pet.id}">
        ${imageHtml}
        <div class="pet-card__header">
          <h3 class="pet-card__name">
            <span class="pet-card__type-icon">${typeIcon}</span>
            ${this.escapeHtml(pet.name)}
          </h3>
          <div class="pet-card__actions">
            <button
              class="pet-card__action pet-card__action--edit"
              data-pet-id="${pet.id}"
              aria-label="Edit ${this.escapeHtml(pet.name)}"
              title="Edit"
            >
              ✏️
            </button>
            <button
              class="pet-card__action pet-card__action--delete"
              data-pet-id="${pet.id}"
              aria-label="Delete ${this.escapeHtml(pet.name)}"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="pet-card__info">
          ${pet.breed ? `
            <div class="pet-card__info-row">
              <span class="pet-card__info-label">Breed:</span>
              <span class="pet-card__info-value">${this.escapeHtml(pet.breed)}</span>
            </div>
          ` : ''}

          ${birthdayFormatted ? `
            <div class="pet-card__info-row">
              <span class="pet-card__info-label">Birthday:</span>
              <span class="pet-card__info-value">${birthdayFormatted}</span>
            </div>
          ` : ''}

          ${pet.weight ? `
            <div class="pet-card__info-row">
              <span class="pet-card__info-label">Size:</span>
              <span class="pet-card__info-value">${weightLabel}</span>
            </div>
          ` : ''}
        </div>

        <div class="pet-card__badges">
          ${pet.allergies && pet.allergies.length > 0 ?
            pet.allergies.map(allergy => `
              <span class="pet-card__badge pet-card__badge--allergy">
                ${allergyIcons[allergy] || ''} No ${this.escapeHtml(allergy)}
              </span>
            `).join('') : ''
          }

          
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  normalizeImageUrl(imageValue) {
    let url = imageValue;
    if (!url) return '';
    try {
      const parsed = typeof url === 'string' ? JSON.parse(url) : url;
      if (parsed && typeof parsed === 'object') {
        if (parsed.dataUri) return parsed.dataUri;
        const base64 = parsed.base64 || parsed.data || parsed.value;
        const mime = parsed.mime || parsed.type || 'image/jpeg';
        if (base64) return `data:${mime};base64,${base64}`;
      }
    } catch {}
    return url;
  }

  /**
   * Attach event listeners to card actions
   */
  attachCardEventListeners() {
    // Edit buttons
    this.querySelectorAll('.pet-card__action--edit').forEach(button => {
      button.addEventListener('click', (e) => {
        const petId = e.currentTarget.dataset.petId;
        this.handleEdit(petId);
      });
    });

    // Delete buttons
    this.querySelectorAll('.pet-card__action--delete').forEach(button => {
      button.addEventListener('click', (e) => {
        const petId = e.currentTarget.dataset.petId;
        this.handleDelete(petId);
      });
    });
    this.attachImageErrorHandlers();
  }

  attachImageErrorHandlers() {
    this.querySelectorAll('.pet-card__image').forEach(img => {
      img.addEventListener('error', () => {
        const container = img.closest('.pet-card__image-container');
        if (container) {
          const ph = img.dataset.placeholder || '🐾';
          container.innerHTML = `<div class="pet-card__placeholder-image">${ph}</div>`;
        }
      }, { once: true });
    });
  }

  /**
   * Handle edit pet
   * @param {string} petId
   */
  handleEdit(petId) {
    const pet = this.pets.find(p => String(p.id) === String(petId));
    if (!pet) return;

    // Store pet data in sessionStorage for the edit page
    sessionStorage.setItem('edit_pet', JSON.stringify(pet));

    // Redirect to edit page (you can customize this URL)
    // For now, we'll just show an alert
    alert(`Edit functionality coming soon!\n\nPet: ${pet.name}\nID: ${pet.id}`);

    // In production, redirect to edit page:
    // window.location.href = `/pages/edit-pet?id=${petId}`;
  }

  /**
   * Handle delete pet
   * @param {string} petId
   */
  handleDelete(petId) {
    const pet = this.pets.find(p => String(p.id) === String(petId));
    if (!pet) return;

    this.petToDelete = pet;
    this.showDeleteModal();
  }

  /**
   * Show delete confirmation modal
   */
  showDeleteModal() {
    if (!this.petToDelete) return;

    // Create modal if it doesn't exist
    let modal = this.querySelector('.pet-delete-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'pet-delete-modal';
      modal.innerHTML = `
        <div class="pet-delete-modal__content">
          <h3 class="pet-delete-modal__title">Delete Pet Profile?</h3>
          <p class="pet-delete-modal__text">
            Are you sure you want to delete <strong>${this.escapeHtml(this.petToDelete.name)}</strong>'s profile?
            This action cannot be undone.
          </p>
          <div class="pet-delete-modal__actions">
            <button class="pet-delete-modal__button pet-delete-modal__button--cancel">
              Cancel
            </button>
            <button class="pet-delete-modal__button pet-delete-modal__button--delete">
              Delete
            </button>
          </div>
        </div>
      `;
      this.appendChild(modal);

      // Attach event listeners
      modal.querySelector('.pet-delete-modal__button--cancel').addEventListener('click', () => {
        this.hideDeleteModal();
      });

      modal.querySelector('.pet-delete-modal__button--delete').addEventListener('click', () => {
        this.confirmDelete();
      });

      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideDeleteModal();
        }
      });
    } else {
      // Update modal content
      modal.querySelector('.pet-delete-modal__text').innerHTML = `
        Are you sure you want to delete <strong>${this.escapeHtml(this.petToDelete.name)}</strong>'s profile?
        This action cannot be undone.
      `;
    }

    modal.hidden = false;
  }

  /**
   * Hide delete modal
   */
  hideDeleteModal() {
    const modal = this.querySelector('.pet-delete-modal');
    if (modal) {
      modal.hidden = true;
    }
    this.petToDelete = null;
  }

  /**
   * Confirm and execute delete
   */
  async confirmDelete() {
    if (!this.petToDelete) return;

    const petId = this.petToDelete.id;
    const petName = this.petToDelete.name;
    this.hideDeleteModal();

    console.log('Deleting pet:', petId);

    try {
      // Delete from Shopify metaobject via app endpoint
      // URL-encode the petId since it contains slashes (gid://shopify/Metaobject/...)
      const encodedPetId = encodeURIComponent(petId);
      const response = await fetch(`https://pet-profile-app.vercel.app/apps/pet-profile/delete/${encodedPetId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Pet deleted from Shopify metaobject:', petId);

        // Also remove from localStorage cache
        this.deletePetFromLocalStorage(petId);

        // Remove from local array and re-render
        this.pets = this.pets.filter(p => String(p.id) !== String(petId));
        this.renderPets();

        this.showDeleteSuccess(petName);
        return;
      } else {
        throw new Error('API endpoint not available');
      }
    } catch (error) {
      console.warn('⚠️ API endpoint not available, deleting from localStorage only');
      console.warn('⚠️ This pet may still exist in Shopify metaobjects');

      // Fallback: delete from localStorage only
      this.deletePetFromLocalStorage(petId);

      // Remove from local array and re-render
      this.pets = this.pets.filter(p => String(p.id) !== String(petId));
      this.renderPets();

      this.showDeleteSuccess(petName);
    }
  }

  /**
   * Delete pet from localStorage cache
   * @param {string} petId
   */
  deletePetFromLocalStorage(petId) {
    const pets = JSON.parse(localStorage.getItem('customer_pets') || '[]');
    const filteredPets = pets.filter(p => String(p.id) !== String(petId));
    localStorage.setItem('customer_pets', JSON.stringify(filteredPets));
    console.log('💾 Removed pet from localStorage cache');
  }

  /**
   * Show delete success message
   * @param {string} petName
   */
  showDeleteSuccess(petName) {
    // Create a temporary success message
    const message = document.createElement('div');
    message.className = 'pet-list__success-toast';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #d4edda;
      color: #155724;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      animation: slideIn 0.3s ease;
    `;
    message.textContent = `${petName}'s profile deleted successfully`;
    document.body.appendChild(message);

    setTimeout(() => {
      message.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }
}

customElements.define('pet-list', PetList);
