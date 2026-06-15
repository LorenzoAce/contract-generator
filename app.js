const STORAGE_KEY = 'contract-generator-data-v2';
const APP_VERSION = '1.08';
const CONTRACT_TEMPLATES = {
  'pvr-vincitu': {
    label: 'PVR Vincitu',
    directory: 'templates/pvr-vincitu',
    templateCandidates: [
      'contratto-pvr-vincitu-compilabile-2026.pdf',
      'contratto-template.pdf',
    ],
  },
};

const TEXT_FIELD_MAPPING = {
  companyName: 'societa',
  pec: 'pec',
  email: 'email',
  phone: 'telefono',
  mobile: 'cellulare',
  publicIp: 'indirizzo-ip',
  salesContact: 'agente-commerciale',
  cciaaNumber: 'numero-cciaa',
  cciaaChamber: 'provincia-cciaa',
  documentType: 'tipo-documento',
  documentNumber: 'numero-documento',
  documentIssuer: 'organo-di-rilascio',
  documentIssueDate: 'data-rilascio',
  criminalTribunal: 'tribunale',
  criminalTribunal2: 'tribunale-2',
  representativeTaxCode: 'codice-fiscale-titolare',
  birthDate: 'data-nascita-titolare',
  birthCity: 'citta-titolare',
  birthProvince: 'provincia-titolare',
  residenceStreet: 'indirizzo-residenza-titolare',
  residenceNumber: 'civico-residenza-titolare',
  residenceCity: 'citta-residenza-titolare',
  residenceProvince: 'provincia-residenza-titolare',
  legalStreet: 'via-sede-legale',
  legalNumber: 'civico-sede-legale',
  legalCap: 'cap-sede-legale',
  legalCity: 'citta-sede-legale',
  legalProvince: 'provincia-sede-legale',
  operationalStreet: 'via-sede-operativa',
  operationalNumber: 'civico-operativa',
};

const ROLE_CHECKBOXES = ['titolare', 'legale-rappresentante', 'presidente'];
const REGIME_CHECKBOXES = [
  'regime-ordinario',
  'regime-di-vantaggio-e-forfettari',
  'regime-dei-minimi',
  'collaboratore-occasionale',
  'associazioni-dotati-di-p-iva',
  'associazioni-non-dotati-di-p-iva',
];

const SIGNATURE_LAYOUTS = {
  default: {
    anchor: 'after-field',
    xOffset: 16,
    yOffset: -10,
    maxWidth: 150,
    extraWidth: 70,
    height: 42,
  },
  4: {
    anchor: 'absolute',
    absoluteX: 376,
    yOffset: -4,
    fixedWidth: 140,
    height: 34,
  },
  5: {
    anchor: 'absolute',
    absoluteX: 376,
    yOffset: -4,
    fixedWidth: 140,
    height: 34,
  },
  6: {
    anchor: 'absolute',
    absoluteX: 364,
    yOffset: -4,
    fixedWidth: 136,
    height: 32,
  },
  7: {
    anchor: 'absolute',
    absoluteX: 364,
    yOffset: -4,
    fixedWidth: 136,
    height: 32,
  },
};

const STEP_DEFINITIONS = [
  {
    title: 'Dati Azienda',
    description: 'Inserisci anagrafica, contatti e sedi aziendali.',
    validate: validateCompanyStep,
  },
  {
    title: 'Legale Rappresentante',
    description: 'Raccogli dati anagrafici e residenza del firmatario.',
    validate: validateRepresentativeStep,
  },
  {
    title: 'Documento di Identita',
    description: 'Completa gli estremi del documento e allega i file.',
    validate: validateDocumentStep,
  },
  {
    title: 'Dati Attivita',
    description: 'Inserisci CCIAA, licenza o SCIA, IP pubblico e commerciale.',
    validate: validateActivityStep,
  },
  {
    title: 'Regime Fiscale',
    description: 'Seleziona il regime fiscale con una card dedicata.',
    validate: validateFiscalStep,
  },
  {
    title: 'Allegato A',
    description: 'Controlla i dati riportati automaticamente e conferma.',
    validate: validateAnnexAStep,
  },
  {
    title: 'Casellario e Carichi Pendenti',
    description: 'Dichiara eventuali note oppure conferma che non ci sono rilievi.',
    validate: validateCriminalStep,
  },
  {
    title: 'Autocertificazione Antimafia',
    description: 'Verifica i dati usati nell autocertificazione e conferma.',
    validate: validateAntimafiaStep,
  },
  {
    title: 'Firma',
    description: 'Acquisisci la firma grafica e controlla il punto di firma.',
    validate: validateSignatureStep,
  },
  {
    title: 'Riepilogo Finale',
    description: 'Verifica tutto e genera il PDF definitivo.',
    validate: () => true,
  },
];

const state = {
  currentStep: 0,
  selectedTemplateFile: null,
  selectedTemplateName: '',
  selectedTemplateSource: 'auto',
  selectedTemplateDbHash: '',
  currentTemplateHash: '',
  currentTemplateBytes: null,
  templateMapping: null,
  mappingDraft: null,
  currentContractId: '',
  currentContractName: '',
  contractsCache: [],
  savedTemplatesCache: [],
  generatedPdfBytes: null,
  signatureDataUrl: '',
  isDrawing: false,
  lastPoint: null,
  autosaveTimer: null,
};

const elements = {
  appVersion: document.getElementById('appVersion'),
  form: document.getElementById('contractForm'),
  contractType: document.getElementById('contractType'),
  statusBox: document.getElementById('statusBox'),
  templateFile: document.getElementById('templateFile'),
  templateInfo: document.getElementById('templateInfo'),
  btnSaveTemplateToDb: document.getElementById('btnSaveTemplateToDb'),
  btnRefreshSavedTemplates: document.getElementById('btnRefreshSavedTemplates'),
  btnUseSavedTemplate: document.getElementById('btnUseSavedTemplate'),
  savedTemplatesSelect: document.getElementById('savedTemplatesSelect'),
  templateDbStatus: document.getElementById('templateDbStatus'),
  btnOpenMapping: document.getElementById('btnOpenMapping'),
  mappingModal: document.getElementById('mappingModal'),
  mappingTemplateInfo: document.getElementById('mappingTemplateInfo'),
  mappingFilter: document.getElementById('mappingFilter'),
  mappingTextBody: document.getElementById('mappingTextBody'),
  mappingRoleBody: document.getElementById('mappingRoleBody'),
  mappingFiscalBody: document.getElementById('mappingFiscalBody'),
  mappingCriminalNulla: document.getElementById('mappingCriminalNulla'),
  mappingSignatureAnchor: document.getElementById('mappingSignatureAnchor'),
  mappingStatus: document.getElementById('mappingStatus'),
  btnSaveMapping: document.getElementById('btnSaveMapping'),
  btnResetMapping: document.getElementById('btnResetMapping'),
  contractSaveModal: document.getElementById('contractSaveModal'),
  contractSaveName: document.getElementById('contractSaveName'),
  contractSaveStatus: document.getElementById('contractSaveStatus'),
  btnContractSaveNew: document.getElementById('btnContractSaveNew'),
  btnContractSaveUpdate: document.getElementById('btnContractSaveUpdate'),
  contractLoadModal: document.getElementById('contractLoadModal'),
  contractLoadFilter: document.getElementById('contractLoadFilter'),
  btnContractRefresh: document.getElementById('btnContractRefresh'),
  contractLoadList: document.getElementById('contractLoadList'),
  contractLoadStatus: document.getElementById('contractLoadStatus'),
  signatureCanvas: document.getElementById('signatureCanvas'),
  signatureUpload: document.getElementById('signatureUpload'),
  signatureInfo: document.getElementById('signatureInfo'),
  signatureError: document.getElementById('signatureError'),
  btnNuovo: document.getElementById('btnNuovo'),
  btnSalva: document.getElementById('btnSalva'),
  btnCarica: document.getElementById('btnCarica'),
  btnGenera: document.getElementById('btnGenera'),
  btnCaricaFirma: document.getElementById('btnCaricaFirma'),
  btnPulisciFirma: document.getElementById('btnPulisciFirma'),
  btnInserisciFirma: document.getElementById('btnInserisciFirma'),
  btnUsaTemplate: document.getElementById('btnUsaTemplate'),
  btnResetTemplate: document.getElementById('btnResetTemplate'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  wizardTitle: document.getElementById('wizardTitle'),
  wizardDescription: document.getElementById('wizardDescription'),
  completionPercent: document.getElementById('completionPercent'),
  wizardProgressBar: document.getElementById('wizardProgressBar'),
  stepperNav: document.getElementById('stepperNav'),
  wizardSteps: Array.from(document.querySelectorAll('.wizard-step')),
  annexASummary: document.getElementById('annexASummary'),
  antimafiaSummary: document.getElementById('antimafiaSummary'),
  finalSummary: document.getElementById('finalSummary'),
  finalChecklist: document.getElementById('finalChecklist'),
  documentUploads: document.getElementById('documentUploads'),
  documentUploadsMeta: document.getElementById('documentUploadsMeta'),
  documentUploadsInfo: document.getElementById('documentUploadsInfo'),
  documentUploadsError: document.getElementById('documentUploadsError'),
  annexAConfirmedError: document.getElementById('annexAConfirmedError'),
  antimafiaConfirmedError: document.getElementById('antimafiaConfirmedError'),
  criminalNulla: document.getElementById('criminalNulla'),
  criminalTribunal: document.getElementById('criminalTribunal'),
  criminalTribunal2: document.getElementById('criminalTribunal2'),
  criminalRecordNotes: document.getElementById('criminalRecordNotes'),
  pendingChargesNotes: document.getElementById('pendingChargesNotes'),
};

document.addEventListener('DOMContentLoaded', () => {
  renderAppVersion();
  initializeCanvas();
  renderStepper();
  bindEvents();
  setDefaultDates();
  updateTemplateInfo();
  refreshSavedTemplates({ silentErrors: true });
  updateDocumentUploadsMeta();
  toggleCriminalFields();
  loadFromLocalStorage({ silent: true, notifyIfMissing: false });
  refreshUi();
});

function renderAppVersion() {
  if (elements.appVersion) {
    elements.appVersion.textContent = APP_VERSION;
  }
  document.title = `Contract Manager ${APP_VERSION}`;
}

function bindEvents() {
  elements.btnNuovo.addEventListener('click', handleNewForm);
  elements.btnSalva.addEventListener('click', openContractSaveModal);
  elements.btnCarica.addEventListener('click', openContractLoadModal);
  elements.btnGenera.addEventListener('click', async () => {
    const pdfBytes = await buildPdf();
    if (pdfBytes) {
      downloadGeneratedPdf();
    }
  });
  elements.btnCaricaFirma.addEventListener('click', () => {
    elements.signatureUpload.click();
  });
  elements.signatureUpload.addEventListener('change', handleSignatureUpload);
  elements.btnPulisciFirma.addEventListener('click', clearSignatureCanvas);
  elements.btnInserisciFirma.addEventListener('click', captureSignature);
  elements.btnUsaTemplate.addEventListener('click', selectManualTemplate);
  elements.btnResetTemplate.addEventListener('click', resetTemplateSelection);
  elements.templateFile.addEventListener('change', selectManualTemplate);
  elements.btnSaveTemplateToDb.addEventListener('click', saveCurrentTemplateToDb);
  elements.btnRefreshSavedTemplates.addEventListener('click', () => refreshSavedTemplates({ silentErrors: false }));
  elements.btnUseSavedTemplate.addEventListener('click', useSavedTemplateFromDb);
  elements.contractType.addEventListener('change', handleContractTypeChange);
  elements.btnOpenMapping.addEventListener('click', openMappingModal);
  elements.btnSaveMapping.addEventListener('click', saveCurrentMapping);
  elements.btnResetMapping.addEventListener('click', resetMappingToDefault);
  elements.mappingFilter.addEventListener('input', () => renderMappingTables({ preserveSelections: true }));
  elements.btnContractSaveNew.addEventListener('click', saveNewContractToCloud);
  elements.btnContractSaveUpdate.addEventListener('click', updateCurrentContractInCloud);
  elements.btnContractRefresh.addEventListener('click', refreshContractList);
  elements.contractLoadFilter.addEventListener('input', () => renderContractList(state.contractsCache));
  elements.contractLoadList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-contract-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.contractAction;
    const id = button.dataset.contractId;
    if (!id) {
      return;
    }
    if (action === 'load') {
      loadContractFromCloud(id);
      return;
    }
    if (action === 'delete') {
      deleteContractFromCloud(id);
    }
  });
  elements.btnPrev.addEventListener('click', () => goToStep(state.currentStep - 1, { validateCurrent: false }));
  elements.btnNext.addEventListener('click', () => goToStep(state.currentStep + 1, { validateCurrent: true }));
  elements.documentUploads.addEventListener('change', handleDocumentUploadsChange);
  elements.criminalNulla.addEventListener('change', () => {
    toggleCriminalFields();
    validateStep(6, { silent: true });
    triggerAutosave();
    refreshUi();
  });

  elements.form.addEventListener('input', handleFormInteraction);
  elements.form.addEventListener('change', handleFormInteraction);
}

