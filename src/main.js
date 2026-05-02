import './style.css';
import { auth, provider, db } from './firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

const appDiv = document.getElementById('app');
let currentUser = null;
let unsubscribeSnapshot = null;

// ==========================================
// RENDERERS
// ==========================================

function renderLoading() {
  appDiv.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
      <div class="loader"></div>
    </div>
  `;
}

function renderLogin() {
  appDiv.innerHTML = `
    <div class="auth-container">
      <div>
        <h2>Welcome to <span>EngStudy</span></h2>
        <p>나만의 영단어장을 만들고 어디서든 학습하세요.</p>
      </div>
      <button id="loginBtn" class="btn-primary" style="font-size: 1.1rem; padding: 0.8rem 2rem;">
        Sign in with Google
      </button>
    </div>
  `;

  document.getElementById('loginBtn').addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("로그인에 실패했습니다.");
    }
  });
}

function renderApp() {
  appDiv.innerHTML = `
    <header>
      <h1>EngStudy</h1>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="color: var(--text-muted); font-size: 0.9rem;">${currentUser.displayName}님</span>
        <button id="logoutBtn" class="btn-outline">Logout</button>
      </div>
    </header>
    
    <main>
      <div class="glass-panel word-form">
        <div class="input-group">
          <label for="wordEn">English Word</label>
          <input type="text" id="wordEn" placeholder="e.g. apple" autocomplete="off" />
        </div>
        <div class="input-group">
          <label for="wordKo">Meaning</label>
          <input type="text" id="wordKo" placeholder="e.g. 사과" autocomplete="off" />
        </div>
        <button id="addWordBtn" class="btn-primary" style="height: 42px; margin-top: auto;">Add Word</button>
      </div>
      
      <div id="wordsList" class="words-list">
        <div class="loader"></div>
      </div>
    </main>
  `;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth);
  });

  const addBtn = document.getElementById('addWordBtn');
  const enInput = document.getElementById('wordEn');
  const koInput = document.getElementById('wordKo');

  const addWord = async () => {
    const en = enInput.value.trim();
    const ko = koInput.value.trim();
    if (!en || !ko) return;
    
    addBtn.disabled = true;
    addBtn.innerText = 'Adding...';
    
    try {
      const wordsRef = collection(db, 'users', currentUser.uid, 'words');
      await addDoc(wordsRef, {
        word: en,
        meaning: ko,
        createdAt: serverTimestamp()
      });
      enInput.value = '';
      koInput.value = '';
      enInput.focus();
    } catch (error) {
      console.error("Error adding word:", error);
      alert("단어 추가 실패!");
    } finally {
      addBtn.disabled = false;
      addBtn.innerText = 'Add Word';
    }
  };

  addBtn.addEventListener('click', addWord);
  enInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') koInput.focus(); });
  koInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') addWord(); });
  
  loadWords();
}

// ==========================================
// LOGIC
// ==========================================

function loadWords() {
  const wordsListDiv = document.getElementById('wordsList');
  if (!currentUser) return;
  
  const wordsRef = collection(db, 'users', currentUser.uid, 'words');
  const q = query(wordsRef, orderBy('createdAt', 'desc'));
  
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  
  unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
    wordsListDiv.innerHTML = '';
    
    if (snapshot.empty) {
      wordsListDiv.innerHTML = '<div class="empty-state">등록된 단어가 없습니다. 첫 단어를 추가해보세요!</div>';
      return;
    }
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      
      const el = document.createElement('div');
      el.className = 'word-item';
      el.dataset.id = id;
      
      el.innerHTML = `
        <div class="word-content">
          <div class="word-en">${escapeHtml(data.word)}</div>
          <div class="word-ko">${escapeHtml(data.meaning)}</div>
        </div>
        <div class="word-actions">
          <button class="btn-outline edit-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Edit</button>
          <button class="btn-danger del-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Del</button>
        </div>
      `;
      
      // Delete Action
      el.querySelector('.del-btn').addEventListener('click', async () => {
        if (confirm('이 단어를 삭제하시겠습니까?')) {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'words', id));
        }
      });
      
      // Edit Action (Simple prompt for now, can be improved)
      el.querySelector('.edit-btn').addEventListener('click', async () => {
        const newEn = prompt('새로운 영단어를 입력하세요', data.word);
        if (newEn === null) return;
        const newKo = prompt('새로운 뜻을 입력하세요', data.meaning);
        if (newKo === null) return;
        
        if (newEn.trim() && newKo.trim()) {
          await updateDoc(doc(db, 'users', currentUser.uid, 'words', id), {
            word: newEn.trim(),
            meaning: newKo.trim()
          });
        }
      });
      
      wordsListDiv.appendChild(el);
    });
  }, (err) => {
    console.error("Snapshot error:", err);
    wordsListDiv.innerHTML = '<div class="empty-state" style="color:var(--danger-color)">데이터를 불러오지 못했습니다.</div>';
  });
}

// Utility to prevent XSS
function escapeHtml(unsafe) {
    return (unsafe || "").replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// ==========================================
// INIT
// ==========================================

renderLoading();

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    renderApp();
  } else {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
    renderLogin();
  }
});
