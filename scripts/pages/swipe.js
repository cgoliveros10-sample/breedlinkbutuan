:root {
  --green-primary: #2e6b4e;
  --green-secondary: #3c8d63;
  --green-light: rgba(46, 107, 78, 0.2);
  --like: #4caf50;
  --like-light: rgba(76, 175, 80, 0.15);
  --pass: #ff6b6b;
  --pass-light: rgba(255, 107, 107, 0.15);
  --superlike: #ff8c00;
  --superlike-light: rgba(255, 140, 0, 0.15);
  --text-primary: #1f2937;
  --text-secondary: #4b5563;
  --text-muted: #9ca3af;
  --bg-primary: #f9fafb;
  --bg-secondary: #f3f4f6;
  --surface-white: #ffffff;
  --border-light: #e5e7eb;
  --shadow: rgba(0, 0, 0, 0.08);
  --shadow-hover: rgba(0, 0, 0, 0.15);
  --transition-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --transition-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.swipe-layout {
  display: flex;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 100px 30px 40px;
}

.swipe-left {
  flex: 1.5;
  min-width: 0;
}

.swipe-right {
  flex: 1;
  min-width: 320px;
  position: sticky;
  top: 100px;
  height: fit-content;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: clamp(1.5rem, 5vw, 2rem);
  font-weight: 800;
  background: linear-gradient(135deg, var(--green-primary), var(--green-secondary));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}

.page-header p {
  color: var(--text-secondary);
  font-size: 14px;
}

.filter-section {
  margin-bottom: 25px;
}

.filter-toggle {
  width: 100%;
  padding: 14px 20px;
  background: var(--surface-white);
  border: 2px solid var(--border-light);
  border-radius: 16px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s var(--transition-smooth);
  box-shadow: 0 4px 15px var(--shadow);
}

.filter-toggle:hover {
  border-color: var(--green-primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px var(--shadow-hover);
}

.filter-toggle.active {
  background: var(--green-primary);
  color: white;
  border-color: var(--green-primary);
}

.filter-panel {
  display: none;
  background: var(--surface-white);
  border-radius: 20px;
  padding: 25px;
  margin-top: 15px;
  box-shadow: 0 10px 40px var(--shadow-hover);
  border: 1px solid var(--border-light);
}

.filter-panel.active {
  display: block;
  animation: slideDown 0.3s var(--transition-smooth);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.filter-group {
  margin-bottom: 20px;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-group select {
  width: 100%;
  padding: 14px 18px;
  border-radius: 14px;
  border: 2px solid var(--border-light);
  background: var(--bg-primary);
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%232C3E50' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 15px center;
}

.filter-group select:focus {
  border-color: var(--green-primary);
  box-shadow: 0 0 0 4px var(--green-light);
}

.swipe-container {
  position: relative;
  height: 520px;
  min-height: 300px;
  margin-bottom: 25px;
  perspective: 1000px;
  overflow: hidden;
}

.card-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.breed-card {
  position: absolute;
  width: 100%;
  height: 100%;
  background: var(--surface-white);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 15px 50px var(--shadow-hover);
  cursor: grab;
  user-select: none;
  will-change: transform;
  border: 1px solid var(--border-light);
}

.breed-card:active {
  cursor: grabbing;
}

.breed-card:nth-last-child(1) { z-index: 3; }
.breed-card:nth-last-child(2) { z-index: 2; transform: scale(0.95) translateY(10px); opacity: 0.8; }
.breed-card:nth-last-child(3) { z-index: 1; transform: scale(0.9) translateY(20px); opacity: 0.6; }

.info-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  border: none;
  font-size: 20px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-btn:hover {
  background: var(--green-primary);
  color: white;
  transform: scale(1.1);
}

.card-image {
  width: 100%;
  height: 65%;
  object-fit: cover;
  pointer-events: none;
  transition: transform 0.3s;
}

.breed-card:hover .card-image {
  transform: scale(1.05);
}

.card-content {
  padding: 20px;
  background: var(--surface-white);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.card-badge {
  background: linear-gradient(135deg, var(--green-primary), var(--green-secondary));
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-meta {
  display: flex;
  gap: 15px;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.card-stats {
  display: flex;
  gap: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border-light);
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.stat strong {
  color: var(--green-primary);
  font-weight: 700;
}

.swipe-indicator {
  position: absolute;
  top: 50px;
  padding: 15px 30px;
  border-radius: 16px;
  font-size: 24px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 3px;
  opacity: 0;
  transition: all 0.2s var(--transition-bounce);
  pointer-events: none;
  z-index: 100;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  transform: scale(0.8);
}

.swipe-indicator.like {
  right: 20px;
  color: white;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(56, 142, 60, 0.9));
  border: 4px solid white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  transform: rotate(15deg) scale(0.8);
}

.swipe-indicator.like.active {
  opacity: 1;
  transform: rotate(15deg) scale(1);
}

.swipe-indicator.nope {
  left: 20px;
  color: white;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.9), rgba(211, 47, 47, 0.9));
  border: 4px solid white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  transform: rotate(-15deg) scale(0.8);
}

.swipe-indicator.nope.active {
  opacity: 1;
  transform: rotate(-15deg) scale(1);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 25px;
}

.action-btn {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s var(--transition-bounce);
  box-shadow: 0 8px 25px var(--shadow);
  background: white;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.action-btn:hover::before {
  opacity: 1;
}

.action-btn:hover {
  transform: scale(1.2);
  box-shadow: 0 15px 40px var(--shadow-hover);
}

.action-btn:active {
  transform: scale(0.9);
}

.action-btn.nope {
  color: var(--pass);
  border: 4px solid var(--pass);
  background: linear-gradient(135deg, white, var(--pass-light));
}

.action-btn.nope:hover {
  background: var(--pass);
  color: white;
  box-shadow: 0 15px 40px rgba(255, 107, 107, 0.4);
}

.action-btn.like {
  color: var(--like);
  border: 4px solid var(--like);
  width: 70px;
  height: 70px;
  font-size: 32px;
  background: linear-gradient(135deg, white, var(--like-light));
}

.action-btn.like:hover {
  background: var(--like);
  color: white;
  box-shadow: 0 15px 40px rgba(76, 175, 80, 0.4);
  animation: heartbeat 0.5s ease-in-out;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1.2); }
  25% { transform: scale(1.3); }
  50% { transform: scale(1.1); }
  75% { transform: scale(1.25); }
}

.instructions {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 20px;
  padding: 18px;
  background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(232, 243, 238, 0.5));
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-light);
}

.pet-details-panel {
  background: var(--surface-white);
  border-radius: 24px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 0 10px 40px var(--shadow);
  border: 1px solid var(--border-light);
  position: relative;
  display: none;
}

.pet-details-panel.active {
  display: block;
}

.close-details {
  position: absolute;
  top: 15px;
  right: 15px;
  background: var(--bg-secondary);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.close-details:hover {
  background: var(--pass);
  color: white;
}

.pet-details-header {
  text-align: center;
  margin-bottom: 25px;
  margin-top: 10px;
}

.pet-details-img {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  object-fit: cover;
  object-position: center;
  border: 3px solid var(--green-primary);
  margin-bottom: 15px;
  display: block;
}

.pet-details-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.pet-details-breed {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 5px;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--green-primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.detail-value {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.documents-btn, .message-owner-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 15px;
  transition: all 0.3s;
}

.documents-btn {
  background: linear-gradient(135deg, var(--green-primary), var(--green-secondary));
  color: white;
  border: none;
}

.message-owner-btn {
  background: var(--superlike-light);
  color: var(--superlike);
  border: 2px solid var(--superlike);
}

.documents-btn:hover, .message-owner-btn:hover {
  transform: translateY(-2px);
}

.matches-section {
  background: var(--surface-white);
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 10px 40px var(--shadow);
  border: 1px solid var(--border-light);
}

.matches-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.matches-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-count {
  background: linear-gradient(135deg, var(--green-primary), var(--green-secondary));
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
}

.matches-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--green-primary) transparent;
}

.matches-list::-webkit-scrollbar {
  width: 4px;
}

.matches-list::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}