function renderStepper() {
  elements.stepperNav.innerHTML = STEP_DEFINITIONS.map((step, index) => `
    <button type="button" class="step-nav" data-target-step="${index}">
      <span class="step-nav__index">${index + 1}</span>
      <span>
        <span class="step-nav__title">${escapeHtml(step.title)}</span>
        <span class="step-nav__status">Dopo</span>
      </span>
    </button>
  `).join('');

  elements.stepperNav.querySelectorAll('[data-target-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetStep = Number(button.dataset.targetStep);
      if (targetStep > state.currentStep) {
        goToStep(targetStep, { validateCurrent: true });
        return;
      }
      goToStep(targetStep, { validateCurrent: false });
    });
  });
}

function handleFormInteraction(event) {
  const target = event.target;
  if (!target.name && target.id !== 'placeAndDate') {
    return;
  }

  if (target.matches('input, textarea, select')) {
    validateRelatedField(target, { silent: true });
    if (target.type !== 'file') {
      resetGeneratedPdf();
    }
    triggerAutosave();
    refreshUi();
  }
}

function handleContractTypeChange() {
  resetTemplateSelection({ silent: true });
  state.currentTemplateHash = '';
  state.currentTemplateBytes = null;
  state.templateMapping = null;
  state.mappingDraft = null;
  state.currentContractId = '';
  state.currentContractName = '';
  state.contractsCache = [];
  state.savedTemplatesCache = [];
  updateTemplateInfo();
  resetGeneratedPdf();
  triggerAutosave();
  refreshUi();
  setStatus(`Contratto selezionato: ${getCurrentContractConfig().label}.`, 'secondary');
}

function initializeCanvas() {
  const ctx = elements.signatureCanvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#111';

  const start = (event) => {
    state.isDrawing = true;
    state.lastPoint = getCanvasPoint(event);
  };

  const move = (event) => {
    if (!state.isDrawing) {
      return;
    }
    event.preventDefault();
    const point = getCanvasPoint(event);
    ctx.beginPath();
    ctx.moveTo(state.lastPoint.x, state.lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    state.lastPoint = point;
  };

  const end = () => {
    state.isDrawing = false;
    state.lastPoint = null;
  };

  elements.signatureCanvas.addEventListener('mousedown', start);
  elements.signatureCanvas.addEventListener('mousemove', move);
  elements.signatureCanvas.addEventListener('mouseup', end);
  elements.signatureCanvas.addEventListener('mouseleave', end);
  elements.signatureCanvas.addEventListener('touchstart', start, { passive: false });
  elements.signatureCanvas.addEventListener('touchmove', move, { passive: false });
  elements.signatureCanvas.addEventListener('touchend', end);
  elements.signatureCanvas.addEventListener('touchcancel', end);
}

function getCanvasPoint(event) {
  const rect = elements.signatureCanvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;
  const scaleX = elements.signatureCanvas.width / rect.width;
  const scaleY = elements.signatureCanvas.height / rect.height;

  return {
    x: (source.clientX - rect.left) * scaleX,
    y: (source.clientY - rect.top) * scaleY,
  };
}

function clearSignatureCanvas(options = {}) {
  const ctx = elements.signatureCanvas.getContext('2d');
  ctx.clearRect(0, 0, elements.signatureCanvas.width, elements.signatureCanvas.height);
  state.signatureDataUrl = '';
  elements.signatureInfo.textContent = 'Nessuna firma acquisita.';
  elements.signatureError.textContent = '';
  if (!options.silent) {
    setStatus('Firma cancellata dal canvas.', 'secondary');
  }
  resetGeneratedPdf();
  triggerAutosave();
  refreshUi();
}

function captureSignature() {
  if (isCanvasBlank()) {
    elements.signatureError.textContent = 'Disegna prima una firma valida.';
    setStatus('Disegna prima una firma sul canvas.', 'warning');
    return;
  }

  state.signatureDataUrl = elements.signatureCanvas.toDataURL('image/png');
  elements.signatureInfo.textContent = 'Firma acquisita e pronta per essere inserita nel PDF.';
  elements.signatureError.textContent = '';
  resetGeneratedPdf();
  triggerAutosave();
  refreshUi();
  setStatus('Firma acquisita correttamente.', 'success');
}

function isCanvasBlank() {
  const ctx = elements.signatureCanvas.getContext('2d');
  const pixels = ctx.getImageData(0, 0, elements.signatureCanvas.width, elements.signatureCanvas.height).data;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] !== 0) {
      return false;
    }
  }
  return true;
}

function setDefaultDates() {
}

async function handleSignatureUpload() {
  const [file] = elements.signatureUpload.files;
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    elements.signatureError.textContent = 'Carica un file immagine valido.';
    setStatus('Formato firma non valido: scegli un immagine.', 'warning');
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    await drawImageDataUrlOnSignatureCanvas(dataUrl);
    state.signatureDataUrl = elements.signatureCanvas.toDataURL('image/png');
    elements.signatureInfo.textContent = `Firma caricata da immagine: ${file.name}`;
    elements.signatureError.textContent = '';
    resetGeneratedPdf();
    triggerAutosave();
    refreshUi();
    setStatus('Immagine firma caricata correttamente.', 'success');
  } catch (error) {
    elements.signatureError.textContent = 'Impossibile caricare l immagine della firma.';
    setStatus(elements.signatureError.textContent, 'danger');
  } finally {
    elements.signatureUpload.value = '';
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Errore lettura file'));
    reader.readAsDataURL(file);
  });
}

