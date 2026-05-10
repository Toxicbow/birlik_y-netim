document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let appData = [];
    let currentTabId = null;

    // --- DOM Elements ---
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    
    // Tabs
    const tabsList = document.getElementById('tabs-list');
    const addTabBtn = document.getElementById('add-tab-btn');
    const deleteTabBtn = document.getElementById('delete-tab-btn');
    const currentTabTitle = document.getElementById('current-tab-title');
    
    // Modals
    const newTabModal = document.getElementById('new-tab-modal');
    const tabNameInput = document.getElementById('tab-name-input');
    const confirmTabBtn = document.getElementById('confirm-tab-btn');
    const closeModals = document.querySelectorAll('.close-modal');
    
    // Table
    const tableBody = document.getElementById('table-body');
    const addRowBtn = document.getElementById('add-row-btn');
    const rowTemplate = document.getElementById('row-template');
    const emptyState = document.getElementById('empty-state');
    const tableWrapper = document.querySelector('.table-wrapper');
    
    // Sync
    const cloudSaveBtn = document.getElementById('cloud-save-btn');
    const cloudLoadBtn = document.getElementById('cloud-load-btn');
    const syncCodeInput = document.getElementById('sync-code-input');
    const saveResult = document.getElementById('save-result');
    const syncCodeDisplay = document.getElementById('sync-code-display');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const loaderOverlay = document.getElementById('loader-overlay');

    // --- Initialization ---
    init();

    function init() {
        loadData();
        setupEventListeners();
    }

    // --- Core Logic ---
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    function loadData() {
        const stored = localStorage.getItem('birlik-v2-data');
        if (stored) {
            try {
                appData = JSON.parse(stored);
            } catch (e) {
                console.error("Parse error", e);
                appData = [];
            }
        }
        
        if (appData.length > 0) {
            currentTabId = appData[0].id;
        } else {
            currentTabId = null;
        }
        renderTabs();
        renderTable();
    }

    function saveData() {
        localStorage.setItem('birlik-v2-data', JSON.stringify(appData));
    }

    // --- Navigation ---
    function setupEventListeners() {
        // Sidebar Navigation
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                const targetView = item.getAttribute('data-view');
                viewSections.forEach(view => {
                    view.classList.remove('active');
                    if(view.id === `view-${targetView}`) {
                        view.classList.add('active');
                    }
                });
            });
        });

        // Tabs
        addTabBtn.addEventListener('click', () => {
            newTabModal.style.display = 'flex';
            tabNameInput.value = '';
            tabNameInput.focus();
        });

        closeModals.forEach(btn => {
            btn.addEventListener('click', () => {
                newTabModal.style.display = 'none';
            });
        });

        confirmTabBtn.addEventListener('click', () => {
            const name = tabNameInput.value.trim();
            if (name) {
                addTab(name);
                newTabModal.style.display = 'none';
                showToast('Yeni tablo oluşturuldu.', 'success');
            } else {
                showToast('Tablo adı boş olamaz!', 'error');
            }
        });

        deleteTabBtn.addEventListener('click', () => {
            if (appData.length === 0) return;
            if (confirm('Bu tabloyu ve içindeki tüm verileri silmek istediğinize emin misiniz?')) {
                appData = appData.filter(t => t.id !== currentTabId);
                if (appData.length > 0) {
                    currentTabId = appData[0].id;
                } else {
                    currentTabId = null;
                }
                saveData();
                renderTabs();
                renderTable();
                showToast('Tablo silindi.', 'success');
            }
        });

        // Table
        addRowBtn.addEventListener('click', () => {
            const row = createRow();
            tableBody.appendChild(row);
            syncTableToState();
            saveData();
            checkEmptyState();
        });

        // Sync
        cloudSaveBtn.addEventListener('click', uploadToCloud);
        cloudLoadBtn.addEventListener('click', loadFromCloud);
        copyCodeBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(syncCodeDisplay.textContent).then(() => {
                showToast('Kod kopyalandı!', 'success');
            });
        });
    }

    // --- Tabs Logic ---
    function addTab(name) {
        if(currentTabId) syncTableToState(); // Save current before creating new

        const newTab = {
            id: generateId(),
            name: name,
            rows: []
        };
        appData.push(newTab);
        currentTabId = newTab.id;
        
        saveData();
        renderTabs();
        renderTable();
    }

    function renderTabs() {
        tabsList.innerHTML = '';
        appData.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = `tab ${tab.id === currentTabId ? 'active' : ''}`;
            btn.textContent = tab.name;
            btn.addEventListener('click', () => {
                if (currentTabId !== tab.id) {
                    syncTableToState(); // Save current
                    currentTabId = tab.id;
                    renderTabs();
                    renderTable();
                }
            });
            tabsList.appendChild(btn);
        });
    }

    // --- Table Logic ---
    function getTabObject(id) {
        return appData.find(t => t.id === id);
    }
    
    function getTabIndex(id) {
        return appData.findIndex(t => t.id === id);
    }

    function renderTable() {
        tableBody.innerHTML = '';
        const currentTab = getTabObject(currentTabId);
        
        if (currentTab) {
            currentTabTitle.textContent = currentTab.name;
            document.getElementById('add-row-btn').style.display = 'inline-flex';
            document.getElementById('delete-tab-btn').style.display = 'inline-flex';
            
            if (currentTab.rows && currentTab.rows.length > 0) {
                currentTab.rows.forEach(rowData => {
                    const tr = createRow(rowData);
                    tableBody.appendChild(tr);
                });
            }
        } else {
            currentTabTitle.textContent = 'Tablo Bulunmuyor';
            document.getElementById('add-row-btn').style.display = 'none';
            document.getElementById('delete-tab-btn').style.display = 'none';
        }
        checkEmptyState();
        calculateAllRows(); // Calculate GHGP after rendering
    }

    function syncTableToState() {
        const currentTab = getTabObject(currentTabId);
        if (!currentTab) return;

        const rows = document.querySelectorAll('.mod-row');
        const newData = [];
        
        rows.forEach(row => {
            newData.push({
                nick: row.querySelector('.input-nick').value,
                kisiler: row.querySelector('.input-kisiler').value,
                streamer: row.querySelector('.input-streamer').value,
                public: row.querySelector('.input-public').value
            });
        });
        
        currentTab.rows = newData;
    }

    function checkEmptyState() {
        if (!currentTabId) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = '<i class="fa-solid fa-folder-open"></i><h3>Tablo Bulunamadı</h3><p>Yeni bir veri tablosu oluşturmak için üstteki + butonunu kullanın.</p>';
            tableWrapper.style.display = 'none';
        } else if (tableBody.children.length === 0) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = '<i class="fa-solid fa-table-list"></i><h3>Veri Bulunamadı</h3><p>Tabloya veri eklemek için "Satır Ekle" butonunu kullanın.</p>';
            tableWrapper.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            tableWrapper.style.display = 'block';
        }
    }

    function createRow(data = {}) {
        const template = rowTemplate.content.cloneNode(true);
        const tr = template.querySelector('tr');
        
        const inputs = {
            nick: tr.querySelector('.input-nick'),
            kisiler: tr.querySelector('.input-kisiler'),
            streamer: tr.querySelector('.input-streamer'),
            public: tr.querySelector('.input-public')
        };

        if (data.nick) inputs.nick.value = data.nick;
        if (data.kisiler) inputs.kisiler.value = data.kisiler;
        if (data.streamer !== undefined && data.streamer !== '') inputs.streamer.value = data.streamer;
        if (data.public !== undefined && data.public !== '') inputs.public.value = data.public;

        Object.values(inputs).forEach(input => {
            input.addEventListener('input', () => {
                if (input === inputs.nick) {
                    calculateAllRows(); // Nick changed, might affect previous tab matching
                } else {
                    calculateRow(tr);
                }
                syncTableToState();
                saveData();
            });
        });

        tr.querySelector('.delete-btn').addEventListener('click', () => {
            tr.remove();
            syncTableToState();
            saveData();
            checkEmptyState();
        });

        // Base calculation for totals and categories
        calculateRow(tr, true); 

        return tr;
    }

    // Only calculating Total and Category for single row
    function calculateRow(tr, skipGhgp = false) {
        const streamerVal = parseFloat(tr.querySelector('.input-streamer').value) || 0;
        const publicVal = parseFloat(tr.querySelector('.input-public').value) || 0;
        const total = streamerVal + publicVal;
        
        tr.querySelector('.cell-total').textContent = Number.isInteger(total) ? total : total.toFixed(1);

        const catSpan = tr.querySelector('.category-badge');
        if (total >= 30) {
            catSpan.className = 'category-badge cat-good';
            catSpan.textContent = 'İyi (30+)';
        } else if (total >= 20) {
            catSpan.className = 'category-badge cat-average';
            catSpan.textContent = 'Ortalama (20-30)';
        } else if (total > 0) {
            catSpan.className = 'category-badge cat-bad';
            catSpan.textContent = 'Kötü (<20)';
        } else {
            catSpan.className = 'category-badge none';
            catSpan.textContent = 'Belirsiz';
        }

        if (!skipGhgp) calculateAllRows();
    }

    // GHGP calculation requires looking at the previous tab
    function calculateAllRows() {
        const currentIndex = getTabIndex(currentTabId);
        const previousTab = currentIndex > 0 ? appData[currentIndex - 1] : null;
        
        const rows = document.querySelectorAll('.mod-row');
        
        rows.forEach(tr => {
            const nick = tr.querySelector('.input-nick').value.trim().toLowerCase();
            const streamerVal = parseFloat(tr.querySelector('.input-streamer').value) || 0;
            const publicVal = parseFloat(tr.querySelector('.input-public').value) || 0;
            const total = streamerVal + publicVal;
            
            const badgeSpan = tr.querySelector('.ghgp-badge');
            badgeSpan.className = 'ghgp-badge neutral';
            badgeSpan.innerHTML = '-';

            if (previousTab && nick) {
                // Find matching nick in previous tab
                const oldData = previousTab.rows.find(r => r.nick.trim().toLowerCase() === nick);
                if (oldData) {
                    const oldTotal = (parseFloat(oldData.streamer) || 0) + (parseFloat(oldData.public) || 0);
                    
                    if (oldTotal > 0) {
                        const ghgp = (((total - oldTotal) / oldTotal) * 100);
                        const formatted = Math.abs(ghgp).toFixed(1) + '%';
                        
                        if (ghgp > 0) {
                            badgeSpan.className = 'ghgp-badge up';
                            badgeSpan.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${formatted}`;
                        } else if (ghgp < 0) {
                            badgeSpan.className = 'ghgp-badge down';
                            badgeSpan.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> -${formatted}`;
                        } else {
                            badgeSpan.innerHTML = `0%`;
                        }
                    }
                }
            }
        });
    }

    // --- Sync Logic ---
    async function uploadToCloud() {
        syncTableToState(); // Save latest changes
        saveData();

        if (appData.length === 0) {
            showToast('Yüklenecek veri bulunamadı.', 'error');
            return;
        }

        loaderOverlay.style.display = 'flex';
        
        try {
            // Using dpaste.com for robust text/json storage
            const formData = new URLSearchParams();
            formData.append('content', JSON.stringify(appData));
            formData.append('syntax', 'json');
            formData.append('expiry_days', '365'); // 1 year retention
            
            const response = await fetch('https://dpaste.com/api/v2/', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const resultUrl = await response.text();
                const binId = resultUrl.trim().split('/').pop();
                
                if (binId) {
                    syncCodeDisplay.textContent = binId;
                    saveResult.classList.remove('hidden');
                    showToast('Veriler buluta başarıyla kaydedildi!', 'success');
                } else {
                    throw new Error("API Hatası (ID dönmedi)");
                }
            } else {
                throw new Error("API Hatası");
            }

        } catch (error) {
            console.error('Cloud error, falling back to local base64:', error);
            // Fallback: Generate a Base64 string as "Code" if API fails
            const jsonStr = JSON.stringify(appData);
            const encoded = btoa(unescape(encodeURIComponent(jsonStr))); // UTF8 safe base64
            
            syncCodeDisplay.textContent = "B64-" + encoded.substring(0, 50) + "..."; // Show part of it to not break UI
            
            // We store the full encoded string in a data attribute for the copy button
            copyCodeBtn.onclick = () => {
                navigator.clipboard.writeText("B64-" + encoded).then(() => {
                    showToast('Çevrimdışı kod kopyalandı!', 'success');
                });
            };
            
            saveResult.classList.remove('hidden');
            showToast('Bulut sunucusuna ulaşılamadı. Çevrimdışı kod oluşturuldu.', 'info');
        } finally {
            loaderOverlay.style.display = 'none';
        }
    }

    async function loadFromCloud() {
        let code = syncCodeInput.value.trim();
        
        if (!code) {
            showToast('Lütfen geçerli bir kod girin.', 'error');
            return;
        }

        loaderOverlay.style.display = 'flex';

        try {
            // Check if it's our fallback Base64 code
            if (code.startsWith("B64-")) {
                const base64Str = code.substring(4);
                const jsonStr = decodeURIComponent(escape(atob(base64Str)));
                const data = JSON.parse(jsonStr);
                
                if (Array.isArray(data)) {
                    appData = data;
                    currentTabId = appData[0].id;
                    saveData();
                    renderTabs();
                    renderTable();
                    showToast('Veriler başarıyla birleştirildi!', 'success');
                } else {
                    throw new Error("Geçersiz veri formatı");
                }
                loaderOverlay.style.display = 'none';
                return;
            }

            // Normal API approach via dpaste
            const response = await fetch(`https://dpaste.com/${code}.txt`, {
                method: 'GET'
            });

            if (response.ok) {
                const resultText = await response.text();
                try {
                    const result = JSON.parse(resultText);
                    if (Array.isArray(result)) {
                        // Tüm tabloları mevcut verilerle BİRLEŞTİR (Merge)
                        result.forEach(cloudTab => {
                            const existingTabIndex = appData.findIndex(t => t.name.trim().toLowerCase() === cloudTab.name.trim().toLowerCase());
                            if (existingTabIndex !== -1) {
                                // İsimleri aynıysa, satırları güncelle
                                appData[existingTabIndex].rows = cloudTab.rows;
                            } else {
                                // Yoksa yeni tablo olarak ekle
                                cloudTab.id = generateId(); // Çakışma önleyici
                                appData.push(cloudTab);
                            }
                        });
                        
                        // Eğer hiç aktif tablo yoksa ilkine geç
                        if (!currentTabId && appData.length > 0) {
                            currentTabId = appData[0].id;
                        }
                        
                        saveData();
                        renderTabs();
                        renderTable();
                        showToast('Buluttaki tüm tablolar cihazınıza eklendi!', 'success');
                        syncCodeInput.value = '';
                    } else {
                        showToast('Buluttaki veri yapısı hatalı.', 'error');
                    }
                } catch(e) {
                    showToast('Buluttaki veri JSON formatında değil.', 'error');
                }
            } else {
                showToast('Geçersiz kod veya bulut verisi bulunamadı.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('İndirme sırasında bir hata oluştu.', 'error');
        } finally {
            loaderOverlay.style.display = 'none';
        }
    }

    // --- Utils ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-circle-exclamation';
        if (type === 'info') iconClass = 'fa-circle-info';
        
        toast.innerHTML = `<i class="toast-icon fa-solid ${iconClass}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