.matches-list::-webkit-scrollbar-thumb {
  background: var(--green-primary);
  border-radius: 3px;
}

.match-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  transition: all 0.2s ease;
}

.match-item:hover {
  background: var(--green-light);
  border-color: var(--green-primary);
  transform: none;
}

.match-item img {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  object-fit: cover;
  border: 2px solid var(--green-primary);
  flex-shrink: 0;
  transition: all 0.2s;
  background: white;
}

.match-item:hover img {
  transform: none;
  box-shadow: none;
  border-color: var(--green-primary);
}

.match-item span {
  font-size: 13px;
  color: var(--text-secondary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}

.match-item:hover span {
  color: var(--green-primary);
}

.match-btn-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
  flex-shrink: 0;
}

.match-message-btn {
  width: 100px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  transition: all 0.18s ease;
  white-space: nowrap;
  box-sizing: border-box;
  font-family: inherit;
}

/* Details — green tint */
.match-message-btn.btn-details {
  background: #edf7f1;
  color: var(--green-primary, #2e6b4e);
  border-color: #b6dfc8;
}
.match-message-btn.btn-details:hover {
  background: #d4f0e1;
  border-color: var(--green-primary, #2e6b4e);
}

/* Message — neutral */
.match-message-btn.btn-message {
  background: #f4f6f8;
  color: #374151;
  border-color: #d1d5db;
}
.match-message-btn.btn-message:hover {
  background: #e8edf2;
  border-color: #9ca3af;
}

/* See Profile — blue tint */
.match-message-btn.btn-profile {
  background: #eef2ff;
  color: #4f6fc8;
  border-color: #c7d2f5;
}
.match-message-btn.btn-profile:hover {
  background: #dde4fb;
  border-color: #4f6fc8;
}

/* Pass — amber tint */
.match-message-btn.btn-pass {
  background: #fffbeb;
  color: #b45309;
  border-color: #fcd34d;
}
.match-message-btn.btn-pass:hover {
  background: #fef3c7;
  border-color: #b45309;
}

/* Like — green tint (same family as Details) */
.match-message-btn.btn-like {
  background: #edf7f1;
  color: var(--green-primary, #2e6b4e);
  border-color: #b6dfc8;
}
.match-message-btn.btn-like:hover {
  background: #d4f0e1;
  border-color: var(--green-primary, #2e6b4e);
}

.empty-matches {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 20px;
  width: 100%;
}

.empty-state {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  background: var(--surface-white);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 15px 50px var(--shadow-hover);
  animation: scaleIn 0.5s var(--transition-bounce);
  z-index: 10;
  box-sizing: border-box;
}

.empty-state.active {
  display: flex;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.empty-state h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 25px;
  max-width: 280px;
}

.empty-btn {
  padding: 14px 28px;
  border-radius: 50px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s var(--transition-smooth);
  margin: 5px;
}

.empty-btn.primary {
  background: linear-gradient(135deg, var(--green-primary), var(--green-secondary));
  color: white;
  box-shadow: 0 8px 25px rgba(46, 107, 78, 0.3);
}

.empty-btn.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(46, 107, 78, 0.4);
}

.empty-btn.secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.empty-btn.secondary:hover {
  background: var(--border-light);
}

.document-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(5px);
  z-index: 2000;
  align-items: center;
  justify-content: center;
}

.document-modal.active {
  display: flex;
}

.document-content {
  background: white;
  border-radius: 24px;
  padding: 30px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: var(--bg-secondary);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--pass);
  color: white;
}

.document-content h3 {
  margin-bottom: 20px;
  color: var(--text-primary);
  font-size: 1.25rem;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.document-item {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.document-item:hover {
  border-color: var(--green-primary);
  transform: translateY(-5px);
}

.document-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.document-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 5px;
}

.document-date {
  font-size: 11px;
  color: var(--text-muted);
}

.match-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(5px);
  z-index: 2000;
  display: none;
  align-items: center;
  justify-content: center;
}

.match-overlay.active {
  display: flex;
}

.match-modal {
  background: white;
  border-radius: 30px;
  padding: 40px;
  text-align: center;
  max-width: 380px;
  animation: matchPop 0.6s var(--transition-bounce);
  box-shadow: 0 25px 60px rgba(0,0,0,0.3);
  position: relative;
  overflow: hidden;
}

.match-modal::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, var(--like-light) 0%, transparent 70%);
  opacity: 0.5;
  animation: rotate 20s linear infinite;
  pointer-events: none;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes matchPop {
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  50% { transform: scale(1.1) rotate(5deg); }
  70% { transform: scale(0.95) rotate(-3deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.match-modal h2 {
  font-size: 1.75rem;
  background: linear-gradient(135deg, var(--like), var(--superlike));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 25px;
  position: relative;
  z-index: 1;
}

.match-images {
  display: flex;
  justify-content: center;
  gap: 25px;
  margin-bottom: 25px;
  position: relative;
  z-index: 1;
}

.match-images img {
  width: 110px;
  height: 110px;
  border-radius: 18px;
  object-fit: cover;
  object-position: center;
  border: 5px solid white;
  box-shadow: 0 10px 30px var(--shadow);
  animation: matchImagePop 0.5s var(--transition-bounce) 0.3s both;
}

.match-images img:last-child {
  animation-delay: 0.5s;
}

@keyframes matchImagePop {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.match-modal p {
  position: relative;
  z-index: 1;
}

@media (max-width: 900px) {
  .swipe-layout {
    flex-direction: column;
    padding: 90px 20px 40px;
  }
  
  .swipe-right {
    position: static;
    margin-top: 20px;
  }
  
  .swipe-container {
    height: 480px;
  }
  
  .action-btn {
    width: 60px;
    height: 60px;
    font-size: 28px;
  }
  
  .action-btn.like {
    width: 75px;
    height: 75px;
    font-size: 32px;
  }
  
  .match-images img {
    width: 80px;
    height: 80px;
  }
  
  .documents-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .swipe-container {
    height: 450px;
  }
  
  .card-name {
    font-size: 1rem;
  }
  
  .card-meta {
    font-size: 12px;
    gap: 10px;
  }
  
  .card-stats {
    gap: 15px;
  }
  
  .pet-details-img {
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: 12px;
  }
  
  .pet-details-name {
    font-size: 1.125rem;
  }
  
  .match-item {
    padding: 8px 10px;
  }
  
  .match-item img {
    width: 44px;
    height: 44px;
    border-radius: 10px;
  }
  
  .swipe-indicator {
    font-size: 18px;
    padding: 10px 20px;
  }
}

.messenger-empty p {
  margin: 0;
}
/* Breeder tabs active state */
#tabLiked.active, #tabPassed.active {
    background: var(--green-primary) !important;
    color: white !important;
}
#tabLiked:not(.active) {
    background: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
}
#tabPassed.active {
    background: #d64242 !important;
    color: white !important;
}
/* match-item layout already set above */

/* ══════════════════════════════════════════════════════
   OWNER PROFILE PANEL
   ══════════════════════════════════════════════════════ */
#ownerProfileModal {
    display: none;
    animation: opFadeIn .2s ease;
}
#ownerProfileModal.active { display: flex; }