async function drawImageDataUrlOnSignatureCanvas(dataUrl) {
  const image = await loadImageFromDataUrl(dataUrl);
  const canvas = elements.signatureCanvas;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padding = 16;
  const maxWidth = canvas.width - padding * 2;
  const maxHeight = canvas.height - padding * 2;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (canvas.width - drawWidth) / 2;
  const y = (canvas.height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function handleNewForm() {
  elements.form.reset();
  state.selectedTemplateFile = null;
  state.selectedTemplateName = '';
  state.selectedTemplateSource = 'auto';
  state.selectedTemplateDbHash = '';
  state.currentContractId = '';
  state.currentContractName = '';
  elements.templateFile.value = '';
  elements.contractType.value = 'pvr-vincitu';
  document.getElementById('roleLegale').checked = true;
  setDefaultDates();
  updateDocumentUploadsMeta();
  clearValidation();
  clearSignatureCanvas({ silent: true });
  toggleCriminalFields();
  resetGeneratedPdf();
  updateTemplateInfo();
  state.currentStep = 0;
  refreshUi();
  saveToLocalStorage({ silent: true });
  setStatus('Procedura azzerata. Puoi ricominciare dalla fase 1.', 'secondary');
}

function triggerAutosave() {
  updateAutosaveIndicator('saving');
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = window.setTimeout(() => {
    saveToLocalStorage({ silent: true });
  }, 350);
}

function saveToLocalStorage({ silent = false } = {}) {
  const payload = collectFormData();
  payload.signatureDataUrl = state.signatureDataUrl;
  payload.currentStep = state.currentStep;
  payload.selectedTemplateName = state.selectedTemplateName;
  payload.selectedTemplateSource = state.selectedTemplateSource;
  payload.selectedTemplateDbHash = state.selectedTemplateDbHash;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  updateAutosaveIndicator('saved');
  if (!silent) {
    setStatus('Dati salvati nel LocalStorage del browser.', 'success');
  }
}

function loadFromLocalStorage({ silent = false, notifyIfMissing = true } = {}) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    if (notifyIfMissing && !silent) {
      setStatus('Nessun salvataggio trovato nel LocalStorage.', 'warning');
    }
    return;
  }

  try {
    const data = JSON.parse(raw);
    populateForm(data);
    if (data.signatureDataUrl) {
      restoreSignature(data.signatureDataUrl);
      state.signatureDataUrl = data.signatureDataUrl;
      elements.signatureInfo.textContent = 'Firma ripristinata dal LocalStorage.';
    } else {
      clearSignatureCanvas({ silent: true });
    }
    state.selectedTemplateName = sanitizeText(data.selectedTemplateName);
    state.selectedTemplateSource = sanitizeText(data.selectedTemplateSource) || 'auto';
    state.selectedTemplateDbHash = sanitizeText(data.selectedTemplateDbHash);
    updateDocumentUploadsMeta();
    toggleCriminalFields();
    clearValidation();
    resetGeneratedPdf();
    updateTemplateInfo();
    state.currentStep = clampStep(Number(data.currentStep) || 0);
    refreshUi();
    updateAutosaveIndicator('saved');
    if (!silent) {
      setStatus('Dati caricati dal LocalStorage.', 'success');
    }
  } catch (error) {
    console.error(error);
    if (!silent) {
      setStatus('Errore durante il caricamento dei dati salvati.', 'danger');
    }
  }
}

function collectFormData() {
  const formData = new FormData(elements.form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      continue;
    }
    data[key] = value;
  }

  data.roleType = document.querySelector('input[name="roleType"]:checked')?.value || 'legale-rappresentante';
  data.fiscalRegime = document.querySelector('input[name="fiscalRegime"]:checked')?.value || '';
  data.criminalNulla = elements.criminalNulla.checked;
  data.annexAConfirmed = document.getElementById('annexAConfirmed').checked;
  data.antimafiaConfirmed = document.getElementById('antimafiaConfirmed').checked;
  data.vatNumber = sanitizeText(data.vatOrTaxCode);
  data.companyTaxCode = sanitizeText(data.vatOrTaxCode);
  return data;
}

function populateForm(data) {
  Object.entries(data).forEach(([key, value]) => {
    const fields = elements.form.querySelectorAll(`[name="${CSS.escape(key)}"]`);
    if (!fields.length) {
      return;
    }

    const firstField = fields[0];
    if (firstField.type === 'radio') {
      const radio = elements.form.querySelector(`input[name="${CSS.escape(key)}"][value="${CSS.escape(String(value))}"]`);
      if (radio) {
        radio.checked = true;
      }
      return;
    }

    if (firstField.type === 'checkbox') {
      firstField.checked = normalizeBoolean(value);
      return;
    }

    firstField.value = value ?? '';
  });
}

function restoreSignature(dataUrl) {
  const image = new Image();
  image.onload = () => {
    const ctx = elements.signatureCanvas.getContext('2d');
    ctx.clearRect(0, 0, elements.signatureCanvas.width, elements.signatureCanvas.height);
    ctx.drawImage(image, 0, 0, elements.signatureCanvas.width, elements.signatureCanvas.height);
  };
  image.src = dataUrl;
}

async function selectManualTemplate() {
  const [file] = elements.templateFile.files;
  if (!file) {
    state.selectedTemplateFile = null;
    state.selectedTemplateName = '';
    state.selectedTemplateSource = 'auto';
    state.selectedTemplateDbHash = '';
    updateTemplateInfo();
    return;
  }

  state.selectedTemplateFile = file;
  state.selectedTemplateName = file.name;
  state.selectedTemplateSource = 'local';
  state.selectedTemplateDbHash = '';
  updateTemplateInfo();
  triggerAutosave();
  setStatus(`Template selezionato manualmente: ${file.name}`, 'success');
}

function resetTemplateSelection(options = {}) {
  state.selectedTemplateFile = null;
  state.selectedTemplateName = '';
  state.selectedTemplateSource = 'auto';
  state.selectedTemplateDbHash = '';
  elements.templateFile.value = '';
  updateTemplateInfo();
  if (!options.silent) {
    triggerAutosave();
    setStatus('Selezione manuale rimossa. Verra usato il template automatico del contratto selezionato.', 'secondary');
  }
}

function updateTemplateInfo() {
  const contractConfig = getCurrentContractConfig();
  if (state.selectedTemplateSource === 'db' && state.selectedTemplateDbHash) {
    elements.templateInfo.textContent = `Template in uso: ${state.selectedTemplateName || state.selectedTemplateDbHash} (dal database per ${contractConfig.label}).`;
    return;
  }

  if (state.selectedTemplateFile) {
    elements.templateInfo.textContent = `Template in uso: ${state.selectedTemplateName} (selezione manuale per ${contractConfig.label}).`;
    return;
  }

  elements.templateInfo.textContent = `Template automatico da ${contractConfig.directory}: ${contractConfig.templateCandidates.join(', ')}.`;
}

async function refreshSavedTemplates({ silentErrors } = {}) {
  if (!elements.savedTemplatesSelect) {
    return;
  }

  try {
    elements.templateDbStatus.textContent = 'Caricamento template dal database...';
    const params = new URLSearchParams({ contractType: elements.contractType.value });
    const response = await fetch(`/api/templates?${params}`);
    if (!response.ok) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore caricamento template dal database.');
    }
    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    state.savedTemplatesCache = items;

    if (!items.length) {
      elements.savedTemplatesSelect.innerHTML = `<option value="">— Nessun template salvato —</option>`;
      elements.templateDbStatus.textContent = 'Nessun template salvato.';
      return;
    }

    elements.savedTemplatesSelect.innerHTML = [
      `<option value="">— Seleziona un template —</option>`,
      ...items.map((item) => {
        const labelParts = [sanitizeText(item.template_name)];
        const size = item.size ? `${item.size} B` : '';
        const updated = item.updated_at ? formatTimestamp(item.updated_at) : '';
        const meta = [size, updated].filter(Boolean).join(' • ');
        return `<option value="${escapeHtml(item.template_hash)}">${escapeHtml(labelParts.join(''))}${meta ? ` (${escapeHtml(meta)})` : ''}</option>`;
      }),
    ].join('');
    elements.templateDbStatus.textContent = `${items.length} template trovati.`;
  } catch (error) {
    elements.templateDbStatus.textContent = error.message || 'Errore caricamento template.';
    if (!silentErrors) {
      setStatus(elements.templateDbStatus.textContent, 'danger');
    }
    elements.savedTemplatesSelect.innerHTML = `<option value="">— Errore caricamento —</option>`;
    state.savedTemplatesCache = [];
  }
}

function useSavedTemplateFromDb() {
  const selectedHash = sanitizeText(elements.savedTemplatesSelect.value);
  if (!selectedHash) {
    setStatus('Seleziona prima un template salvato dal database.', 'warning');
    return;
  }

  const item = (state.savedTemplatesCache || []).find((row) => sanitizeText(row.template_hash) === selectedHash);
  state.selectedTemplateFile = null;
  state.selectedTemplateSource = 'db';
  state.selectedTemplateDbHash = selectedHash;
  state.selectedTemplateName = sanitizeText(item?.template_name) || selectedHash;
  updateTemplateInfo();
  resetGeneratedPdf();
  triggerAutosave();
  setStatus(`Template selezionato dal database: ${state.selectedTemplateName}`, 'success');
}

