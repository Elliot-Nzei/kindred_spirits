document.addEventListener('DOMContentLoaded', () => {
    const sectionModal = document.getElementById('sectionModal');
    const sectionModalTitle = document.getElementById('sectionModalTitle');
    const sectionModalBody = document.getElementById('sectionModalBody');
    const sectionModalClose = document.getElementById('sectionModalClose');

    document.querySelectorAll('.open-section-modal').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = event.currentTarget.dataset.sectionTarget;
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                // Get the title from the h3 within the target section
                const titleElement = targetSection.querySelector('h3');
                sectionModalTitle.textContent = titleElement ? titleElement.textContent : 'Section Details';

                // Clone the content of the target section and append it to the modal body
                // We clone to avoid removing the content from its original place
                const clonedContent = targetSection.cloneNode(true);
                
                // Remove the ID from the cloned content to avoid duplicate IDs
                clonedContent.id = ''; 
                
                // Optionally, remove any search/filter forms from the cloned content if they are not needed in the modal
                const forms = clonedContent.querySelectorAll('form, .relative, select');
                forms.forEach(form => form.remove());

                sectionModalBody.innerHTML = ''; // Clear previous content
                sectionModalBody.appendChild(clonedContent);
                sectionModal.classList.remove('hidden');
            }
        });
    });

    // Close modal when clicking on the close button or outside the modal
    sectionModalClose.addEventListener('click', () => {
        sectionModal.classList.add('hidden');
    });

    sectionModal.addEventListener('click', (event) => {
        if (event.target === sectionModal) {
            sectionModal.classList.add('hidden');
        }
    });
});