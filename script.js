// Global variables
let clipboardHistory = [];
let currentFilter = 'all';

// DOM Elements
const textInput = document.getElementById('textInput');
const imageInput = document.getElementById("imageInput");
const preview = document.getElementById('preview');
const savedContent = document.getElementById('savedContent');
const filterSelect = document.getElementById('filterType');
const charCount = document.querySelector('.char-count');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Character count for textarea
    textInput.addEventListener('input', updateCharCount);
    
    // Filter change handler
    filterSelect.addEventListener('change', function() {
        currentFilter = this.value;
        filterSavedContent();
    });
    
    // Load saved content
    loadSaved();
    
    // Initialize clipboard permission
    requestClipboardPermission();
}

// Clipboard Functions
async function requestClipboardPermission() {
    try {
        const permission = await navigator.permissions.query({ name: 'clipboard-read' });
        if (permission.state === 'denied') {
            showToast('Vui lòng cấp quyền truy cập clipboard để sử dụng tính năng này', 'warning');
        }
    } catch (error) {
        console.log('Clipboard permission API not supported');
    }
}

async function getClipboard() {
    const preview = document.getElementById("preview");
    const textInput = document.getElementById("textInput");
    const imageInput = document.getElementById("imageInput");

    try {
        const items = await navigator.clipboard.read();
        let found = false;
        let hasText = false;
        let hasImage = false;

        for (const item of items) {
            if (item.types.includes('image/png') || item.types.includes('image/jpeg') || item.types.includes('image/gif')) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                const blob = await item.getType(imageType);
                const reader = new FileReader();
                reader.onload = () => {
                    preview.innerHTML = `
                        <div class="preview-item">
                            <img src="${reader.result}" alt="Clipboard Image" />
                            <div class="preview-info">
                                <span class="preview-type">Hình ảnh</span>
                                <span class="preview-size">${formatFileSize(blob.size)}</span>
                            </div>
                        </div>
                    `;
                    imageInput.value = reader.result;
                };
                reader.readAsDataURL(blob);
                found = true;
                hasImage = true;
            } else if (item.types.includes('text/plain')) {
                const blob = await item.getType('text/plain');
                const text = await blob.text();
                
                // Check if content already exists
                if (textInput.value.trim() === text.trim()) {
                    showToast('Nội dung này đã có trong ô nhập liệu!', 'warning');
                    return;
                }
                
                textInput.value = text;
                preview.innerHTML = `
                    <div class="preview-item">
                        <div class="preview-text">${text.length > 100 ? text.substring(0, 100) + '...' : text}</div>
                        <div class="preview-info">
                            <span class="preview-type">Văn bản</span>
                            <span class="preview-size">${text.length} ký tự</span>
                        </div>
                    </div>
                `;
                found = true;
                hasText = true;
            }
        }

        if (found) {
            updateCharCount();
            showToast(`Đã lấy ${hasText ? 'văn bản' : ''}${hasText && hasImage ? ' và ' : ''}${hasImage ? 'hình ảnh' : ''} từ clipboard!`, 'success');
        } else {
            showToast('Clipboard không chứa văn bản hoặc hình ảnh hỗ trợ', 'warning');
        }
    } catch (err) {
        console.error('Clipboard error:', err);
        showToast('Không thể truy cập clipboard. Vui lòng kiểm tra quyền truy cập.', 'error');
    }
}