async function saveCurrentTemplateToDb() {
  try {
    elements.templateDbStatus.textContent = 'Preparazione template...';
    const bytes = await loadTemplateBytes();
    if (!state.currentTemplateHash) {
      elements.templateDbStatus.textContent = 'SHA-256 del template non disponibile.';
      return;
    }
    if (state.selectedTemplateSource === 'db' && state.selectedTemplateDbHash === state.currentTemplateHash) {
      elements.templateDbStatus.textContent = 'Questo template è già in uso dal database.';
      return;
    }

    elements.templateDbStatus.textContent = 'Salvataggio template nel database...';
    const params = new URLSearchParams({
      templateHash: state.currentTemplateHash,
      contractType: elements.contractType.value,
      templateName: state.selectedTemplateName || state.currentTemplateHash,
    });

    const response = await fetch(`/api/templates?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'x-template-hash': state.currentTemplateHash,
      },
      body: bytes,
    });

    if (!response.ok) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore salvataggio template nel database.');
    }

    elements.templateDbStatus.textContent = 'Template salvato.';
    setStatus('Template PDF salvato nel database.', 'success');
    await refreshSavedTemplates({ silentErrors: true });
  } catch (error) {
    elements.templateDbStatus.textContent = error.message || 'Errore salvataggio template.';
    setStatus(elements.templateDbStatus.textContent, 'danger');
  }
}

function getDefaultTemplateMapping() {
  const text = {
    ...TEXT_FIELD_MAPPING,
    vatNumber: 'partita-iva',
    criminalCombinedNotes: 'a-proprio-carico-2',
    representativeFullName: 'nome-e-cognome-titolare',
    operationalCityComposite: 'citta-sede-operativa',
    placeAndDate: 'luogo-e-data',
  };

  const checkboxGroups = {
    roleType: {},
    fiscalRegime: {},
  };

  ROLE_CHECKBOXES.forEach((value) => {
    checkboxGroups.roleType[value] = value;
  });

  REGIME_CHECKBOXES.forEach((value) => {
    checkboxGroups.fiscalRegime[value] = value;
  });

  return {
    version: 1,
    text,
    checkboxGroups,
    checkboxes: {
      criminalNulla: 'nulla',
      criminalOppure: 'oppure',
      criminalOppure2: 'oppure-2',
    },
    signature: {
      anchorTextField: 'luogo-e-data',
    },
  };
}

function mergeDeep(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) {
    return base;
  }
  const result = { ...(base && typeof base === 'object' ? base : {}) };
  Object.entries(override).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeDeep(result[key], value);
      return;
    }
    result[key] = value;
  });
  return result;
}

function getActiveTemplateMapping() {
  return mergeDeep(getDefaultTemplateMapping(), state.templateMapping || {});
}

async function computeSha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function setTemplateContext(templateBytes, templateName) {
  state.currentTemplateBytes = templateBytes;
  if (!window.crypto?.subtle) {
    return;
  }

  const templateHash = await computeSha256Hex(templateBytes);
  if (!templateHash || templateHash === state.currentTemplateHash) {
    return;
  }

  state.currentTemplateHash = templateHash;
  try {
    const mapping = await fetchTemplateMapping(templateHash);
    state.templateMapping = mapping;
  } catch (error) {
    state.templateMapping = null;
  }
}

async function fetchTemplateMapping(templateHash) {
  const params = new URLSearchParams({
    templateHash,
    contractType: elements.contractType.value,
  });
  const response = await fetch(`/api/template-mappings?${params}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const body = await safeJson(response);
    throw new Error(body?.error || 'Errore nel recupero della mappa dal database');
  }
  const row = await response.json();
  return row.mapping || null;
}

async function upsertTemplateMapping(templateHash, mapping) {
  const response = await fetch('/api/template-mappings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateHash,
      contractType: elements.contractType.value,
      templateName: state.selectedTemplateName || templateHash,
      mapping,
    }),
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new Error(body?.error || 'Errore nel salvataggio della mappa nel database');
  }

  const row = await response.json();
  return row.mapping || mapping;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function openMappingModal() {
  try {
    elements.mappingStatus.textContent = 'Caricamento campi dal template...';
    const templateBytes = await loadTemplateBytes();
    const { textFieldNames, checkboxFieldNames } = await inspectTemplateFields(templateBytes);
    state.mappingDraft = mergeDeep(getDefaultTemplateMapping(), state.templateMapping || {});

    elements.mappingTemplateInfo.textContent = `Template: ${state.selectedTemplateName || 'manuale'} | SHA-256: ${state.currentTemplateHash || 'non disponibile'} | Testo: ${textFieldNames.length} | Checkbox: ${checkboxFieldNames.length}`;
    elements.mappingStatus.textContent = state.templateMapping ? 'Mappa caricata dal database.' : 'Nessuna mappa trovata nel database: stai usando i default.';

    elements.mappingTextBody.dataset.textFields = JSON.stringify(textFieldNames);
    elements.mappingTextBody.dataset.checkboxFields = JSON.stringify(checkboxFieldNames);
    renderMappingTables({ preserveSelections: false });

    const modal = window.bootstrap.Modal.getOrCreateInstance(elements.mappingModal);
    modal.show();
  } catch (error) {
    setStatus(error.message || 'Errore apertura mappatura campi.', 'danger');
  }
}

async function inspectTemplateFields(templateBytes) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const textFieldNames = [];
  const checkboxFieldNames = [];

  fields.forEach((field) => {
    const name = field.getName();
    if (typeof field.setText === 'function') {
      textFieldNames.push(name);
      return;
    }
    if (typeof field.check === 'function' && typeof field.uncheck === 'function') {
      checkboxFieldNames.push(name);
    }
  });

  textFieldNames.sort((a, b) => a.localeCompare(b));
  checkboxFieldNames.sort((a, b) => a.localeCompare(b));
  return { textFieldNames, checkboxFieldNames };
}

function getWizardTextFieldNames() {
  const inputs = Array.from(elements.form.querySelectorAll('input[name], select[name], textarea[name]'));
  const names = inputs
    .filter((el) => el.type !== 'file' && el.type !== 'checkbox' && el.type !== 'radio')
    .map((el) => el.name)
    .filter(Boolean);

  const unique = Array.from(new Set(names));
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}

function getLabelForName(name) {
  const field = elements.form.querySelector(`[name="${CSS.escape(name)}"]`);
  const id = field?.id;
  const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
  const labelText = sanitizeText(label?.textContent);
  return labelText || name;
}

function buildSelectOptions(names, selectedValue) {
  const selected = sanitizeText(selectedValue);
  const options = [];
  options.push(`<option value="">—</option>`);
  const set = new Set(names);
  if (selected && !set.has(selected)) {
    options.push(`<option value="${escapeHtml(selected)}">${escapeHtml(selected)} (non trovato)</option>`);
  }
  names.forEach((name) => {
    const safe = escapeHtml(name);
    options.push(`<option value="${safe}">${safe}</option>`);
  });
  return options.join('');
}

function renderMappingTables({ preserveSelections } = {}) {
  if (!state.mappingDraft) {
    return;
  }

  const textFieldNames = safeParseArray(elements.mappingTextBody.dataset.textFields);
  const checkboxFieldNames = safeParseArray(elements.mappingTextBody.dataset.checkboxFields);
  const filterValue = sanitizeText(elements.mappingFilter.value).toLowerCase();

  const textRows = [];
  const wizardTextNames = getWizardTextFieldNames();
  const extraTextKeys = [
    { key: 'representativeFullName', label: 'Nome e cognome (composto)' },
    { key: 'operationalCityComposite', label: 'Sede operativa (CAP Comune Provincia)' },
    { key: 'placeAndDate', label: 'Luogo e data' },
  ];

  const allTextKeys = [
    ...wizardTextNames.map((name) => ({ key: name, label: getLabelForName(name) })),
    ...extraTextKeys,
  ];

  allTextKeys.forEach(({ key, label }) => {
    const normalizedKey = sanitizeText(key);
    const normalizedLabel = sanitizeText(label);
    if (filterValue && !normalizedKey.toLowerCase().includes(filterValue) && !normalizedLabel.toLowerCase().includes(filterValue)) {
      return;
    }

    const currentValue = preserveSelections
      ? elements.mappingTextBody.querySelector(`[data-map-text="${CSS.escape(normalizedKey)}"]`)?.value
      : state.mappingDraft.text[normalizedKey] || '';

    textRows.push(`
      <tr>
        <td>
          <div class="fw-semibold">${escapeHtml(normalizedLabel)}</div>
          <div class="text-secondary small">${escapeHtml(normalizedKey)}</div>
        </td>
        <td>
          <select class="form-select form-select-sm" data-map-text="${escapeHtml(normalizedKey)}">
            ${buildSelectOptions(textFieldNames, currentValue)}
          </select>
        </td>
      </tr>
    `);
  });

  elements.mappingTextBody.innerHTML = textRows.join('') || `
    <tr>
      <td colspan="2" class="text-secondary">Nessun campo corrisponde al filtro.</td>
    </tr>
  `;

  elements.mappingTextBody.querySelectorAll('select[data-map-text]').forEach((select) => {
    const key = select.dataset.mapText;
    select.value = sanitizeText(select.value);
    select.addEventListener('change', () => {
      state.mappingDraft.text[key] = select.value;
    });
  });

  renderCheckboxGroupMapping(elements.mappingRoleBody, 'roleType', checkboxFieldNames, preserveSelections);
  renderCheckboxGroupMapping(elements.mappingFiscalBody, 'fiscalRegime', checkboxFieldNames, preserveSelections);

  const currentCriminal = preserveSelections ? elements.mappingCriminalNulla.value : state.mappingDraft.checkboxes.criminalNulla;
  elements.mappingCriminalNulla.innerHTML = buildSelectOptions(checkboxFieldNames, currentCriminal);
  elements.mappingCriminalNulla.value = sanitizeText(currentCriminal);
  elements.mappingCriminalNulla.onchange = () => {
    state.mappingDraft.checkboxes.criminalNulla = elements.mappingCriminalNulla.value;
  };

  const currentAnchor = preserveSelections ? elements.mappingSignatureAnchor.value : state.mappingDraft.signature.anchorTextField;
  elements.mappingSignatureAnchor.innerHTML = buildSelectOptions(textFieldNames, currentAnchor);
  elements.mappingSignatureAnchor.value = sanitizeText(currentAnchor);
  elements.mappingSignatureAnchor.onchange = () => {
    state.mappingDraft.signature.anchorTextField = elements.mappingSignatureAnchor.value;
  };
}

