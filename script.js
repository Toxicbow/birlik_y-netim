document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('table-body');
    const addRowBtn = document.getElementById('add-row-btn');
    const exportDiscordBtn = document.getElementById('export-discord-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const rowTemplate = document.getElementById('row-template');

    // Load data from localStorage
    loadData();

    // Event Listeners
    addRowBtn.addEventListener('click', () => {
        const row = createRow();
        tableBody.appendChild(row);
        saveData();
    });

    clearDataBtn.addEventListener('click', () => {
        if (confirm('Tüm tablo verileri silinecek. Emin misiniz?')) {
            tableBody.innerHTML = '';
            saveData();
            showToast('Veriler temizlendi.', 'success');
        }
    });

    exportDiscordBtn.addEventListener('click', exportToDiscord);

    function createRow(data = {}) {
        const template = rowTemplate.content.cloneNode(true);
        const tr = template.querySelector('tr');
        
        const inputs = {
            nick: tr.querySelector('.input-nick'),
            kisiler: tr.querySelector('.input-kisiler'),
            old: tr.querySelector('.input-old'),
            streamer: tr.querySelector('.input-streamer'),
            public: tr.querySelector('.input-public')
        };

        // Populate data if provided
        if (data.nick) inputs.nick.value = data.nick;
        if (data.kisiler) inputs.kisiler.value = data.kisiler;
        if (data.old !== undefined && data.old !== '') inputs.old.value = data.old;
        if (data.streamer !== undefined && data.streamer !== '') inputs.streamer.value = data.streamer;
        if (data.public !== undefined && data.public !== '') inputs.public.value = data.public;

        // Add event listeners to inputs to trigger calculation
        Object.values(inputs).forEach(input => {
            input.addEventListener('input', () => {
                calculateRow(tr);
                saveData();
            });
        });

        // Delete button
        tr.querySelector('.delete-btn').addEventListener('click', () => {
            tr.remove();
            saveData();
        });

        // Initial calculation
        calculateRow(tr);

        return tr;
    }

    function calculateRow(tr) {
        const oldInputVal = tr.querySelector('.input-old').value;
        const streamerVal = parseFloat(tr.querySelector('.input-streamer').value) || 0;
        const publicVal = parseFloat(tr.querySelector('.input-public').value) || 0;

        // Total
        const total = streamerVal + publicVal;
        
        // Show total with 1 decimal if needed, else integer
        tr.querySelector('.cell-total').textContent = Number.isInteger(total) ? total : total.toFixed(1);

        // GHGP % Calculation
        let ghgp = 0;
        const badgeSpan = tr.querySelector('.ghgp-badge');
        
        badgeSpan.className = 'ghgp-badge neutral';
        badgeSpan.innerHTML = '';

        if (oldInputVal !== '' && !isNaN(oldInputVal) && parseFloat(oldInputVal) > 0) {
            const oldVal = parseFloat(oldInputVal);
            ghgp = (((total - oldVal) / oldVal) * 100);
            const formattedGhgp = Math.abs(ghgp).toFixed(1) + '%';
            
            if (ghgp > 0) {
                badgeSpan.className = 'ghgp-badge up';
                badgeSpan.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${formattedGhgp}`;
            } else if (ghgp < 0) {
                badgeSpan.className = 'ghgp-badge down';
                badgeSpan.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> -${formattedGhgp}`;
            } else {
                badgeSpan.innerHTML = `<i class="fa-solid fa-minus"></i> 0%`;
            }
        } else {
             badgeSpan.innerHTML = `<i class="fa-solid fa-minus"></i> -`;
        }

        // Categorization
        const catSpan = tr.querySelector('.category-badge');
        if (total >= 30) {
            catSpan.className = 'category-badge cat-legendary';
            catSpan.textContent = 'Efsanevi (30+)';
        } else if (total >= 20) {
            catSpan.className = 'category-badge cat-excellent';
            catSpan.textContent = 'Mükemmel (20-30)';
        } else if (total >= 10) {
            catSpan.className = 'category-badge cat-good';
            catSpan.textContent = 'İyi (10-20)';
        } else if (total > 0) {
            catSpan.className = 'category-badge cat-needs-work';
            catSpan.textContent = 'Geliştirilmeli (<10)';
        } else {
            catSpan.className = 'category-badge none';
            catSpan.textContent = 'Belirsiz';
        }
    }

    function saveData() {
        const rows = document.querySelectorAll('.mod-row');
        const data = [];
        
        rows.forEach(row => {
            data.push({
                nick: row.querySelector('.input-nick').value,
                kisiler: row.querySelector('.input-kisiler').value,
                old: row.querySelector('.input-old').value,
                streamer: row.querySelector('.input-streamer').value,
                public: row.querySelector('.input-public').value
            });
        });
        
        localStorage.setItem('birlik-mod-data', JSON.stringify(data));
    }

    function loadData() {
        const stored = localStorage.getItem('birlik-mod-data');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.length > 0) {
                    data.forEach(item => {
                        tableBody.appendChild(createRow(item));
                    });
                    return;
                }
            } catch (e) {
                console.error("Local storage error:", e);
            }
        }
        
        // Add one empty row by default if no data
        tableBody.appendChild(createRow());
    }

    function exportToDiscord() {
        const rows = document.querySelectorAll('.mod-row');
        if (rows.length === 0) {
            showToast('Kopyalanacak veri yok!', 'error');
            return;
        }

        // Discord Code Block Table format
        // Finding max lengths for padding
        let maxNick = 4;
        let maxKisiler = 7;
        let maxEski = 4;
        let maxStr = 8;
        let maxPub = 6;
        let maxTop = 6;
        let maxGhgp = 6;
        let maxCat = 8;
        
        const rowData = [];

        rows.forEach(row => {
            const nick = row.querySelector('.input-nick').value || '-';
            const kisiler = row.querySelector('.input-kisiler').value || '-';
            const old = row.querySelector('.input-old').value || '0';
            const streamer = row.querySelector('.input-streamer').value || '0';
            const pub = row.querySelector('.input-public').value || '0';
            const total = row.querySelector('.cell-total').textContent;
            
            // Extract raw text without HTML
            const badgeSpan = row.querySelector('.ghgp-badge');
            let ghgpText = badgeSpan.textContent.trim();
            
            const categoryText = row.querySelector('.category-badge').textContent;

            if (nick.length > maxNick) maxNick = nick.length;
            if (kisiler.length > maxKisiler) maxKisiler = kisiler.length;
            if (old.length > maxEski) maxEski = old.length;
            if (streamer.length > maxStr) maxStr = streamer.length;
            if (pub.length > maxPub) maxPub = pub.length;
            if (total.length > maxTop) maxTop = total.length;
            if (ghgpText.length > maxGhgp) maxGhgp = ghgpText.length;
            if (categoryText.length > maxCat) maxCat = categoryText.length;

            rowData.push({ nick, kisiler, old, streamer, pub, total, ghgpText, categoryText });
        });

        // Building string
        const pad = (str, len) => str.padEnd(len, ' ');
        
        let md = "```\n";
        md += `Birlik Moderatör Performans Raporu\n`;
        md += `${'='.repeat(maxNick + maxKisiler + maxEski + maxStr + maxPub + maxTop + maxGhgp + maxCat + 21)}\n`;
        
        md += `${pad('NICK', maxNick)} | ${pad('KİŞİLER', maxKisiler)} | ${pad('ESKİ', maxEski)} | ${pad('STREAMER', maxStr)} | ${pad('PUBLIC', maxPub)} | ${pad('TOPLAM', maxTop)} | ${pad('GHGP %', maxGhgp)} | ${pad('KATEGORİ', maxCat)}\n`;
        md += `${'-'.repeat(maxNick)} | ${'-'.repeat(maxKisiler)} | ${'-'.repeat(maxEski)} | ${'-'.repeat(maxStr)} | ${'-'.repeat(maxPub)} | ${'-'.repeat(maxTop)} | ${'-'.repeat(maxGhgp)} | ${'-'.repeat(maxCat)}\n`;

        rowData.forEach(d => {
            md += `${pad(d.nick, maxNick)} | ${pad(d.kisiler, maxKisiler)} | ${pad(d.old, maxEski)} | ${pad(d.streamer, maxStr)} | ${pad(d.pub, maxPub)} | ${pad(d.total, maxTop)} | ${pad(d.ghgpText, maxGhgp)} | ${pad(d.categoryText, maxCat)}\n`;
        });
        
        md += "```";

        navigator.clipboard.writeText(md).then(() => {
            showToast('Discord formatında kopyalandı!', 'success');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            
            // Fallback for secure context issues
            const textArea = document.createElement("textarea");
            textArea.value = md;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
              document.execCommand('copy');
              showToast('Discord formatında kopyalandı!', 'success');
            } catch (err) {
              showToast('Kopyalama başarısız! Lütfen manuel kopyalayın.', 'error');
            }
            document.body.removeChild(textArea);
        });
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        const icon = type === 'success' ? '<i class="fa-solid fa-circle-check" style="color: var(--ghgp-up)"></i>' : '<i class="fa-solid fa-circle-exclamation" style="color: var(--danger)"></i>';
        
        toast.innerHTML = `${icon} ${message}`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
});
