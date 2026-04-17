import { db, storage } from './firebase.js';
import { collection, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export function initCompliance() {
    setupTabs();
    setupSusepRules();
    setupCertificados();
    setupCertificationsManager();
    setupTemplatesManager();
}

function setupTabs() {
    const btnSusep = document.getElementById('tabSusepBtn');
    const btnCertificados = document.getElementById('tabCertificadosBtn');
    const btnCertificacoes = document.getElementById('tabCertificacoesBtn');
    const btnTemplates = document.getElementById('tabTemplatesBtn');

    const panelSusep = document.getElementById('comp-susep-panel');
    const panelCertificados = document.getElementById('comp-certificados-panel');
    const panelCertificacoes = document.getElementById('comp-certifications-panel');
    const panelTemplates = document.getElementById('comp-templates-panel');

    function switchTab(activeBtn, activePanel) {
        // Reset buttons
        [btnSusep, btnCertificados, btnCertificacoes, btnTemplates].forEach(b => {
            if (b) {
                b.classList.remove('btn-primary');
                b.classList.add('btn-secondary');
            }
        });
        // Set active button
        if (activeBtn) {
            activeBtn.classList.remove('btn-secondary');
            activeBtn.classList.add('btn-primary');
        }

        // Hide all panels
        [panelSusep, panelCertificados, panelCertificacoes, panelTemplates].forEach(p => { if (p) p.style.display = 'none'; });
        // Show active panel
        if (activePanel) activePanel.style.display = 'block';
    }

    if (btnSusep) btnSusep.addEventListener('click', () => switchTab(btnSusep, panelSusep));
    if (btnCertificados) btnCertificados.addEventListener('click', () => switchTab(btnCertificados, panelCertificados));
    if (btnCertificacoes) btnCertificacoes.addEventListener('click', () => switchTab(btnCertificacoes, panelCertificacoes));
    if (btnTemplates) btnTemplates.addEventListener('click', () => switchTab(btnTemplates, panelTemplates));
}

async function setupSusepRules() {
    const docRef = doc(db, 'compliance_content', 'susep_rules');

    // Element references
    const inScore = document.getElementById('susepMinScore');
    const inInternalPct = document.getElementById('internalMaterialPercentage');
    const lblInternalPct = document.getElementById('percentageVal');
    const inCanSay = document.getElementById('susepCanSay');
    const inCannotSay = document.getElementById('susepCannotSay');
    const inMutualism = document.getElementById('susepMutualism');
    const inPromises = document.getElementById('susepPromises');
    const btnSave = document.getElementById('saveSusepRulesBtn');
    const pdfUpload = document.getElementById('internalPdfUpload');
    const pdfUploadStatus = document.getElementById('pdfUploadStatus');

    if (inInternalPct) {
        inInternalPct.addEventListener('input', (e) => {
            lblInternalPct.textContent = `${e.target.value}%`;
        });
    }

    // Load initial data
    try {
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            const data = snapshot.data();
            inScore.value = data.minScore || 70;
            inInternalPct.value = data.internalPercentage || 0;
            lblInternalPct.textContent = `${inInternalPct.value}%`;
            inCanSay.value = data.canSay || '';
            inCannotSay.value = data.cannotSay || '';
            inMutualism.value = data.mutualism || '';
            inPromises.value = data.promises || '';
        }
    } catch (err) {
        console.error("Error loading SUSEP config", err);
    }

    // Handle PDF Upload
    if (pdfUpload) {
        pdfUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.type !== 'application/pdf') {
                alert('Apenas arquivos PDF são aceitos.');
                pdfUpload.value = '';
                return;
            }

            const storageRef = ref(storage, 'compliance_docs/material_interno.pdf');
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    pdfUploadStatus.textContent = `Enviando: ${Math.round(progress)}%`;
                },
                (error) => {
                    console.error("Upload failed", error);
                    pdfUploadStatus.textContent = 'Erro no envio do PDF.';
                    pdfUploadStatus.style.color = '#ef4444';
                },
                () => {
                    pdfUploadStatus.textContent = 'PDF enviado! A Inteligência Artificial está processando o documento no servidor...';
                    pdfUploadStatus.style.color = 'var(--primary)';
                }
            );
        });
    }

    // Save data
    btnSave.addEventListener('click', async () => {
        const prevText = btnSave.textContent;
        btnSave.textContent = 'Salvando...';
        btnSave.disabled = true;

        try {
            await setDoc(docRef, {
                minScore: Number(inScore.value),
                internalPercentage: Number(inInternalPct.value),
                canSay: inCanSay.value,
                cannotSay: inCannotSay.value,
                mutualism: inMutualism.value,
                promises: inPromises.value,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            alert('Apostila e configurações salvas com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar as configurações.');
        } finally {
            btnSave.textContent = prevText;
            btnSave.disabled = false;
        }
    });
}

function setupCertificados() {
    const tbody = document.getElementById('certificadosTableBody');
    const searchInput = document.getElementById('certificadosSearch');

    if (!tbody) return;

    // Load certifications map to resolve names and template IDs
    let certsMap = {};
    onSnapshot(collection(db, 'certifications'), (certSnap) => {
        certSnap.forEach(cDoc => {
            certsMap[cDoc.id] = cDoc.data();
        });
    });

    onSnapshot(collection(db, 'certification_attempts'), (snapshot) => {
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhuma tentativa registrada ainda.</td></tr>';
            return;
        }

        const userStats = {};

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const uid = data.userId;

            if (!userStats[uid]) {
                userStats[uid] = {
                    userId: uid,
                    totalAttempts: 0,
                    lastUpdate: new Date(0),
                    statuses: new Set(),
                    attempts: [] // Track individual attempts
                };
            }

            userStats[uid].totalAttempts++;
            userStats[uid].statuses.add(data.status);
            userStats[uid].attempts.push({ id: docSnap.id, ...data });

            const date = data.startedAt?.toDate ? data.startedAt.toDate() : new Date(data.startedAt || 0);
            if (date > userStats[uid].lastUpdate) {
                userStats[uid].lastUpdate = date;
            }
        });

        const usersList = Object.values(userStats);
        usersList.sort((a, b) => b.lastUpdate - a.lastUpdate);

        usersList.forEach(stat => {
            // MAIN ROW
            const tr = document.createElement('tr');
            tr.className = 'main-row';
            tr.style.cursor = 'pointer';
            tr.setAttribute('data-search-uid', stat.userId.toLowerCase());

            let statusBadge = '';
            let statusColor = '';

            if (stat.statuses.has('passed')) {
                statusBadge = 'Aprovado / Certificado';
                statusColor = '#10b981';
            } else if (stat.statuses.has('in_progress')) {
                statusBadge = 'Em andamento';
                statusColor = '#f59e0b';
            } else {
                statusBadge = 'Reprovado / Pendente';
                statusColor = '#ef4444';
            }

            const badgeHtml = `<span style="background: ${statusColor}22; color: ${statusColor}; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${statusBadge}</span>`;

            const dateText = stat.lastUpdate.getTime() > 0 ? stat.lastUpdate.toLocaleString('pt-BR') : 'Desconhecido';

            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-weight: 500;" class="user-name-display">Carregando...</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${stat.userId}</div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="expand-icon" style="color: var(--text-muted); transition: transform 0.2s;">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </td>
                <td>${badgeHtml}</td>
                <td style="font-weight: bold;">${stat.totalAttempts}</td>
                <td>${dateText}</td>
            `;
            tbody.appendChild(tr);

            // SUB ROW (Hidden by default)
            const subTr = document.createElement('tr');
            subTr.className = 'sub-row';
            subTr.style.display = 'none';
            subTr.style.backgroundColor = '#f8fafc';

            let subTableHtml = `
            <td colspan="4" style="padding: 16px 24px;">
                <h4 style="margin-bottom: 12px; font-size: 0.85rem; color: var(--text-muted);">Histórico de Tentativas</h4>
                <div style="overflow-x: auto;">
                <table style="width: 100%; font-size: 0.8rem; background: white; border: 1px solid var(--glass-border); border-radius: 8px;">
                    <thead style="background: rgba(0,0,0,0.03);">
                        <tr>
                            <th style="padding: 10px; border-bottom: 1px solid var(--glass-border);">Data/Hora</th>
                            <th style="padding: 10px; border-bottom: 1px solid var(--glass-border);">Certificação</th>
                            <th style="padding: 10px; border-bottom: 1px solid var(--glass-border);">Modo</th>
                            <th style="padding: 10px; border-bottom: 1px solid var(--glass-border);">Status</th>
                            <th style="padding: 10px; border-bottom: 1px solid var(--glass-border);">Nota/Avanço</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            stat.attempts.sort((a, b) => {
                const dateA = a.startedAt?.toDate ? a.startedAt.toDate() : new Date(a.startedAt);
                const dateB = b.startedAt?.toDate ? b.startedAt.toDate() : new Date(b.startedAt);
                return dateB - dateA;
            });

            stat.attempts.forEach(att => {
                const attDate = att.startedAt?.toDate ? att.startedAt.toDate() : new Date(att.startedAt);
                const attDateText = attDate instanceof Date && !isNaN(attDate) ? attDate.toLocaleString('pt-BR') : 'Agora';

                let attBadge = '';
                let attColor = '';

                let tStatusHtml = '';
                let printBtn = '';

                if (att.status === 'passed') {
                    attBadge = 'Aprovado / Certificado';
                    tStatusHtml = '<span style="color: #10b981; font-weight: bold;">Aprovado (Certificado)</span>';
                    printBtn = `
                        <button class="btn-primary print-cert-btn" data-att-id="${att.id}" data-uid="${stat.userId}" data-cid="${att.certificationId || 'susep_legacy'}" style="padding: 4px 8px; font-size: 0.75rem; margin-left: 8px; display: inline-flex; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Certificado
                        </button>
                    `;
                } else if (att.status === 'in_progress') {
                    attBadge = 'Em andamento';
                    tStatusHtml = '<span style="color: #f59e0b; font-weight: bold;">Em andamento</span>';
                } else {
                    attBadge = 'Reprovado / Pendente';
                    tStatusHtml = '<span style="color: #ef4444; font-weight: bold;">Reprovado</span>';
                }

                const tMode = att.isTrainingMode ? 'Modo Treino' : 'Avaliação Oficial';

                let scoreHtml = '-';
                if (att.status === 'in_progress' && att.answers) {
                    const answered = Object.keys(att.answers).length;
                    scoreHtml = `${answered} / ${att.totalQuestions || 20} (Progresso)`;
                } else if (att.score !== undefined && att.score !== null) {
                    scoreHtml = `${att.score}%`;
                }

                const certName = certsMap[att.certificationId]?.name || att.certificationId || 'Regulatória (Legado)';

                subTableHtml += `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border); color: var(--text-main);">${attDateText}</td>
                        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border); color: var(--text-secondary);">${certName}</td>
                        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border);">${tMode}</td>
                        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center;">${tStatusHtml}${printBtn}</td>
                        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border); font-weight: bold;">${scoreHtml}</td>
                    </tr>
                `;
            });

            subTableHtml += `
                    </tbody>
                </table>
                </div>
            </td>
            `;

            subTr.innerHTML = subTableHtml;
            tbody.appendChild(subTr);

            // Toggle logic
            tr.addEventListener('click', () => {
                const isHidden = subTr.style.display === 'none';
                subTr.style.display = isHidden ? '' : 'none';
                tr.style.backgroundColor = isHidden ? '#f1f5f9' : '';
                const icon = tr.querySelector('.expand-icon');
                if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            });

            // Lazy fetch user name
            getDoc(doc(db, 'users', stat.userId)).then(userDoc => {
                const nameEl = tr.querySelector('.user-name-display');
                if (userDoc.exists()) {
                    const name = userDoc.data().name || 'Sem nome';
                    const email = userDoc.data().email || '';
                    if (nameEl) nameEl.textContent = name;

                    const currentSearch = tr.getAttribute('data-search-uid') || '';
                    tr.setAttribute('data-search-uid', `${currentSearch} ${name.toLowerCase()} ${email.toLowerCase()}`);

                    if (searchInput && searchInput.value) {
                        searchInput.dispatchEvent(new Event('input'));
                    }
                } else {
                    if (nameEl) nameEl.textContent = 'Usuário desconhecido';
                }
            }).catch(() => { });

            // Attach Print Events
            subTr.querySelectorAll('.print-cert-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    printAdminCertificate(
                        btn.getAttribute('data-uid'),
                        btn.getAttribute('data-cid'),
                        btn.getAttribute('data-att-id')
                    );
                });
            });
        });

        // Search Filter Logic
        if (searchInput) {
            const filterRows = () => {
                const term = searchInput.value.toLowerCase();
                const mainRows = tbody.querySelectorAll('tr.main-row');

                mainRows.forEach(r => {
                    const searchData = r.getAttribute('data-search-uid') || '';
                    const subRow = r.nextElementSibling;

                    if (searchData.includes(term)) {
                        r.style.display = '';
                    } else {
                        r.style.display = 'none';
                        if (subRow && subRow.classList.contains('sub-row')) {
                            subRow.style.display = 'none';
                            r.style.backgroundColor = '';
                            const icon = r.querySelector('.expand-icon');
                            if (icon) icon.style.transform = 'rotate(0deg)';
                        }
                    }
                });
            };

            // Re-apply event listeners clean up
            searchInput.removeEventListener('input', filterRows);
            searchInput.addEventListener('input', filterRows);
        }
    });
}