function renderCheckboxGroupMapping(container, groupName, checkboxFieldNames, preserveSelections) {
  const radios = Array.from(elements.form.querySelectorAll(`input[type="radio"][name="${CSS.escape(groupName)}"]`));
  const rows = radios.map((radio) => {
    const value = sanitizeText(radio.value);
    const label = sanitizeText(radio.closest('label')?.textContent) || value;
    const currentValue = preserveSelections
      ? container.querySelector(`[data-map-group="${CSS.escape(groupName)}"][data-map-value="${CSS.escape(value)}"]`)?.value
      : state.mappingDraft.checkboxGroups[groupName]?.[value] || '';
    return `
      <div class="d-flex gap-2 align-items-center">
        <div class="small text-secondary" style="min-width: 180px;">${escapeHtml(label)}</div>
        <select class="form-select form-select-sm" data-map-group="${escapeHtml(groupName)}" data-map-value="${escapeHtml(value)}">
          ${buildSelectOptions(checkboxFieldNames, currentValue)}
        </select>
      </div>
    `;
  });

  container.innerHTML = rows.join('') || `<div class="text-secondary small">Nessuna opzione trovata.</div>`;
  container.querySelectorAll('select[data-map-group]').forEach((select) => {
    const group = select.dataset.mapGroup;
    const value = select.dataset.mapValue;
    select.value = sanitizeText(select.value);
    select.addEventListener('change', () => {
      if (!state.mappingDraft.checkboxGroups[group]) {
        state.mappingDraft.checkboxGroups[group] = {};
      }
      state.mappingDraft.checkboxGroups[group][value] = select.value;
    });
  });
}

function safeParseArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function resetMappingToDefault() {
  state.mappingDraft = getDefaultTemplateMapping();
  renderMappingTables({ preserveSelections: false });
  elements.mappingStatus.textContent = 'Default ripristinati (non ancora salvati).';
}

async function saveCurrentMapping() {
  if (!state.mappingDraft) {
    return;
  }
  if (!state.currentTemplateHash) {
    elements.mappingStatus.textContent = 'SHA-256 del template non disponibile. Prova a ricaricare il template.';
    return;
  }

  try {
    elements.mappingStatus.textContent = 'Salvataggio nel database...';
    const saved = await upsertTemplateMapping(state.currentTemplateHash, state.mappingDraft);
    state.templateMapping = saved;
    elements.mappingStatus.textContent = 'Mappa salvata correttamente.';
    setStatus('Mappatura campi salvata nel database.', 'success');
  } catch (error) {
    elements.mappingStatus.textContent = error.message || 'Errore salvataggio mappa.';
    setStatus(elements.mappingStatus.textContent, 'danger');
  }
}

function applyExclusiveGroup(fields, mapping, selectedValue) {
  const groupMapping = mapping && typeof mapping === 'object' ? mapping : {};
  Object.values(groupMapping).forEach((fieldName) => {
    const field = fields.get(fieldName);
    if (!field || typeof field.check !== 'function') {
      return;
    }
    field.uncheck();
  });

  const targetFieldName = sanitizeText(groupMapping?.[selectedValue]);
  if (!targetFieldName) {
    return;
  }

  const targetField = fields.get(targetFieldName);
  if (!targetField || typeof targetField.check !== 'function') {
    return;
  }
  targetField.check();
}

function openContractSaveModal() {
  const defaultName = buildDefaultContractName();
  elements.contractSaveName.value = state.currentContractName || defaultName;
  elements.contractSaveStatus.textContent = 'Pronto.';
  elements.btnContractSaveUpdate.disabled = !state.currentContractId;
  const modal = window.bootstrap.Modal.getOrCreateInstance(elements.contractSaveModal);
  modal.show();
}

async function openContractLoadModal() {
  elements.contractLoadFilter.value = '';
  elements.contractLoadStatus.textContent = 'Caricamento elenco...';
  await refreshContractList({ silentErrors: false });
  const modal = window.bootstrap.Modal.getOrCreateInstance(elements.contractLoadModal);
  modal.show();
}

function buildDefaultContractName() {
  const data = collectFormData();
  const company = sanitizeText(data.companyName);
  const vat = sanitizeText(data.vatOrTaxCode);
  const date = new Date();
  const dateLabel = date.toLocaleDateString('it-IT');
  const parts = [company, vat ? `PIVA ${vat}` : '', dateLabel].filter(Boolean);
  return parts.join(' - ') || `Contratto - ${dateLabel}`;
}

function buildContractPayload() {
  const payload = collectFormData();
  payload.signatureDataUrl = state.signatureDataUrl;
  payload.currentStep = state.currentStep;
  payload.selectedTemplateName = state.selectedTemplateName;
  payload.selectedTemplateSource = state.selectedTemplateSource;
  payload.selectedTemplateDbHash = state.selectedTemplateDbHash;
  payload.contractType = elements.contractType.value;
  payload.appVersion = APP_VERSION;
  return payload;
}

async function saveNewContractToCloud() {
  const name = sanitizeText(elements.contractSaveName.value) || buildDefaultContractName();
  const id = generateId();

  try {
    elements.contractSaveStatus.textContent = 'Salvataggio...';
    const row = await upsertContractToCloud({ id, name, payload: buildContractPayload() });
    state.currentContractId = row.id;
    state.currentContractName = row.name;
    elements.btnContractSaveUpdate.disabled = false;
    elements.contractSaveStatus.textContent = 'Salvato.';
    setStatus(`Contratto salvato: ${row.name}`, 'success');
    saveToLocalStorage({ silent: true });
    await refreshContractList({ silentErrors: true });
  } catch (error) {
    elements.contractSaveStatus.textContent = error.message || 'Errore salvataggio.';
    setStatus(elements.contractSaveStatus.textContent, 'danger');
  }
}

async function updateCurrentContractInCloud() {
  if (!state.currentContractId) {
    return;
  }

  const name = sanitizeText(elements.contractSaveName.value) || state.currentContractName || buildDefaultContractName();
  try {
    elements.contractSaveStatus.textContent = 'Aggiornamento...';
    const row = await upsertContractToCloud({ id: state.currentContractId, name, payload: buildContractPayload() });
    state.currentContractName = row.name;
    elements.contractSaveStatus.textContent = 'Aggiornato.';
    setStatus(`Contratto aggiornato: ${row.name}`, 'success');
    saveToLocalStorage({ silent: true });
    await refreshContractList({ silentErrors: true });
  } catch (error) {
    elements.contractSaveStatus.textContent = error.message || 'Errore aggiornamento.';
    setStatus(elements.contractSaveStatus.textContent, 'danger');
  }
}

async function upsertContractToCloud({ id, name, payload }) {
  const response = await fetch('/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      contractType: elements.contractType.value,
      name,
      payload,
    }),
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new Error(body?.error || 'Errore salvataggio contratto.');
  }

  return response.json();
}

async function refreshContractList({ silentErrors } = {}) {
  try {
    const params = new URLSearchParams({ contractType: elements.contractType.value });
    const response = await fetch(`/api/contracts?${params}`);
    if (!response.ok) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore caricamento elenco contratti.');
    }
    const data = await response.json();
    state.contractsCache = Array.isArray(data.items) ? data.items : [];
    renderContractList(state.contractsCache);
    elements.contractLoadStatus.textContent = `${state.contractsCache.length} contratti trovati.`;
  } catch (error) {
    elements.contractLoadStatus.textContent = error.message || 'Errore caricamento.';
    if (!silentErrors) {
      setStatus(elements.contractLoadStatus.textContent, 'danger');
    }
    renderContractList([]);
  }
}

function renderContractList(items) {
  const filter = sanitizeText(elements.contractLoadFilter.value).toLowerCase();
  const filtered = (items || []).filter((item) => {
    const name = sanitizeText(item.name).toLowerCase();
    return !filter || name.includes(filter);
  });

  if (!filtered.length) {
    elements.contractLoadList.innerHTML = `<div class="text-secondary">Nessun contratto trovato.</div>`;
    return;
  }

  elements.contractLoadList.innerHTML = filtered.map((item) => {
    const updated = formatTimestamp(item.updated_at);
    const subtitle = updated ? `Aggiornato: ${updated}` : '';
    return `
      <div class="list-group-item d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between">
        <div>
          <div class="fw-semibold">${escapeHtml(item.name || 'Senza nome')}</div>
          <div class="small text-secondary">${escapeHtml(subtitle)}</div>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-primary" data-contract-action="load" data-contract-id="${escapeHtml(item.id)}">Carica</button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-contract-action="delete" data-contract-id="${escapeHtml(item.id)}">Elimina</button>
        </div>
      </div>
    `;
  }).join('');
}

async function loadContractFromCloud(id) {
  try {
    elements.contractLoadStatus.textContent = 'Caricamento contratto...';
    const response = await fetch(`/api/contracts/${encodeURIComponent(id)}`);
    if (!response.ok) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore caricamento contratto.');
    }
    const row = await response.json();
    applyContractPayload(row);
    elements.contractLoadStatus.textContent = `Caricato: ${row.name}`;
    setStatus(`Contratto caricato: ${row.name}`, 'success');
    const modal = window.bootstrap.Modal.getOrCreateInstance(elements.contractLoadModal);
    modal.hide();
  } catch (error) {
    elements.contractLoadStatus.textContent = error.message || 'Errore caricamento.';
    setStatus(elements.contractLoadStatus.textContent, 'danger');
  }
}

