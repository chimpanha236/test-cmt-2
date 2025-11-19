// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD_tEDufGFMQRbnV34gkk5w2pEY7Eqysyk",
    authDomain: "test-cmt-2.firebaseapp.com",
    projectId: "test-cmt-2",
    storageBucket: "test-cmt-2.firebasestorage.app",
    messagingSenderId: "586264056540",
    appId: "1:586264056540:web:33a752e8f5aee76d255a19",
    measurementId: "G-GHEG5ZR4FY"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Rate limiting to prevent spam
let lastSubmissionTime = 0;
const SUBMISSION_COOLDOWN = 10000; // 10 seconds between submissions

// ===== មុខងារជួយ =====

// ពិនិត្យ rate limiting
function canSubmit() {
    const now = Date.now();
    if (now - lastSubmissionTime < SUBMISSION_COOLDOWN) {
        const remainingTime = Math.ceil((SUBMISSION_COOLDOWN - (now - lastSubmissionTime)) / 1000);
        showError(`សូមរង់ចាំ ${remainingTime} វិនាទីមុនពេលផ្ញើសារថ្មី`);
        return false;
    }
    return true;
}

// បង្ហាញព័ត៌មាន Debug
function showDebugInfo(message) {
    console.log('DEBUG:', message);
    const debugInfo = document.getElementById('debugInfo');
    const debugContent = document.getElementById('debugContent');
    if (debugContent) {
        debugContent.textContent = message;
        debugInfo.style.display = 'block';
    }
}

// បង្ហាញសារបរាជ័យ
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = '❌ ' + message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
}

// បង្ហាញសារជោគជ័យ
function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.style.display = 'block';
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    }
}

// ការពារ HTML និងពិនិត្យ input
function sanitizeInput(input, maxLength = 500) {
    if (!input) return '';
    
    // Trim and limit length
    let sanitized = input.trim().substring(0, maxLength);
    
    // Escape HTML
    sanitized = sanitized
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    
    return sanitized;
}

// បន្ថែម emoji
function addEmoji(emoji) {
    const textarea = document.getElementById('comment');
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + emoji + text.substring(end);
        
        textarea.value = newText;
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    }
}

// ===== មុខងារ Firebase =====

// បន្ថែមសារថ្មី
async function addCommentToFirebase(name, email, comment) {
    try {
        showDebugInfo('កំពុងបន្ថែមសារទៅកាន់ Firebase...');
        
        // Validate inputs
        if (name.length < 2 || name.length > 50) {
            throw new Error('ឈ្មោះត្រូវតែមានចន្លោះពី ២ ទៅ ៥០ តួអក្សរ');
        }
        
        if (comment.length < 5 || comment.length > 500) {
            throw new Error('សារត្រូវតែមានចន្លោះពី ៥ ទៅ ៥០០ តួអក្សរ');
        }
        
        await db.collection("weddingComments").add({
            name: sanitizeInput(name, 50),
            email: sanitizeInput(email, 100),
            comment: sanitizeInput(comment, 500),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        lastSubmissionTime = Date.now();
        showDebugInfo('សារត្រូវបានបន្ថែមដោយជោគជ័យ!');
        return true;
    } catch (error) {
        showDebugInfo('កំហុសក្នុងការបន្ថែមសារ: ' + error.message);
        console.error('Error details:', error);
        showError('មិនអាចផ្ញើសារបាន: ' + error.message);
        return false;
    }
}

// ទាញយកសារពី Firebase
async function loadCommentsFromFirebase() {
    try {
        showDebugInfo('កំពុងផ្ទុកសារពី Firebase...');
        
        const querySnapshot = await db.collection("weddingComments")
            .orderBy("timestamp", "desc")
            .limit(50)
            .get();
        
        const loadingMessage = document.getElementById('loadingMessage');
        const noComments = document.getElementById('noComments');
        
        if (loadingMessage) loadingMessage.style.display = 'none';
        
        // សំអាតសារចាស់
        const oldComments = document.querySelectorAll('.comment-item');
        oldComments.forEach(comment => comment.remove());
        
        if (querySnapshot.empty) {
            if (noComments) {
                noComments.style.display = 'block';
            }
            showDebugInfo('មិនមានសារណាមួយនៅក្នុង database');
            return;
        }
        
        if (noComments) noComments.style.display = 'none';
        showDebugInfo('រកឃើញ ' + querySnapshot.size + ' សារ');
        
        // ✅ កែត្រង់នេះ៖ បង្ហាញសារថ្មីនៅលើគេបង្អស់
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            displayComment({
                id: doc.id,
                name: data.name,
                email: data.email,
                comment: data.comment,
                date: data.timestamp?.toDate() || new Date()
            });
        });
        
    } catch (error) {
        showDebugInfo('កំហុសក្នុងការផ្ទុកសារ: ' + error.message);
        console.error('Error details:', error);
        
        const loadingMessage = document.getElementById('loadingMessage');
        const noComments = document.getElementById('noComments');
        
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (noComments) {
            noComments.textContent = 'មានបញ្ហាក្នុងការផ្ទុកសារជូនពរ: ' + error.message;
            noComments.style.display = 'block';
        }
        
        showError('មិនអាចផ្ទុកសារបាន: ' + error.message);
    }
}