// Form handling
document.getElementById("saveForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    // Validate input
    const text = formData.get('text').trim();
    const image = formData.get('image');
    
    if (!text && !image) {
        showToast('Vui lòng nhập nội dung hoặc lấy từ clipboard!', 'warning');
        return;
    }
    
    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
    submitBtn.disabled = true;
    
    fetch("save.php", { 
        method: "POST", 
        body: formData 
    })
    .then((res) => {
        if (res.ok) {
            showToast("✅ Ghi chú đã được lưu thành công!", 'success');
            loadSaved();
            this.reset();
            document.getElementById("preview").innerHTML = "";
            updateCharCount();
        } else {
            throw new Error('Network response was not ok');
        }
    })
    .catch((error) => {
        console.error('Save error:', error);
        showToast("❌ Lỗi khi lưu ghi chú. Vui lòng thử lại!", 'error');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
});

// Delete entry
function deleteEntry(filename) {
    if (!confirm("Bạn có chắc muốn xóa ghi chú này?")) return;
    
    fetch("delete.php?file=" + encodeURIComponent(filename))
    .then((res) => {
        if (res.ok) {
            showToast("🗑️ Ghi chú đã được xóa!", 'success');
            loadSaved();
        } else {
            throw new Error('Delete failed');
        }
    })
    .catch((error) => {
        console.error('Delete error:', error);
        showToast("❌ Lỗi khi xóa ghi chú!", 'error');
    });
}

// Copy to clipboard
async function copyToClipboard(content, type) {
    try {
        if (type === 'text') {
            await navigator.clipboard.writeText(content);
            showToast("📋 Đã sao chép văn bản vào clipboard!", 'success');
        } else if (type === 'image') {
            // For images, we need to convert base64 to blob
            const response = await fetch(content);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            showToast("📋 Đã sao chép hình ảnh vào clipboard!", 'success');
        }
    } catch (error) {
        console.error('Copy error:', error);
        showToast("❌ Không thể sao chép vào clipboard!", 'error');
    }
}

// Load saved content
function loadSaved() {
    savedContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';
    
    fetch("view.php")
    .then((res) => res.text())
    .then((html) => {
        if (html.trim()) {
            savedContent.innerHTML = html;
            initializeSavedItems();
        } else {
            savedContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Chưa có ghi chú nào</h3>
                    <p>Tạo ghi chú đầu tiên của bạn bằng cách nhập nội dung hoặc lấy từ clipboard!</p>
                </div>
            `;
        }
    })
    .catch((error) => {
        console.error('Load error:', error);
        savedContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Lỗi tải dữ liệu</h3>
                <p>Không thể tải danh sách ghi chú. Vui lòng thử lại!</p>
            </div>
        `;
    });
}

// Initialize saved items with event listeners
function initializeSavedItems() {
    // Add expand/collapse functionality
    document.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const content = this.previousElementSibling;
            const isExpanded = content.classList.contains('expanded');
            
            if (isExpanded) {
                content.classList.remove('expanded');
                this.textContent = 'Xem thêm';
            } else {
                content.classList.add('expanded');
                this.textContent = 'Thu gọn';
            }
        });
    });
    
    // Add copy functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.saved-item');
            const content = item.querySelector('.saved-item-content');
            const type = item.dataset.type;
            
            if (type === 'text' || type === 'mixed') {
                const textElement = content.querySelector('p');
                if (textElement) {
                    const text = textElement.textContent;
                    copyToClipboard(text, 'text');
                }
            } else if (type === 'image') {
                const img = content.querySelector('img');
                if (img) {
                    copyToClipboard(img.src, 'image');
                }
            }
        });
    });
}

// Filter saved content
function filterSavedContent() {
    const items = document.querySelectorAll('.saved-item');
    
    items.forEach(item => {
        const type = item.dataset.type;
        const shouldShow = currentFilter === 'all' || type === currentFilter;
        
        if (shouldShow) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show empty state if no items match filter
    const visibleItems = document.querySelectorAll('.saved-item[style="display: block"]');
    if (visibleItems.length === 0 && currentFilter !== 'all') {
        savedContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h3>Không có ghi chú ${currentFilter === 'text' ? 'văn bản' : 'hình ảnh'}</h3>
                <p>Thử thay đổi bộ lọc hoặc tạo ghi chú mới!</p>
            </div>
        `;
    }
}

// Modal functions
function openModal(content, type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    if (type === 'text') {
        modalBody.innerHTML = `<p style="white-space: pre-wrap;">${content}</p>`;
    } else if (type === 'image') {
        modalBody.innerHTML = `<img src="${content}" alt="Full size image" style="max-width: 100%; height: auto;" />`;
    }
    
    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
}

// Close modal when clicking outside
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// Utility functions
function updateCharCount() {
    const count = textInput.value.length;
    charCount.textContent = `${count} ký tự`;
    
    // Change color based on length
    if (count > 1000) {
        charCount.style.color = '#dc3545';
    } else if (count > 500) {
        charCount.style.color = '#ffc107';
    } else {
        charCount.style.color = '#6c757d';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+V to paste
    if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        getClipboard();
    }
    
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        document.getElementById('saveForm').dispatchEvent(new Event('submit'));
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Auto-save draft (optional feature)
let autoSaveTimer;
textInput.addEventListener('input', function() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        const text = this.value.trim();
        if (text) {
            localStorage.setItem('clipboard_draft', text);
        }
    }, 2000);
});

// Load draft on page load
window.addEventListener('load', function() {
    const draft = localStorage.getItem('clipboard_draft');
    if (draft && !textInput.value) {
        textInput.value = draft;
        updateCharCount();
    }
});