async function deleteContractFromCloud(id) {
  const confirmed = window.confirm('Vuoi eliminare questo contratto salvato?');
  if (!confirmed) {
    return;
  }

  try {
    elements.contractLoadStatus.textContent = 'Eliminazione...';
    const response = await fetch(`/api/contracts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore eliminazione contratto.');
    }
    state.contractsCache = state.contractsCache.filter((item) => item.id !== id);
    renderContractList(state.contractsCache);
    elements.contractLoadStatus.textContent = 'Eliminato.';
    if (state.currentContractId === id) {
      state.currentContractId = '';
      state.currentContractName = '';
    }
    setStatus('Contratto eliminato.', 'secondary');
  } catch (error) {
    elements.contractLoadStatus.textContent = error.message || 'Errore eliminazione.';
    setStatus(elements.contractLoadStatus.textContent, 'danger');
  }
}

function applyContractPayload(row) {
  const payload = row?.payload || {};
  const contractType = sanitizeText(row?.contract_type || payload.contractType) || 'pvr-vincitu';

  elements.form.reset();
  clearValidation();
  clearSignatureCanvas({ silent: true });
  state.signatureDataUrl = '';

  elements.contractType.value = contractType;
  resetTemplateSelection({ silent: true });
  state.currentTemplateHash = '';
  state.currentTemplateBytes = null;
  state.templateMapping = null;
  state.mappingDraft = null;
  updateTemplateInfo();

  populateForm(payload);
  if (payload.signatureDataUrl) {
    restoreSignature(payload.signatureDataUrl);
    state.signatureDataUrl = payload.signatureDataUrl;
    elements.signatureInfo.textContent = 'Firma ripristinata dal contratto salvato.';
  }

  state.selectedTemplateName = sanitizeText(payload.selectedTemplateName);
  state.selectedTemplateSource = sanitizeText(payload.selectedTemplateSource) || 'auto';
  state.selectedTemplateDbHash = sanitizeText(payload.selectedTemplateDbHash);
  updateTemplateInfo();
  state.currentStep = clampStep(Number(payload.currentStep) || 0);
  state.currentContractId = sanitizeText(row.id);
  state.currentContractName = sanitizeText(row.name);

  updateDocumentUploadsMeta();
  toggleCriminalFields();
  resetGeneratedPdf();
  refreshUi();
  saveToLocalStorage({ silent: true });
}

function formatTimestamp(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('it-IT');
}

function generateId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const random = Math.random().toString(16).slice(2);
  return `c_${Date.now().toString(16)}_${random}`;
}

function handleDocumentUploadsChange() {
  updateDocumentUploadsMeta();
  validateDocumentUploads({ silent: true });
  resetGeneratedPdf();
  triggerAutosave();
  refreshUi();
}

function updateDocumentUploadsMeta() {
  const files = Array.from(elements.documentUploads.files || []);
  const label = files.map((file) => file.name).join(', ');
  elements.documentUploadsMeta.value = label;
  elements.documentUploadsInfo.textContent = label || 'Nessun file selezionato.';
}

function toggleCriminalFields() {
  const disabled = elements.criminalNulla.checked;
  elements.criminalTribunal.disabled = disabled;
  elements.criminalTribunal2.disabled = disabled;
  elements.criminalRecordNotes.disabled = disabled;
  elements.pendingChargesNotes.disabled = disabled;
  if (disabled) {
    clearInvalid(elements.criminalTribunal);
    clearInvalid(elements.criminalTribunal2);
    clearInvalid(elements.criminalRecordNotes);
    clearInvalid(elements.pendingChargesNotes);
  }
}

function goToStep(stepIndex, { validateCurrent = true } = {}) {
  const targetStep = clampStep(stepIndex);
  if (targetStep === state.currentStep) {
    return;
  }

  if (validateCurrent && targetStep > state.currentStep) {
    validateStep(state.currentStep, { silent: false });
  }

  state.currentStep = targetStep;
  refreshUi();
  triggerAutosave();
  scrollWizardTop();
}

function clampStep(stepIndex) {
  return Math.max(0, Math.min(STEP_DEFINITIONS.length - 1, stepIndex));
}

function scrollWizardTop() {
  elements.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function refreshUi() {
  updateWizardUi();
  updateStepVisibility();
  updateReviewSummaries();
  updateChecklist();
  updateStepperStatus();
}

function updateWizardUi() {
  const step = STEP_DEFINITIONS[state.currentStep];
  const progress = Math.round(((state.currentStep + 1) / STEP_DEFINITIONS.length) * 100);

  elements.wizardTitle.textContent = step.title;
  elements.wizardDescription.textContent = step.description;
  elements.completionPercent.textContent = `${progress}%`;
  elements.wizardProgressBar.style.width = `${progress}%`;
  elements.wizardProgressBar.parentElement.setAttribute('aria-valuenow', String(progress));
  elements.btnPrev.disabled = state.currentStep === 0;
  elements.btnNext.disabled = state.currentStep === STEP_DEFINITIONS.length - 1;
  elements.btnNext.textContent = state.currentStep === STEP_DEFINITIONS.length - 2 ? 'Vai al riepilogo' : 'Continua';
}

function updateStepVisibility() {
  elements.wizardSteps.forEach((step, index) => {
    step.classList.toggle('active', index === state.currentStep);
  });
}

function updateStepperStatus() {
  const buttons = elements.stepperNav.querySelectorAll('[data-target-step]');
  buttons.forEach((button, index) => {
    const valid = validateStep(index, { silent: true });
    const status = button.querySelector('.step-nav__status');
    button.classList.toggle('is-current', index === state.currentStep);
    button.classList.toggle('is-complete', valid);
    status.textContent = valid ? 'OK' : index === state.currentStep ? 'Ora' : 'Dopo';
  });
}

function updateReviewSummaries() {
  const data = collectFormData();
  renderSummaryGrid(elements.annexASummary, [
    ['Ragione Sociale', data.companyName],
    ['Partita IVA', data.vatNumber],
    ['PEC', data.pec],
    ['Sede Legale', compactAddress(data.legalStreet, data.legalNumber, data.legalCap, data.legalCity, data.legalProvince)],
    ['Legale Rappresentante', compactName(data.representativeFirstName, data.representativeLastName)],
    ['Regime Fiscale', getFiscalRegimeLabel(data.fiscalRegime)],
  ]);

  renderSummaryGrid(elements.antimafiaSummary, [
    ['Azienda', data.companyName],
    ['Legale rappresentante', compactName(data.representativeFirstName, data.representativeLastName)],
    ['Codice fiscale', data.representativeTaxCode],
    ['Documento', [data.documentType, data.documentNumber].filter(Boolean).join(' ')],
    ['Residenza', compactAddress(data.residenceStreet, data.residenceNumber, '', data.residenceCity, data.residenceProvince)],
    ['Licenza / SCIA', data.licenseScia],
  ]);

  renderSummaryGrid(elements.finalSummary, [
    ['Azienda', data.companyName],
    ['Contatti', [data.pec, data.email, data.phone].filter(Boolean).join(' | ')],
    ['Legale rappresentante', compactName(data.representativeFirstName, data.representativeLastName)],
    ['Documento', [data.documentType, data.documentNumber, formatDate(data.documentExpiryDate)].filter(Boolean).join(' | ')],
    ['Attivita', [data.cciaaNumber, data.cciaaChamber, data.publicIp].filter(Boolean).join(' | ')],
    ['Firma', state.signatureDataUrl ? 'Presente' : 'Da acquisire'],
  ]);
}

function renderSummaryGrid(container, rows) {
  container.innerHTML = rows.map(([label, value]) => `
    <div class="summary-item">
      <span class="summary-item__label">${escapeHtml(label)}</span>
      <span class="summary-item__value">${escapeHtml(value || 'Da completare')}</span>
    </div>
  `).join('');
}

function updateChecklist() {
  const checks = [
    ['Dati Azienda completi', validateCompanyStep({ silent: true })],
    ['Legale Rappresentante completo', validateRepresentativeStep({ silent: true })],
    ['Documento Identita caricato', validateDocumentStep({ silent: true })],
    ['Dati Attivita confermati', validateActivityStep({ silent: true }) && validateFiscalStep({ silent: true })],
    ['Allegati verificati', validateAnnexAStep({ silent: true }) && validateAntimafiaStep({ silent: true })],
    ['Firma presente', validateSignatureStep({ silent: true })],
  ];

  elements.finalChecklist.innerHTML = checks.map(([label, ok]) => `
    <div class="checklist-item ${ok ? 'is-complete' : ''}">
      <span>${ok ? 'OK' : '...' } ${escapeHtml(label)}</span>
      <span class="checklist-item__icon">${ok ? 'Completato' : 'In attesa'}</span>
    </div>
  `).join('');
}

function validateStep(stepIndex, options = {}) {
  return STEP_DEFINITIONS[stepIndex].validate(options);
}

function validateAllRequiredSteps() {
  return STEP_DEFINITIONS.every((_, index) => validateStep(index, { silent: true }));
}

function goToFirstInvalidStep() {
  const invalidIndex = STEP_DEFINITIONS.findIndex((_, index) => !validateStep(index, { silent: true }));
  if (invalidIndex >= 0) {
    state.currentStep = invalidIndex;
    refreshUi();
    scrollWizardTop();
  }
}

function validateCompanyStep({ silent = false } = {}) {
  const fields = [
    'companyName',
    'vatOrTaxCode',
    'email',
    'mobile',
    'legalStreet',
    'legalCap',
    'legalCity',
    'legalProvince',
    'operationalStreet',
    'operationalCap',
    'operationalCity',
    'operationalProvince',
  ];
  let valid = fields.every((name) => validateNamedField(name, { silent }));
  valid = validateEmailField('email', { silent }) && valid;
  const pecValue = sanitizeText(document.getElementById('pec').value);
  if (pecValue) {
    valid = validateEmailField('pec', { silent }) && valid;
  }
  return valid;
}

function validateRepresentativeStep({ silent = false } = {}) {
  return [
    'representativeFirstName',
    'representativeLastName',
    'representativeTaxCode',
    'birthDate',
    'birthCity',
    'birthProvince',
    'residenceStreet',
    'residenceNumber',
    'residenceCity',
    'residenceProvince',
  ].every((name) => validateNamedField(name, { silent }));
}

function validateDocumentStep({ silent = false } = {}) {
  let valid = [
    'documentType',
    'documentNumber',
    'documentIssuer',
    'documentIssueDate',
    'documentExpiryDate',
  ].every((name) => validateNamedField(name, { silent }));

  const issueDate = document.getElementById('documentIssueDate').value;
  const expiryDate = document.getElementById('documentExpiryDate').value;
  if (issueDate && expiryDate && expiryDate < issueDate) {
    valid = false;
    if (!silent) {
      setInvalid(document.getElementById('documentExpiryDate'), 'La scadenza deve essere successiva al rilascio.');
    }
  } else {
    clearInvalid(document.getElementById('documentExpiryDate'));
  }

  valid = validateDocumentUploads({ silent }) && valid;
  return valid;
}

function validateActivityStep({ silent = false } = {}) {
  return [
    'cciaaNumber',
    'cciaaChamber',
    'licenseScia',
    'publicIp',
    'salesContact',
  ].every((name) => validateNamedField(name, { silent }));
}

function validateFiscalStep() {
  return Boolean(document.querySelector('input[name="fiscalRegime"]:checked'));
}

function validateAnnexAStep({ silent = false } = {}) {
  const checked = document.getElementById('annexAConfirmed').checked;
  elements.annexAConfirmedError.textContent = silent || checked ? '' : 'Conferma i dati dell Allegato A per proseguire.';
  return checked;
}

function validateCriminalStep({ silent = false } = {}) {
  if (elements.criminalNulla.checked) {
    return true;
  }

  let valid = true;
  valid = validateNamedField('criminalTribunal', { silent, customRequiredMessage: 'Compila il tribunale del casellario oppure seleziona NULLA.' }) && valid;
  valid = validateNamedField('criminalTribunal2', { silent, customRequiredMessage: 'Compila il tribunale dei carichi pendenti oppure seleziona NULLA.' }) && valid;
  valid = validateNamedField('criminalRecordNotes', { silent, customRequiredMessage: 'Compila il casellario oppure seleziona NULLA.' }) && valid;
  valid = validateNamedField('pendingChargesNotes', { silent, customRequiredMessage: 'Compila i carichi pendenti oppure seleziona NULLA.' }) && valid;
  return valid;
}

function validateAntimafiaStep({ silent = false } = {}) {
  const checked = document.getElementById('antimafiaConfirmed').checked;
  elements.antimafiaConfirmedError.textContent = silent || checked ? '' : 'Conferma i dati dell autocertificazione antimafia per proseguire.';
  return checked;
}

function validateSignatureStep({ silent = false } = {}) {
  const ok = Boolean(state.signatureDataUrl);
  elements.signatureError.textContent = silent || ok ? '' : 'Acquisisci la firma prima di continuare.';
  return ok;
}

function validateDocumentUploads({ silent = false } = {}) {
  const value = sanitizeText(elements.documentUploadsMeta.value);
  const valid = Boolean(value);
  elements.documentUploadsError.textContent = silent || valid ? '' : 'Allega almeno un documento di identita.';
  return valid;
}

function validateNamedField(fieldName, { silent = false, customRequiredMessage = '' } = {}) {
  const field = elements.form.querySelector(`[name="${CSS.escape(fieldName)}"]`);
  if (!field || field.disabled) {
    return true;
  }

  const value = sanitizeText(field.value);
  if (!value) {
    if (!silent) {
      setInvalid(field, customRequiredMessage || 'Questo campo e obbligatorio.');
    } else {
      clearInvalid(field);
    }
    return false;
  }

  if ((field.type === 'email' || fieldName === 'pec' || fieldName === 'email') && !isValidEmail(value)) {
    if (!silent) {
      setInvalid(field, 'Inserisci un indirizzo email valido.');
    } else {
      clearInvalid(field);
    }
    return false;
  }

  if (fieldName === 'publicIp' && !isValidIp(value)) {
    if (!silent) {
      setInvalid(field, 'Inserisci un indirizzo IP valido.');
    } else {
      clearInvalid(field);
    }
    return false;
  }

  clearInvalid(field);
  return true;
}

function validateEmailField(fieldName, { silent = false } = {}) {
  return validateNamedField(fieldName, { silent });
}

function validateRelatedField(target, { silent = false } = {}) {
  if (!target.name) {
    return true;
  }

  if (target.type === 'radio') {
    if (target.name === 'fiscalRegime') {
      return validateFiscalStep({ silent });
    }
    return true;
  }

  if (target.name === 'criminalRecordNotes' || target.name === 'pendingChargesNotes') {
    return validateCriminalStep({ silent });
  }

  if (target.name === 'annexAConfirmed') {
    return validateAnnexAStep({ silent });
  }

  if (target.name === 'antimafiaConfirmed') {
    return validateAntimafiaStep({ silent });
  }

  return validateNamedField(target.name, { silent });
}

function setInvalid(field, message) {
  field.classList.add('is-invalid');
  let feedback = field.parentElement.querySelector('.invalid-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    field.parentElement.appendChild(feedback);
  }
  feedback.textContent = message;
}

function clearInvalid(field) {
  field.classList.remove('is-invalid');
  const feedback = field.parentElement.querySelector('.invalid-feedback');
  if (feedback && !feedback.id) {
    feedback.textContent = '';
  }
}

function clearValidation() {
  elements.form.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
  elements.form.querySelectorAll('.invalid-feedback').forEach((feedback) => {
    if (!feedback.id) {
      feedback.textContent = '';
    }
  });
  elements.documentUploadsError.textContent = '';
  elements.annexAConfirmedError.textContent = '';
  elements.antimafiaConfirmedError.textContent = '';
  elements.signatureError.textContent = '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidIp(value) {
  return /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(value);
}

function updateAutosaveIndicator(stateName) {
  if (!elements.autosaveStatus) {
    return;
  }
  elements.autosaveStatus.classList.remove('is-saving', 'is-saved');
  if (stateName === 'saving') {
    elements.autosaveStatus.classList.add('is-saving');
    elements.autosaveStatus.textContent = 'Salvataggio automatico...';
    return;
  }
  if (stateName === 'saved') {
    elements.autosaveStatus.classList.add('is-saved');
    elements.autosaveStatus.textContent = 'Salvato automaticamente';
    return;
  }
  elements.autosaveStatus.textContent = 'Autosalvataggio attivo';
}

async function buildPdf() {
  try {
    setStatus('Generazione PDF in corso...', 'info');
    const templateBytes = await loadTemplateBytes();
    const pdfBytes = await fillTemplate(templateBytes, collectFormData());
    setGeneratedPdf(pdfBytes);
    setStatus('PDF generato correttamente.', 'success');
    return pdfBytes;
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Errore durante la generazione del PDF.', 'danger');
    return null;
  }
}

async function loadTemplateBytes() {
  const contractConfig = getCurrentContractConfig();
  if (state.selectedTemplateSource === 'db' && state.selectedTemplateDbHash) {
    const response = await fetch(`/api/templates/${encodeURIComponent(state.selectedTemplateDbHash)}`);
    if (!response.ok) {
      throw new Error('Impossibile leggere il template dal database. Verifica DATABASE_URL o seleziona un PDF locale.');
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    await setTemplateContext(bytes, state.selectedTemplateName || state.selectedTemplateDbHash);
    return bytes;
  }

  if (state.selectedTemplateFile) {
    const bytes = new Uint8Array(await state.selectedTemplateFile.arrayBuffer());
    await setTemplateContext(bytes, state.selectedTemplateName || state.selectedTemplateFile.name);
    return bytes;
  }

  for (const candidate of contractConfig.templateCandidates) {
    try {
      const templatePath = `${contractConfig.directory}/${candidate}`;
      const response = await fetch(templatePath);
      if (!response.ok) {
        continue;
      }
      state.selectedTemplateName = templatePath;
      updateTemplateInfo();
      const bytes = new Uint8Array(await response.arrayBuffer());
      await setTemplateContext(bytes, templatePath);
      return bytes;
    } catch (error) {
      // Alcuni browser bloccano il fetch di file locali: si passa al fallback successivo.
    }
  }

  throw new Error(`Impossibile leggere automaticamente il template PDF dalla cartella ${contractConfig.directory}. Seleziona manualmente il file dal menu Template PDF.`);
}

async function fillTemplate(templateBytes, data) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const fields = new Map(form.getFields().map((field) => [field.getName(), field]));

  const representativeFullName = [data.representativeFirstName, data.representativeLastName]
    .map((value) => sanitizeText(value))
    .filter(Boolean)
    .join(' ');

  const operationalCityValue = [
    sanitizeText(data.operationalCap),
    sanitizeText(data.operationalCity),
    sanitizeText(data.operationalProvince),
  ].filter(Boolean).join(' ');

  const activeMapping = getActiveTemplateMapping();
  const issueDateTargets = new Set(['data-rilascio', 'data-rilascio-documento']);
  const mappedIssueDateField = sanitizeText(activeMapping.text.documentIssueDate);
  if (mappedIssueDateField) {
    issueDateTargets.add(mappedIssueDateField);
  }
  const issueDateValue = formatDate(data.documentIssueDate);

  const computedValues = {
    representativeFullName,
    operationalCityComposite: operationalCityValue,
    placeAndDate: buildPlaceAndDate(data),
    criminalCombinedNotes: buildCriminalCombinedNotes(data),
  };

  Object.entries(activeMapping.text).forEach(([sourceKey, pdfFieldName]) => {
    if (sourceKey === 'documentIssueDate') {
      return;
    }
    const trimmedFieldName = sanitizeText(pdfFieldName);
    if (!trimmedFieldName) {
      return;
    }
    const field = fields.get(trimmedFieldName);
    if (!field || typeof field.setText !== 'function') {
      return;
    }

    const value = Object.prototype.hasOwnProperty.call(computedValues, sourceKey)
      ? computedValues[sourceKey]
      : formatFieldValue(sourceKey, data[sourceKey]);
    field.setText(value);
  });

  if (issueDateValue) {
    issueDateTargets.forEach((fieldName) => {
      setIssueDateField(fields, fieldName, issueDateValue);
    });
  }

  applyExclusiveGroup(fields, activeMapping.checkboxGroups.roleType, data.roleType);
  applyExclusiveGroup(fields, activeMapping.checkboxGroups.fiscalRegime, data.fiscalRegime);
  setCheckboxValue(fields, activeMapping.checkboxes.criminalNulla, data.criminalNulla);
  const criminalHasAnyNotes = Boolean(sanitizeText(data.criminalRecordNotes) || sanitizeText(data.pendingChargesNotes));
  const criminalHasAnyTribunal = Boolean(sanitizeText(data.criminalTribunal) || sanitizeText(data.criminalTribunal2));
  const criminalOppureChecked = !data.criminalNulla && (criminalHasAnyNotes || criminalHasAnyTribunal);
  setCheckboxValue(fields, activeMapping.checkboxes.criminalOppure, criminalOppureChecked);
  setCheckboxValue(fields, activeMapping.checkboxes.criminalOppure2, criminalOppureChecked);

  if (state.signatureDataUrl) {
    await drawSignatureOnSignatureLines(pdfDoc, form, activeMapping.signature.anchorTextField);
  }

  form.flatten();
  return pdfDoc.save();
}

function mapTextValues(data, representativeFullName, operationalCityValue) {
  const values = {};

  Object.entries(TEXT_FIELD_MAPPING).forEach(([sourceKey, fieldName]) => {
    values[fieldName] = formatFieldValue(sourceKey, data[sourceKey]);
  });

  values['nome-e-cognome-titolare'] = representativeFullName;
  values['citta-sede-operativa'] = operationalCityValue;

  return values;
}

function formatFieldValue(sourceKey, rawValue) {
  if (sourceKey === 'birthDate') {
    return formatDate(rawValue);
  }

  if (sourceKey === 'documentIssueDate') {
    return formatDate(rawValue);
  }

  return sanitizeText(rawValue);
}

function sanitizeText(value) {
  return String(value || '').trim();
}

function formatDate(value) {
  const normalized = sanitizeText(value);
  if (!normalized) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-');
    return `${day}/${month}/${year}`;
  }

  return normalized;
}

function formatDateShortYear(value) {
  const normalized = sanitizeText(value);
  if (!normalized) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-');
    return `${day}/${month}/${year.slice(-2)}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split('/');
    return `${day}/${month}/${year.slice(-2)}`;
  }

  return normalized;
}

function setIssueDateField(fields, fieldName, fullDateValue) {
  const trimmedName = sanitizeText(fieldName);
  if (!trimmedName) {
    return;
  }

  const field = fields.get(trimmedName);
  if (!field || typeof field.setText !== 'function') {
    return;
  }

  const minWidgetWidth = getMinWidgetWidth(field);
  if (typeof field.setFontSize === 'function') {
    const fontSize = minWidgetWidth && minWidgetWidth < 70 ? 7 : minWidgetWidth && minWidgetWidth < 90 ? 9 : 10;
    field.setFontSize(fontSize);
  }

  const valueToSet = minWidgetWidth && minWidgetWidth < 60 ? formatDateShortYear(fullDateValue) : fullDateValue;
  field.setText(valueToSet);
}

function getMinWidgetWidth(field) {
  try {
    const widgets = field.acroField.getWidgets();
    if (!widgets || !widgets.length) {
      return null;
    }
    const widths = widgets.map((widget) => {
      const rect = widget.getRectangle();
      return rect?.width;
    }).filter((width) => typeof width === 'number' && Number.isFinite(width));
    return widths.length ? Math.min(...widths) : null;
  } catch (error) {
    return null;
  }
}

function buildPlaceAndDate(data) {
  const customValue = sanitizeText(data.placeAndDate);
  return customValue;
}

function buildCriminalCombinedNotes(data) {
  const part1 = sanitizeText(data.criminalRecordNotes);
  const part2 = sanitizeText(data.pendingChargesNotes);
  return [part1, part2].filter(Boolean).join(' | ');
}

function setExclusiveCheckboxes(fields, group, selectedName) {
  group.forEach((fieldName) => {
    const field = fields.get(fieldName);
    if (!field || typeof field.check !== 'function') {
      return;
    }

    if (fieldName === selectedName) {
      field.check();
    } else {
      field.uncheck();
    }
  });
}

function setCheckboxValue(fields, fieldName, checked) {
  const field = fields.get(fieldName);
  if (!field || typeof field.check !== 'function') {
    return;
  }

  if (checked) {
    field.check();
  } else {
    field.uncheck();
  }
}

async function drawSignatureOnSignatureLines(pdfDoc, form, anchorTextFieldName) {
  const signatureFieldName = sanitizeText(anchorTextFieldName) || 'luogo-e-data';
  const signatureField = form.getTextField(signatureFieldName);
  const trimmedSignatureDataUrl = await getTrimmedSignatureDataUrl(state.signatureDataUrl);
  const signatureBytes = await fetch(trimmedSignatureDataUrl).then((response) => response.arrayBuffer());
  const signatureImage = await pdfDoc.embedPng(signatureBytes);
  const pages = pdfDoc.getPages();

  signatureField.acroField.getWidgets().forEach((widget) => {
    const rect = widget.getRectangle();
    const pageIndex = pages.findIndex((page) => page.ref === widget.P());
    if (pageIndex < 0) {
      return;
    }

    const page = pages[pageIndex];
    const pageNumber = pageIndex + 1;
    const layout = SIGNATURE_LAYOUTS[pageNumber] || SIGNATURE_LAYOUTS.default;
    const width = layout.fixedWidth || Math.min(layout.maxWidth, rect.width + layout.extraWidth);
    const height = layout.height;
    const x = layout.anchor === 'absolute'
      ? layout.absoluteX
      : layout.anchor === 'field-left'
        ? rect.x + layout.xOffset
        : rect.x + rect.width + layout.xOffset;
    page.drawImage(signatureImage, {
      x,
      y: rect.y + layout.yOffset,
      width,
      height,
    });
  });
}

async function getTrimmedSignatureDataUrl(dataUrl) {
  const image = await loadImageFromDataUrl(dataUrl);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);

  const { width, height } = sourceCanvas;
  const pixels = sourceCtx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha === 0) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0 || maxY < 0) {
    return dataUrl;
  }

  const paddingX = 18;
  const paddingY = 12;
  const cropX = Math.max(0, minX - paddingX);
  const cropY = Math.max(0, minY - paddingY);
  const cropWidth = Math.min(width - cropX, (maxX - minX + 1) + paddingX * 2);
  const cropHeight = Math.min(height - cropY, (maxY - minY + 1) + paddingY * 2);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return croppedCanvas.toDataURL('image/png');
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Impossibile leggere l immagine della firma.'));
    image.src = dataUrl;
  });
}