@keyframes opFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}

#ownerProfileModal > div {
    animation: opSlideUp .25s cubic-bezier(.32,.72,0,1);
}
@keyframes opSlideUp {
    from { transform: translateY(24px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
}

/* Scrollbar inside the panel */
#ownerProfileModal::-webkit-scrollbar { width: 5px; }
#ownerProfileModal::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }

/* Tab buttons hover */
#opTabs button:hover { opacity: .85; }

/* Post images rounded */
#opTabContent img { border-radius: 10px; }

/* ── Responsive: owner profile modal card ── */
@media (max-width: 480px) {
  #ownerProfileModal > div {
    border-radius: 18px !important;
    width: 96% !important;
  }
  /* Tighten action button row */
  #ownerProfileModal #opFollowBtn,
  #ownerProfileModal #opRateBtn,
  #ownerProfileModal #opMsgBtn {
    font-size: 10px !important;
    padding: 6px 8px !important;
  }
  /* Stat boxes: 2-column grid on small screens */
  #ownerProfileModal [data-tab] {
    flex: 1 1 calc(50% - 4px) !important;
    max-width: calc(50% - 4px) !important;
  }
}

@media (max-width: 360px) {
  #ownerProfileModal > div {
    border-radius: 14px !important;
    width: 98% !important;
  }
  #ownerProfileModal .bp-tabs button,
  #ownerProfileModal [data-tab="posts"],
  #ownerProfileModal [data-tab="animals"],
  #ownerProfileModal [data-tab="followers"],
  #ownerProfileModal [data-tab="following"],
  #ownerProfileModal [data-tab="reviews"] {
    font-size: 9.5px !important;
    padding: 7px 3px !important;
  }
}

/* Extra small devices */
@media (max-width: 360px) {
  .swipe-layout {
    padding: 80px 12px 30px;
  }
  .swipe-container {
    height: 400px;
  }
  .action-btn {
    width: 52px;
    height: 52px;
    font-size: 24px;
  }
  .action-btn.like {
    width: 65px;
    height: 65px;
    font-size: 28px;
  }
  .card-name { font-size: 0.9rem; }
  .filter-toggle { padding: 12px 16px; font-size: 13px; }
}

/* Touch-friendly swipe action buttons */
@media (hover: none) and (pointer: coarse) {
  .action-btn:hover { transform: none; }
  .action-btn:hover::before { opacity: 0; }
}

/* Fix swipe-right min-width on very small screens */
@media (max-width: 380px) {
  .swipe-right {
    min-width: 0;
    width: 100%;
  }
  .swipe-layout {
    padding: 80px 10px 30px;
  }
}

/* Tighten action-buttons gap on tiny screens */
@media (max-width: 360px) {
  .action-buttons { gap: 16px; }
}