function setupCertificationsManager() {
    const modal = document.getElementById('certificationModal');
    const btnOpen = document.getElementById('openNewCertificationModalBtn');
    const btnClose = document.getElementById('closeCertificationModalBtn');
    const btnCancel = document.getElementById('cancelCertificationModalBtn');
    const form = document.getElementById('certificationForm');
    const tbody = document.getElementById('certificationsTableBody');

    // Toggle Modal
    const toggleModal = (show) => {
        if (!modal) return;
        if (show) {
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
            form.reset();
            document.getElementById('cert-id').value = '';
        }
    };

    if (btnOpen) btnOpen.addEventListener('click', () => toggleModal(true));
    if (btnClose) btnClose.addEventListener('click', () => toggleModal(false));
    if (btnCancel) btnCancel.addEventListener('click', () => toggleModal(false));

    // Handle Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('cert-id').value;
            const name = document.getElementById('cert-name').value;
            const description = document.getElementById('cert-description').value;
            const orientations = document.getElementById('cert-orientations').value;
            const canSay = document.getElementById('cert-canSay').value;
            const cannotSay = document.getElementById('cert-cannotSay').value;
            const guidelines = document.getElementById('cert-guidelines').value;
            const questionCount = parseInt(document.getElementById('cert-questionCount').value, 10) || 20;
            const minScore = parseInt(document.getElementById('cert-minScore').value, 10) || 70;
            const templateId = document.getElementById('cert-templateId').value;
            const active = document.getElementById('cert-active').checked;

            const certData = {
                name,
                description,
                orientations,
                canSay,
                cannotSay,
                guidelines,
                questionCount,
                minScore,
                templateId,
                active,
                updatedAt: new Date().toISOString()
            };

            try {
                if (id) {
                    // Update
                    await setDoc(doc(db, 'certifications', id), certData, { merge: true });
                } else {
                    // Create
                    certData.createdAt = new Date().toISOString();
                    const newRef = doc(collection(db, 'certifications'));
                    await setDoc(newRef, certData);
                }
                toggleModal(false);
            } catch (error) {
                console.error("Error saving certification:", error);
                alert("Erro ao salvar certificação.");
            }
        });
    }

    // List Certifications
    if (tbody) {
        onSnapshot(collection(db, 'certifications'), (snapshot) => {
            tbody.innerHTML = '';
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 32px;">Nenhuma certificação cadastrada.</td></tr>';
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const certId = docSnap.id;
                const tr = document.createElement('tr');

                const statusBadge = data.active
                    ? '<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">Ativa</span>'
                    : '<span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">Inativa</span>';

                tr.innerHTML = `
                    <td style="font-weight: 600;">${data.name}</td>
                    <td><div style="font-size: 0.85rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.description}</div></td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-secondary" style="padding: 4px 12px; font-size: 0.85rem;" data-edit-id="${certId}">Editar</button>
                    </td>
                `;
                tbody.appendChild(tr);

                tr.querySelector(`button[data-edit-id="${certId}"]`).addEventListener('click', () => {
                    document.getElementById('cert-id').value = certId;
                    document.getElementById('cert-name').value = data.name || '';
                    document.getElementById('cert-description').value = data.description || '';
                    document.getElementById('cert-orientations').value = data.orientations || '';
                    document.getElementById('cert-canSay').value = data.canSay || '';
                    document.getElementById('cert-cannotSay').value = data.cannotSay || '';
                    document.getElementById('cert-guidelines').value = data.guidelines || '';
                    document.getElementById('cert-questionCount').value = data.questionCount || 20;
                    document.getElementById('cert-minScore').value = data.minScore || 70;
                    document.getElementById('cert-templateId').value = data.templateId || '';
                    document.getElementById('cert-active').checked = data.active !== false;
                    toggleModal(true);
                });
            });
        });
    }
}

