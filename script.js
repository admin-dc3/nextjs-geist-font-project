// Global variables
let clipboardHistory = [];
let currentFilter = 'all';
let isAdmin = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Lấy các phần tử DOM sau khi DOM đã sẵn sàng
    const textInput = document.getElementById('textInput');
    const imageInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');
    const savedContent = document.getElementById('savedContent');
    const filterSelect = document.getElementById('filterType');
    const charCount = document.querySelector('.char-count');

    // Character count for textarea
    textInput.addEventListener('input', function() {
        updateCharCount(textInput, charCount);
        // Auto-save draft
        clearTimeout(window.autoSaveTimer);
        window.autoSaveTimer = setTimeout(() => {
            const text = textInput.value.trim();
            if (text) {
                localStorage.setItem('clipboard_draft', text);
            }
        }, 2000);
    });

    // Filter change handler
    filterSelect.addEventListener('change', function() {
        currentFilter = this.value;
        filterSavedContent();
    });

    // Form handling
    document.getElementById("saveForm").addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        const text = formData.get('text').trim();
        const image = formData.get('image');
        if (!text && !image) {
            showToast('Vui lòng nhập nội dung hoặc lấy từ clipboard!', 'warning');
            return;
        }
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        submitBtn.disabled = true;
        fetch("save.php", { method: "POST", body: formData })
        .then((res) => {
            if (res.ok) {
                showToast("✅ Ghi chú đã được lưu thành công!", 'success');
                loadSaved();
                this.reset();
                preview.innerHTML = "";
                updateCharCount(textInput, charCount);
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

    // Load draft on page load
    const draft = localStorage.getItem('clipboard_draft');
    if (draft && !textInput.value) {
        textInput.value = draft;
        updateCharCount(textInput, charCount);
    }

    // Load saved content
    loadSaved();
    // Initialize clipboard permission
    requestClipboardPermission();
}

// Kiểm tra trạng thái admin khi load trang
function checkAdminStatus() {
    fetch('session_status.php')
        .then(res => res.json())
        .then(data => {
            isAdmin = data.is_admin;
            toggleAdminUI();
        });
}

function toggleAdminUI() {
    const adminLoginBox = document.getElementById('adminLoginBox');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (isAdmin) {
        adminLoginBox.style.display = 'none';
        document.querySelectorAll('.btn-danger').forEach(btn => btn.style.display = 'inline-flex');
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
        adminLoginBox.style.display = 'block';
        document.querySelectorAll('.btn-danger').forEach(btn => btn.style.display = 'none');
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// Đăng xuất admin
if (document.getElementById('adminLogoutBtn')) {
    document.getElementById('adminLogoutBtn').addEventListener('click', function() {
        fetch('logout.php').then(() => {
            isAdmin = false;
            toggleAdminUI();
            showToast('Đã đăng xuất admin!', 'success');
            loadSaved();
        });
    });
}

// Gửi form đăng nhập admin
if (document.getElementById('adminLoginForm')) {
    document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const user = document.getElementById('adminUser').value.trim();
        const pass = document.getElementById('adminPass').value;
        fetch('login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, pass })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                isAdmin = true;
                toggleAdminUI();
                showToast('Đăng nhập admin thành công!', 'success');
                document.getElementById('adminLoginMsg').textContent = '';
                loadSaved();
            } else {
                document.getElementById('adminLoginMsg').textContent = data.message || 'Sai tài khoản hoặc mật khẩu!';
            }
        })
        .catch(() => {
            document.getElementById('adminLoginMsg').textContent = 'Lỗi kết nối máy chủ!';
        });
    });
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
            const charCount = document.querySelector('.char-count');
            updateCharCount(textInput, charCount);
            showToast(`Đã lấy ${hasText ? 'văn bản' : ''}${hasText && hasImage ? ' và ' : ''}${hasImage ? 'hình ảnh' : ''} từ clipboard!`, 'success');
        } else {
            showToast('Clipboard không chứa văn bản hoặc hình ảnh hỗ trợ', 'warning');
        }
    } catch (err) {
        console.error('Clipboard error:', err);
        showToast('Không thể truy cập clipboard. Vui lòng kiểm tra quyền truy cập.', 'error');
    }
}

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
    const savedContent = document.getElementById('savedContent');
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
        checkAdminStatus();
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
        checkAdminStatus();
    });
}

// Initialize saved items with event listeners
function initializeSavedItems() {
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
    let visibleCount = 0;
    items.forEach(item => {
        const type = item.dataset.type;
        const shouldShow = currentFilter === 'all' || type === currentFilter;
        if (shouldShow) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    // Chỉ hiện empty-state nếu KHÔNG có .saved-item nào phù hợp, nhưng KHÔNG thay đổi innerHTML
    let emptyState = document.getElementById('filterEmptyState');
    if (visibleCount === 0 && currentFilter !== 'all') {
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.id = 'filterEmptyState';
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-filter"></i>
                <h3>Không có ghi chú ${currentFilter === 'text' ? 'văn bản' : 'hình ảnh'}</h3>
                <p>Thử thay đổi bộ lọc hoặc tạo ghi chú mới!</p>
            `;
            document.getElementById('savedContent').appendChild(emptyState);
        }
    } else if (emptyState) {
        emptyState.remove();
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
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// Utility functions
function updateCharCount(textInput, charCount) {
    const count = textInput.value.length;
    charCount.textContent = `${count} ký tự`;
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
    if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        getClipboard();
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        document.getElementById('saveForm').dispatchEvent(new Event('submit'));
    }
    if (e.key === 'Escape') {
        closeModal();
    }
});