// បង្ហាញសារនៅលើវេបសាយ
function displayComment(commentData) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;
    
    const commentItem = document.createElement('div');
    commentItem.className = 'comment-item';
    commentItem.id = commentData.id;
    
    const dateString = commentData.date.toLocaleDateString('km-KH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    commentItem.innerHTML = `
        <div class="comment-header">
            <strong>${commentData.name}</strong>
            <span class="comment-date">${dateString}</span>
        </div>
        <p class="comment-content">${commentData.comment}</p>
        ${commentData.email ? `<div class="comment-email">អ៊ីមែល: ${commentData.email}</div>` : ''}
        <div class="comment-actions">
            <button class="delete-btn" onclick="deleteComment('${commentData.id}')">លុប</button>
        </div>
    `;
    
    // ✅ កែត្រង់នេះ៖ បន្ថែមសារថ្មីនៅលើគេបង្អស់ (ក្រោមចំណងជើង)
    const commentsTitle = commentsList.querySelector('h3');
    commentsList.insertBefore(commentItem, commentsTitle.nextSibling);
}

// លុបសារ
async function deleteComment(commentId) {
    if (confirm('តើអ្នកពិតជាចង់លុបសារជូនពរនេះមែនទេ?')) {
        try {
            await db.collection("weddingComments").doc(commentId).delete();
            const commentElement = document.getElementById(commentId);
            if (commentElement) {
                commentElement.remove();
            }
            
            // ពិនិត្យមើលបើគ្មានសារទៀតទេ
            const comments = document.querySelectorAll('.comment-item');
            const noComments = document.getElementById('noComments');
            if (comments.length === 0 && noComments) {
                noComments.style.display = 'block';
            }
            
            showDebugInfo('សារត្រូវបានលុបដោយជោគជ័យ');
        } catch (error) {
            showDebugInfo('កំហុសក្នុងការលុបសារ: ' + error.message);
            showError('មិនអាចលុបសារបាន - ត្រូវការការអនុញ្ញាត');
        }
    }
}

// ===== ចាប់ផ្ដើម =====
document.addEventListener('DOMContentLoaded', async function() {
    showDebugInfo('កំពុងចាប់ផ្ដើម...');
    
    const commentForm = document.getElementById('commentForm');
    if (!commentForm) {
        showError('មិនអាចរកទម្រង់សារបាន');
        return;
    }

    // តេស្តការភ្ជាប់ Firebase
    try {
        showDebugInfo('កំពុងតេស្តការភ្ជាប់ Firebase...');
        const testQuery = await db.collection("weddingComments").limit(1).get();
        showDebugInfo('Firebase ភ្ជាប់បានជោគជ័យ! រកឃើញ ' + testQuery.size + ' សារ');
    } catch (error) {
        showDebugInfo('បរាជ័យក្នុងការភ្ជាប់ Firebase: ' + error.message);
        showError('មិនអាចភ្ជាប់ទៅកាន់ database បាន: ' + error.message);
        return;
    }

    // ផ្ទុកសារ
    await loadCommentsFromFirebase();

    // ការដាក់ស្នើទម្រង់
    commentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!canSubmit()) {
            return;
        }
        
        const name = document.getElementById('name')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const comment = document.getElementById('comment')?.value.trim();
        
        if (name && comment) {
            const submitBtn = commentForm.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'កំពុងផ្ញើ...';
            }
            
            showDebugInfo('កំពុងផ្ញើសារ: ' + name);
            
            try {
                const success = await addCommentToFirebase(name, email, comment);
                
                if (success) {
                    commentForm.reset();
                    showSuccessMessage();
                    showDebugInfo('សារបានផ្ញើដោយជោគជ័យ!');
                    
                    // ✅ កែត្រង់នេះ៖ បន្ថែមសារថ្មីភ្លាមៗ មិនចាំបើក loadCommentsFromFirebase()
                    const newCommentData = {
                        id: 'temp_' + Date.now(),
                        name: name,
                        email: email,
                        comment: comment,
                        date: new Date()
                    };
                    displayComment(newCommentData);
                    
                    // លាក់សារ "គ្មានសារ" បើមាន
                    const noComments = document.getElementById('noComments');
                    if (noComments) {
                        noComments.style.display = 'none';
                    }
                }
            } catch (error) {
                showDebugInfo('កំហុសក្នុងការផ្ញើសារ: ' + error.message);
                showError('កំហុស: ' + error.message);
            }
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '📨 ផ្ញើសារជូនពរ';
            }
        } else {
            showError('សូមបំពេញឈ្មោះ និងសារជូនពរ!');
        }
    });
});