function setGeneratedPdf(pdfBytes) {
  state.generatedPdfBytes = pdfBytes;
}

function downloadGeneratedPdf() {
  if (!state.generatedPdfBytes) {
    return;
  }

  const companyName = sanitizeText(document.getElementById('companyName').value) || 'contratto';
  const safeName = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const blob = new Blob([state.generatedPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName || 'contratto'}-compilato.pdf`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus('Download del PDF avviato.', 'success');
}

function resetGeneratedPdf() {
  state.generatedPdfBytes = null;
}

function setStatus(message, tone) {
  elements.statusBox.className = `alert alert-${tone} shadow-sm mb-4`;
  elements.statusBox.textContent = message;
}

function compactName(firstName, lastName) {
  return [firstName, lastName].map(sanitizeText).filter(Boolean).join(' ');
}

function compactAddress(street, number, cap, city, province) {
  return [street, number, cap, city, province].map(sanitizeText).filter(Boolean).join(', ');
}

function getFiscalRegimeLabel(value) {
  const labels = {
    'regime-ordinario': 'Ordinario',
    'regime-di-vantaggio-e-forfettari': 'Forfettario',
    'regime-dei-minimi': 'Minimi',
    'collaboratore-occasionale': 'Collaborazione occasionale',
    'associazioni-dotati-di-p-iva': 'Associazione con P.IVA',
    'associazioni-non-dotati-di-p-iva': 'Associazione senza P.IVA',
  };
  return labels[value] || 'Da selezionare';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
}

function getCurrentContractConfig() {
  const contractType = elements.contractType?.value || 'pvr-vincitu';
  return CONTRACT_TEMPLATES[contractType] || CONTRACT_TEMPLATES['pvr-vincitu'];
}