function setupTemplatesManager() {
    const modal = document.getElementById('templateModal');
    const btnOpen = document.getElementById('openTemplateModalBtn');
    const btnClose = document.getElementById('closeTemplateModalBtn');
    const btnCancel = document.getElementById('cancelTemplateModalBtn');
    const form = document.getElementById('templateForm');
    const tbody = document.getElementById('templatesTableBody');
    const selectTemplate = document.getElementById('cert-templateId');
    const opacityInput = document.getElementById('tpl-bgOpacity');
    const opacityVal = document.getElementById('tpl-bgOpacityVal');

    if (opacityInput && opacityVal) {
        opacityInput.addEventListener('input', (e) => {
            opacityVal.textContent = Math.round(e.target.value * 100) + '%';
        });
    }

    const fileInput = document.getElementById('tpl-bgImageAuth');
    const uploadStatus = document.getElementById('tpl-uploadStatus');
    const hiddenUrlInput = document.getElementById('tpl-uploadedImageUrl');

    // Preview Elements
    const previewBg = document.getElementById('tpl-preview-bg');
    const previewContent = document.getElementById('tpl-preview-content');
    const previewTitle = document.getElementById('tpl-preview-title');
    const previewText = document.getElementById('tpl-preview-text');

    const updatePreview = () => {
        if (!previewContent) return;

        const fontFamily = document.getElementById('tpl-fontFamily').value;
        const textColor = document.getElementById('tpl-textColor').value;
        const textSecondaryColor = document.getElementById('tpl-textSecondaryColor').value;
        const bgColor = document.getElementById('tpl-bgColor').value;
        let bgOpacity = parseFloat(opacityInput?.value);
        if (isNaN(bgOpacity)) bgOpacity = 1;

        let rgbaBg = bgColor;
        if (bgColor.startsWith('#') && bgColor.length === 7) {
            const r = parseInt(bgColor.slice(1, 3), 16);
            const g = parseInt(bgColor.slice(3, 5), 16);
            const b = parseInt(bgColor.slice(5, 7), 16);
            rgbaBg = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
        }

        const bgImage = hiddenUrlInput.value || null;

        // Apply styles
        previewContent.style.fontFamily = fontFamily === 'System' ? 'sans-serif' : fontFamily;
        previewContent.style.borderColor = textColor;
        previewContent.style.backgroundColor = rgbaBg;

        previewTitle.style.color = textColor;
        previewText.style.color = textSecondaryColor;

        if (bgImage) {
            previewBg.style.backgroundImage = `url('${bgImage}')`;
        } else {
            previewBg.style.backgroundImage = 'none';
        }
    };

    // Attach listeners for live preview
    document.getElementById('tpl-fontFamily')?.addEventListener('change', updatePreview);
    document.getElementById('tpl-textColor')?.addEventListener('input', updatePreview);
    document.getElementById('tpl-textSecondaryColor')?.addEventListener('input', updatePreview);
    document.getElementById('tpl-bgColor')?.addEventListener('input', updatePreview);

    if (opacityInput && opacityVal) {
        opacityInput.addEventListener('input', (e) => {
            opacityVal.textContent = Math.round(e.target.value * 100) + '%';
            updatePreview();
        });
    }

    const toggleModal = (show) => {
        if (!modal) return;
        if (show) {
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
            form.reset();
            document.getElementById('tpl-id').value = '';
            if (opacityInput && opacityVal) {
                opacityInput.value = 1;
                opacityVal.textContent = '100%';
            }
            hiddenUrlInput.value = '';
            uploadStatus.textContent = '';
        }
    };

    if (btnOpen) btnOpen.addEventListener('click', () => toggleModal(true));
    if (btnClose) btnClose.addEventListener('click', () => toggleModal(false));
    if (btnCancel) btnCancel.addEventListener('click', () => toggleModal(false));

    // Image Upload Logic
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uploadStatus.textContent = 'Enviando imagem... aguarde.';
            uploadStatus.style.color = 'var(--primary)';

            try {
                const storageRef = ref(storage, `certificates/${Date.now()}-${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);

                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        uploadStatus.textContent = `Enviando: ${Math.round(progress)}%`;
                    },
                    (error) => {
                        uploadStatus.textContent = 'Erro ao enviar imagem.';
                        uploadStatus.style.color = 'var(--danger)';
                        console.error("Upload error", error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        hiddenUrlInput.value = downloadURL;
                        uploadStatus.textContent = 'Upload concluído e imagem anexada com sucesso!';
                        uploadStatus.style.color = 'var(--success)';
                        updatePreview();
                    }
                );
            } catch (error) {
                console.error("Storage error", error);
                uploadStatus.textContent = 'Erro de armazenamento.';
                uploadStatus.style.color = 'var(--danger)';
            }
        });
    }

    // Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('tpl-id').value;
            const name = document.getElementById('tpl-name').value;
            const fontFamily = document.getElementById('tpl-fontFamily').value;
            const textColor = document.getElementById('tpl-textColor').value;
            const textSecondaryColor = document.getElementById('tpl-textSecondaryColor').value;
            const bgColor = document.getElementById('tpl-bgColor').value;
            let bgOpacity = parseFloat(document.getElementById('tpl-bgOpacity')?.value);
            if (isNaN(bgOpacity)) bgOpacity = 1;

            const bgImage = hiddenUrlInput.value || null;

            const tplData = {
                name,
                fontFamily,
                textColor,
                textSecondaryColor,
                bgColor,
                bgOpacity,
                bgImage,
                updatedAt: new Date().toISOString()
            };

            try {
                if (id) {
                    await setDoc(doc(db, 'certificate_templates', id), tplData, { merge: true });
                } else {
                    tplData.createdAt = new Date().toISOString();
                    const newRef = doc(collection(db, 'certificate_templates'));
                    await setDoc(newRef, tplData);
                }
                toggleModal(false);
            } catch (error) {
                console.error("Error saving template:", error);
                alert("Erro ao salvar modelo de certificado.");
            }
        });
    }

    // List templates
    if (tbody) {
        onSnapshot(collection(db, 'certificate_templates'), (snapshot) => {
            tbody.innerHTML = '';

            // Re-populate select
            if (selectTemplate) {
                const currentValue = selectTemplate.value;
                selectTemplate.innerHTML = '<option value="">Nenhum (Usará o padrão do app)</option>';

                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const opt = document.createElement('option');
                    opt.value = docSnap.id;
                    opt.textContent = data.name;
                    selectTemplate.appendChild(opt);
                });

                if (currentValue) selectTemplate.value = currentValue;
            }

            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 32px;">Nenhum modelo cadastrado.</td></tr>';
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const tplId = docSnap.id;
                const tr = document.createElement('tr');

                const hasBg = data.bgImage ? 'Imagem' : (data.bgColor ? '<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:' + data.bgColor + '"></span>' : 'N/A');

                tr.innerHTML = `
                    <td style="font-weight: 600;">${data.name}</td>
                    <td>${data.fontFamily}</td>
                    <td><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${data.textColor}; margin-right:4px;"></span>${data.textColor}</td>
                    <td>
                        <button class="btn-secondary" style="padding: 4px 12px; font-size: 0.85rem;" data-edit-tpl="${tplId}">Editar</button>
                    </td>
                `;
                tbody.appendChild(tr);

                tr.querySelector(`button[data-edit-tpl="${tplId}"]`).addEventListener('click', () => {
                    document.getElementById('tpl-id').value = tplId;
                    document.getElementById('tpl-name').value = data.name || '';
                    document.getElementById('tpl-fontFamily').value = data.fontFamily || 'System';
                    document.getElementById('tpl-textColor').value = data.textColor || '#111827';
                    document.getElementById('tpl-textSecondaryColor').value = data.textSecondaryColor || '#6b7280';
                    document.getElementById('tpl-bgColor').value = data.bgColor || '#ffffff';

                    const savedOp = data.bgOpacity !== undefined ? data.bgOpacity : 1;
                    if (opacityInput && opacityVal) {
                        opacityInput.value = savedOp;
                        opacityVal.textContent = Math.round(savedOp * 100) + '%';
                    }

                    if (data.bgImage) {
                        hiddenUrlInput.value = data.bgImage;
                        uploadStatus.textContent = 'Imagem prévia já carregada.';
                        uploadStatus.style.color = 'var(--primary)';
                    } else {
                        hiddenUrlInput.value = '';
                        uploadStatus.textContent = '';
                    }
                    updatePreview();
                    toggleModal(true);
                });
            });
        });
    }
}

async function printAdminCertificate(userId, certificationId, attemptId) {
    try {
        // Fetch User
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.exists() ? userDoc.data() : { name: 'Usuário', email: 'N/A' };

        // Fetch Attempt for Date & Score
        const attDoc = await getDoc(doc(db, 'certification_attempts', attemptId));
        if (!attDoc.exists()) {
            alert("Tentativa não encontrada.");
            return;
        }
        const attData = attDoc.data();

        // Fetch Certification Name & TemplateId
        let certName = 'Regulatória (Legado)';
        let templateId = null;

        if (certificationId && certificationId !== 'susep_legacy') {
            const certDoc = await getDoc(doc(db, 'certifications', certificationId));
            if (certDoc.exists()) {
                certName = certDoc.data().name || certName;
                templateId = certDoc.data().templateId;
            }
        }

        // Fetch Template (if exists)
        let template = null;
        if (templateId) {
            const tplDoc = await getDoc(doc(db, 'certificate_templates', templateId));
            if (tplDoc.exists()) {
                template = tplDoc.data();
            }
        }

        // Setup Variables
        const name = userData.name || userData.email || 'Usuário';
        const score = attData.score || '100';

        const certDateRange = attData.startedAt?.toDate ? attData.startedAt.toDate() : new Date();
        const certDate = certDateRange.toLocaleDateString('pt-BR');

        let expDateObj = new Date(certDateRange);
        expDateObj.setFullYear(expDateObj.getFullYear() + 1); // 1 year validity assumed default
        const expDate = expDateObj.toLocaleDateString('pt-BR');

        // Style variables
        const primaryColor = template?.textColor || '#10b981';
        const secondaryColor = template?.textSecondaryColor || '#6b7280';

        let bgColor = template?.bgColor || '#ffffff';
        const bgOpacity = template?.bgOpacity !== undefined ? template.bgOpacity : 1;

        if (bgColor.startsWith('#') && bgColor.length === 7) {
            const r = parseInt(bgColor.slice(1, 3), 16);
            const g = parseInt(bgColor.slice(3, 5), 16);
            const b = parseInt(bgColor.slice(5, 7), 16);
            bgColor = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
        }

        const bgImage = template?.bgImage || null;
        const customFont = template?.fontFamily && template.fontFamily !== 'System' ? template.fontFamily : 'System';
        const fontImport = customFont === 'monospace' ? "@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap');" : "";
        const cssFontFamily = customFont === 'monospace' ? "'Roboto Mono', monospace" : (customFont === 'serif' ? 'serif' : "'Helvetica', 'Arial', sans-serif");

        // Create HTML Content
        const htmlContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>Certificado - ${name}</title>
                    <style>
                        ${fontImport}
                        @page { size: landscape; margin: 0; }
                        body { 
                            font-family: ${cssFontFamily};
                            text-align: center; 
                            color: ${primaryColor}; 
                            margin: 0;
                            padding: 20px;
                            box-sizing: border-box;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .bg-layer {
                            position: absolute;
                            top: 0; left: 0; right: 0; bottom: 0;
                            background-color: ${bgColor};
                            ${bgImage ? `background-image: url('${bgImage}'); background-size: cover; background-position: center; opacity: 0.15;` : ''}
                            z-index: -1;
                        }
                        .boundary { 
                            border: 10px solid ${primaryColor}; 
                            padding: 60px; 
                            border-radius: 20px; 
                            position: relative; 
                            z-index: 1;
                            background: transparent;
                            width: 90%;
                            max-width: 1000px;
                        }
                        h1 { font-size: 50px; color: ${primaryColor}; margin-bottom: 10px; }
                        h2 { font-size: 30px; font-weight: normal; margin-top: 0; color: ${secondaryColor}; }
                        .name { font-size: 40px; font-weight: bold; margin: 40px 0; text-decoration: underline; color: ${primaryColor}; }
                        .details { font-size: 20px; line-height: 1.6; margin-bottom: 40px; color: ${secondaryColor}; }
                        .footer { display: flex; justify-content: space-around; margin-top: 50px; font-size: 18px; color: ${secondaryColor}; }
                    </style>
                </head>
                <body>
                    <div class="bg-layer"></div>
                    <div class="boundary">
                        <h1>Certificado de Conformidade</h1>
                        <h2>${certName}</h2>
                        
                        <p class="details">Certificamos que</p>
                        <div class="name">${name}</div>
                        
                        <p class="details">
                            Concluiu com êxito o treinamento obrigatório de adequação regulatória,<br>
                            obtendo aproveitamento de <strong style="color: ${primaryColor}">${score}%</strong> na avaliação.
                        </p>
                        
                        <div class="footer">
                            <div><strong style="color: ${primaryColor}">Data de Emissão:</strong><br>${certDate}</div>
                            <div><strong style="color: ${primaryColor}">Válido até:</strong><br>${expDate}</div>
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `;

        // Open in new window and print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
        } else {
            alert("Por favor, permita pop-ups neste site para visualizar o certificado.");
        }

    } catch (error) {
        console.error("Erro ao gerar certificado para admin:", error);
        alert("Erro ao gerar impressão do certificado.");
    }
}
