const STORAGE_KEY = 'contract-generator-data-v2';
const APP_VERSION = '1.33';
const SERVERLESS_DIRECT_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;
const BLOB_CLIENT_MODULE_URL = 'https://esm.sh/@vercel/blob/client';
const BLOB_TOKEN_ROUTE_URL = '/api/blob-client-token';
const COMUNI_DATASET_URL = 'https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json';
const COMUNI_CACHE_KEY = 'contract-generator-comuni-cache-v1';
const COMUNI_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const COMUNI_DATALIST_ID = 'comuniAutocompleteOptions';
const PROVINCE_DATALIST_ID = 'provinceAutocompleteOptions';
const CAP_DATALIST_ID = 'capAutocompleteOptions';
const DOCUMENT_TYPE_DATALIST_ID = 'documentTypeOptions';
const DOCUMENT_TYPE_OPTIONS = [
  'CARTA DI IDENTITA',
  'CARTA DI IDENTITA ELETTRONICA',
  'PASSAPORTO',
  'PATENTE DI GUIDA',
  'PATENTE NAUTICA',
  'PERMESSO DI SOGGIORNO',
];
const COMUNE_AUTOCOMPLETE_CONFIGS = [
  { cityField: 'legalCity', provinceField: 'legalProvince', capField: 'legalCap' },
  { cityField: 'operationalCity', provinceField: 'operationalProvince', capField: 'operationalCap' },
  { cityField: 'birthCity', provinceField: 'birthProvince' },
  { cityField: 'residenceCity', provinceField: 'residenceProvince' },
];
const autocompleteStore = {
  comuni: [],
  provinces: [],
  loaded: false,
};
const CONTRACT_TEMPLATES = {
  'pvr-vincitu': {
    label: 'PVR Vincitu',
    directory: 'templates/vincitu',
    templateCandidates: [
      'contratto-pvr-vincitu-compilabile-2026.pdf',
      'contratto-template.pdf',
    ],
  },
  novapay: {
    label: 'PDP Novapay',
    directory: 'templates/novapay',
    templateCandidates: [
      'contratto-novapay.pdf',
    ],
  },
};

const NOVAPAY_COMPANY_TYPE_FIELDS = ['ditta-individuale', 'sas', 'snc', 'srl', 'spa'];

const NOVAPAY_STEP_OVERRIDES = {
  0: {
    title: 'Dati Azienda',
    description: 'Compila anagrafica, contatti, sede legale e forma giuridica richiesti dal contratto Novapay.',
  },
  1: {
    title: 'Titolare / Firmatario',
    description: 'Inserisci i dati del titolare o legale rappresentante riportati nel contratto Novapay.',
  },
  8: {
    title: 'Firma',
    description: 'Inserisci luogo e data, acquisisci la firma grafica e prepara il PDF Novapay finale.',
  },
  9: {
    title: 'Riepilogo Finale',
    description: 'Verifica i dati Novapay prima di generare e scaricare il PDF finale.',
  },
};

const NOVAPAY_ACTIVE_STEPS = [0, 1, 8, 9];

const NOVAPAY_TEXT_FIELD_MAPPING = {
  companyName: 'societa',
  vatOrTaxCode: 'partita-iva',
  phone: 'telefono',
  email: 'email',
  legalStreet: 'via-sede-legale',
  legalNumber: 'civico-sede-legale',
  legalCap: 'cap-sede-legale',
  legalCity: 'citta-sede-legale',
  legalProvince: 'provincia-sede-legale',
  representativeTaxCode: 'codice-fiscale-titolare',
  birthDate: 'data-nascita-titolare',
  birthCity: 'citta-natale-titolare',
  residenceCity: 'citta-residenza-titolare',
  placeAndDate: 'luogo-e-data',
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
    maxWidth: 176,
    extraWidth: 88,
    maxHeight: 77,
    height: 34,
  },
  2: {
    anchor: 'absolute',
    absoluteX: 376,
    yOffset: -10,
    fixedWidth: 176,
    maxHeight: 77,
    height: 34,
  },
  4: {
    anchor: 'absolute',
    absoluteX: 388,
    yOffset: -4,
    fixedWidth: 176,
    maxHeight: 77,
    height: 34,
  },
  5: {
    anchor: 'absolute',
    absoluteX: 388,
    yOffset: -4,
    fixedWidth: 176,
    maxHeight: 77,
    height: 34,
  },
  6: {
    anchor: 'absolute',
    absoluteX: 376,
    yOffset: -4,
    fixedWidth: 176,
    maxHeight: 77,
    height: 34,
  },
  7: {
    anchor: 'absolute',
    absoluteX: 376,
    yOffset: -4,
    fixedWidth: 176,
    maxHeight: 77,
    height: 34,
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
  importedContractTemplatesCache: [],
  importedContractsManagerCache: [],
  dynamicContractRenderKey: '',
  generatedPdfBytes: null,
  signatureDataUrl: '',
  isDrawing: false,
  lastPoint: null,
  autosaveTimer: null,
  importedContractDraft: null,
  importedContractPdfUrl: '',
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
  btnImportContractPdf: document.getElementById('btnImportContractPdf'),
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
  vatOrTaxCodeLabel: document.getElementById('vatOrTaxCodeLabel'),
  novapayCompanyTypePanel: document.getElementById('novapayCompanyTypePanel'),
  operationalAddressPanel: document.getElementById('operationalAddressPanel'),
  birthProvinceGroup: document.getElementById('birthProvinceGroup'),
  residenceStreetGroup: document.getElementById('residenceStreetGroup'),
  residenceNumberGroup: document.getElementById('residenceNumberGroup'),
  residenceProvinceGroup: document.getElementById('residenceProvinceGroup'),
  documentStepDefaultFields: document.getElementById('documentStepDefaultFields'),
  presentedByPanel: document.getElementById('presentedByPanel'),
  importContractModal: document.getElementById('importContractModal'),
  importContractFile: document.getElementById('importContractFile'),
  importContractName: document.getElementById('importContractName'),
  importContractSignatureField: document.getElementById('importContractSignatureField'),
  importContractStatus: document.getElementById('importContractStatus'),
  importContractFieldCount: document.getElementById('importContractFieldCount'),
  importContractPageCount: document.getElementById('importContractPageCount'),
  importContractActiveFieldCount: document.getElementById('importContractActiveFieldCount'),
  importContractConfirmed: document.getElementById('importContractConfirmed'),
  importContractPdfPreview: document.getElementById('importContractPdfPreview'),
  importContractFieldPreview: document.getElementById('importContractFieldPreview'),
  importContractFieldsBody: document.getElementById('importContractFieldsBody'),
  btnReanalyzeImportContract: document.getElementById('btnReanalyzeImportContract'),
  btnSaveImportedContractTemplate: document.getElementById('btnSaveImportedContractTemplate'),
  btnManageImportedContracts: document.getElementById('btnManageImportedContracts'),
  importedContractsManagerModal: document.getElementById('importedContractsManagerModal'),
  importedContractsManagerFilter: document.getElementById('importedContractsManagerFilter'),
  importedContractsManagerList: document.getElementById('importedContractsManagerList'),
  importedContractsManagerStatus: document.getElementById('importedContractsManagerStatus'),
  btnRefreshImportedContractsManager: document.getElementById('btnRefreshImportedContractsManager'),
};

document.addEventListener('DOMContentLoaded', async () => {
  renderAppVersion();
  await refreshContractTypeOptions({ preferredValue: 'pvr-vincitu', silentErrors: true });
  initializeCanvas();
  initializeStaticAutocomplete();
  renderStepper();
  bindEvents();
  setDefaultDates();
  updateDocumentUploadsMeta();
  toggleCriminalFields();
  loadFromLocalStorage({ silent: true, notifyIfMissing: false });
  refreshUi();
  setupFooterOffsetSync();
  void initializeComuneAutocomplete();
});

function renderAppVersion() {
  if (elements.appVersion) {
    elements.appVersion.textContent = APP_VERSION;
  }
  document.title = `Contract Generator ${APP_VERSION}`;
}

function bindEvents() {
  elements.btnNuovo.addEventListener('click', handleNewForm);
  elements.btnImportContractPdf?.addEventListener('click', openImportContractModal);
  elements.btnManageImportedContracts?.addEventListener('click', openImportedContractsManagerModal);
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
  elements.contractType.addEventListener('change', handleContractTypeChange);
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
  elements.btnPrev.addEventListener('click', () => {
    const previousStep = getAdjacentActiveStep(state.currentStep, -1);
    if (previousStep !== null) {
      goToStep(previousStep, { validateCurrent: false });
    }
  });
  elements.btnNext.addEventListener('click', () => {
    const nextStep = getAdjacentActiveStep(state.currentStep, 1);
    if (nextStep !== null) {
      goToStep(nextStep, { validateCurrent: true });
    }
  });
  elements.documentUploads.addEventListener('change', handleDocumentUploadsChange);
  elements.importContractFile?.addEventListener('change', handleImportContractFileChange);
  elements.importContractName?.addEventListener('input', syncImportedContractName);
  elements.importContractSignatureField?.addEventListener('change', handleImportedSignatureFieldChange);
  elements.importContractConfirmed?.addEventListener('change', updateImportedContractUi);
  elements.btnReanalyzeImportContract?.addEventListener('click', reanalyzeImportedContractPdf);
  elements.btnSaveImportedContractTemplate?.addEventListener('click', saveImportedContractTemplateFlow);
  elements.importContractModal?.addEventListener('hidden.bs.modal', handleImportContractModalHidden);
  elements.btnRefreshImportedContractsManager?.addEventListener('click', refreshImportedContractsManagerList);
  elements.importedContractsManagerFilter?.addEventListener('input', () => renderImportedContractsManagerList(state.importedContractsManagerCache));
  elements.importedContractsManagerList?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-imported-contract-action]');
    if (!button) {
      return;
    }
    const action = sanitizeText(button.dataset.importedContractAction);
    const contractId = sanitizeText(button.dataset.importedContractId);
    if (!contractId) {
      return;
    }
    if (action === 'edit') {
      openImportedContractEditorById(contractId);
      return;
    }
    if (action === 'delete') {
      deleteImportedContractTemplateFromManager(contractId);
    }
  });
  elements.criminalNulla.addEventListener('change', () => {
    toggleCriminalFields();
    validateStep(6, { silent: true });
    triggerAutosave();
    refreshUi();
  });

  elements.form.addEventListener('input', handleFormInteraction);
  elements.form.addEventListener('change', handleFormInteraction);
}

function setupFooterOffsetSync() {
  const footer = document.querySelector('.app-footer');
  if (!footer) {
    return;
  }

  const collapse = document.getElementById('mobileFooterCollapse');
  const media = window.matchMedia('(max-width: 767.98px)');

  const applyOffset = () => {
    if (!media.matches) {
      document.documentElement.style.removeProperty('--app-footer-offset');
      return;
    }
    const height = Math.max(0, Math.round(footer.getBoundingClientRect().height));
    if (height) {
      document.documentElement.style.setProperty('--app-footer-offset', `${height}px`);
    }
  };

  const animateOffset = () => {
    const start = performance.now();
    const duration = 450;
    const tick = () => {
      applyOffset();
      if (performance.now() - start < duration) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  };

  if (collapse) {
    collapse.addEventListener('show.bs.collapse', animateOffset);
    collapse.addEventListener('shown.bs.collapse', applyOffset);
    collapse.addEventListener('hide.bs.collapse', animateOffset);
    collapse.addEventListener('hidden.bs.collapse', applyOffset);
  }

  window.addEventListener('resize', () => requestAnimationFrame(applyOffset));

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', applyOffset);
  } else if (typeof media.addListener === 'function') {
    media.addListener(applyOffset);
  }

  applyOffset();
  setTimeout(applyOffset, 0);
  setTimeout(applyOffset, 200);
}

function openImportContractModal() {
  if (!state.importedContractDraft) {
    resetImportedContractDraft();
  } else {
    updateImportedContractUi();
  }
}

function handleImportContractModalHidden() {
  resetImportedContractDraft({ preserveStatus: false });
}

function resetImportedContractDraft({ preserveStatus = true } = {}) {
  revokeImportedContractPdfUrl();
  state.importedContractDraft = null;
  if (elements.importContractFile) {
    elements.importContractFile.value = '';
  }
  if (elements.importContractName) {
    elements.importContractName.value = '';
  }
  if (elements.importContractSignatureField) {
    elements.importContractSignatureField.innerHTML = '<option value="">Nessun campo firma selezionato</option>';
    elements.importContractSignatureField.value = '';
  }
  if (elements.importContractConfirmed) {
    elements.importContractConfirmed.checked = false;
  }
  if (elements.importContractPdfPreview) {
    elements.importContractPdfPreview.removeAttribute('src');
  }
  if (elements.importContractFieldPreview) {
    elements.importContractFieldPreview.innerHTML = '<div class="text-secondary">Nessun PDF analizzato.</div>';
  }
  if (elements.importContractFieldsBody) {
    elements.importContractFieldsBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-secondary">Nessun PDF analizzato.</td>
      </tr>
    `;
  }
  if (elements.importContractFieldCount) {
    elements.importContractFieldCount.textContent = '0';
  }
  if (elements.importContractPageCount) {
    elements.importContractPageCount.textContent = '0';
  }
  if (elements.importContractActiveFieldCount) {
    elements.importContractActiveFieldCount.textContent = '0';
  }
  if (elements.importContractStatus && !preserveStatus) {
    elements.importContractStatus.textContent = 'Seleziona un PDF per iniziare.';
  }
  if (elements.btnSaveImportedContractTemplate) {
    elements.btnSaveImportedContractTemplate.disabled = true;
  }
}

function revokeImportedContractPdfUrl() {
  if (state.importedContractPdfUrl) {
    URL.revokeObjectURL(state.importedContractPdfUrl);
    state.importedContractPdfUrl = '';
  }
}

async function handleImportContractFileChange() {
  const [file] = Array.from(elements.importContractFile?.files || []);
  if (!file) {
    resetImportedContractDraft({ preserveStatus: false });
    return;
  }

  await analyzeImportedContractPdf(file);
}

async function reanalyzeImportedContractPdf() {
  const [file] = Array.from(elements.importContractFile?.files || []);
  if (!file) {
    setStatus('Seleziona prima un PDF da analizzare.', 'warning');
    return;
  }
  await analyzeImportedContractPdf(file);
}

function syncImportedContractName() {
  if (!state.importedContractDraft || !elements.importContractName) {
    updateImportedContractUi();
    return;
  }

  state.importedContractDraft.contractName = elements.importContractName.value;
  state.importedContractDraft.contractType = resolveImportedDraftContractType(
    state.importedContractDraft,
    elements.importContractName.value,
  );
  updateImportedContractUi();
}

async function analyzeImportedContractPdf(file) {
  try {
    elements.importContractStatus.textContent = 'Analisi del PDF in corso...';
    const bytes = new Uint8Array(await file.arrayBuffer());
    const analysis = await inspectImportedContractFields(bytes);
    const fileNameWithoutExt = file.name.replace(/\.pdf$/i, '');
    const hash = window.crypto?.subtle ? await computeSha256Hex(bytes) : generateId();

    revokeImportedContractPdfUrl();
    state.importedContractPdfUrl = URL.createObjectURL(new Blob([bytes], { type: file.type || 'application/pdf' }));
    const contractName = sanitizeText(elements.importContractName?.value) || fileNameWithoutExt;
    state.importedContractDraft = {
      id: generateId(),
      contractType: buildImportedContractType(contractName, hash),
      fileName: file.name,
      contractName,
      sourceFile: file,
      contentType: file.type || 'application/pdf',
      bytes,
      templateHash: hash,
      fields: analysis.fields,
      pages: analysis.pages,
      pageCount: analysis.pages.length,
      isExisting: false,
      signatureFieldId: analysis.fields.find((field) => field.type === 'signature' && !field.removed)?.id || '',
      metadata: {},
    };

    if (elements.importContractName && !sanitizeText(elements.importContractName.value)) {
      elements.importContractName.value = state.importedContractDraft.contractName;
    }
    if (elements.importContractConfirmed) {
      elements.importContractConfirmed.checked = false;
    }

    updateImportedContractUi();
    elements.importContractStatus.textContent = analysis.fields.length
      ? `Analisi completata: ${analysis.fields.length} campi rilevati.`
      : 'PDF analizzato: nessun campo modulo rilevato.';
  } catch (error) {
    console.error(error);
    resetImportedContractDraft();
    elements.importContractStatus.textContent = error.message || 'Errore durante l analisi del PDF.';
    setStatus(elements.importContractStatus.textContent, 'danger');
  }
}

async function inspectImportedContractFields(templateBytes) {
  const { PDFDocument, PDFName } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const pageRefs = pages.map((page) => page.ref);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const pageModels = pages.map((page, index) => ({
    pageNumber: index + 1,
    width: Math.max(1, Math.round(page.getWidth())),
    height: Math.max(1, Math.round(page.getHeight())),
  }));

  const fieldModels = [];
  fields.forEach((field, fieldIndex) => {
    const originalName = sanitizeText(field.getName()) || `field_${fieldIndex + 1}`;
    const normalizedType = inferImportedFieldType(field);
    const widgets = getImportedFieldWidgets(field);

    if (!widgets.length) {
      fieldModels.push({
        id: `${originalName}__0`,
        originalName,
        customName: originalName,
        type: normalizedType,
        sourceType: normalizedType,
        pageNumber: 1,
        rect: { x: 0, y: 0, width: 0, height: 0 },
        description: '',
        category: '',
        removed: false,
      });
      return;
    }

    widgets.forEach((widget, widgetIndex) => {
      const rect = getPdfRectFromWidget(widget);
      const pageNumber = getWidgetPageNumber(widget, PDFName, pageRefs) || 1;
      const suffix = widgets.length > 1 ? ` #${widgetIndex + 1}` : '';
      fieldModels.push({
        id: `${originalName}__${widgetIndex}`,
        originalName,
        customName: `${originalName}${suffix}`,
        type: normalizedType,
        sourceType: normalizedType,
        pageNumber,
        rect,
        description: '',
        category: '',
        removed: false,
      });
    });
  });

  fieldModels.sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }
    if (a.rect.y !== b.rect.y) {
      return b.rect.y - a.rect.y;
    }
    return a.rect.x - b.rect.x;
  });

  return {
    pages: pageModels,
    fields: fieldModels,
  };
}

function inferImportedFieldType(field) {
  const ctorName = sanitizeText(field?.constructor?.name).toLowerCase();
  if (ctorName.includes('text')) {
    return 'text';
  }
  if (ctorName.includes('check')) {
    return 'checkbox';
  }
  if (ctorName.includes('radio')) {
    return 'radio';
  }
  if (ctorName.includes('dropdown')) {
    return 'dropdown';
  }
  if (ctorName.includes('optionlist')) {
    return 'option-list';
  }
  if (ctorName.includes('button')) {
    return 'button';
  }
  if (ctorName.includes('signature')) {
    return 'signature';
  }

  if (typeof field.setText === 'function') {
    return 'text';
  }
  if (typeof field.check === 'function' && typeof field.uncheck === 'function') {
    return 'checkbox';
  }
  if (typeof field.select === 'function') {
    return 'dropdown';
  }
  return 'unknown';
}

function getImportedFieldWidgets(field) {
  try {
    if (typeof field?.acroField?.getWidgets === 'function') {
      const widgets = field.acroField.getWidgets();
      return Array.isArray(widgets) ? widgets : [];
    }
  } catch (error) {
    return [];
  }
  return [];
}

function getPdfRectFromWidget(widget) {
  try {
    if (typeof widget?.getRectangle === 'function') {
      const rect = widget.getRectangle();
      const width = Math.max(0, Number(rect?.width || 0));
      const height = Math.max(0, Number(rect?.height || 0));
      return {
        x: Math.max(0, Number(rect?.x || 0)),
        y: Math.max(0, Number(rect?.y || 0)),
        width,
        height,
      };
    }
  } catch (error) {
    // ignored
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

function getWidgetPageNumber(widget, PDFName, pageRefs) {
  try {
    const pageRef = widget?.dict?.get?.(PDFName.of('P'));
    if (!pageRef) {
      return null;
    }
    const index = pageRefs.findIndex((ref) => {
      if (!ref || !pageRef) {
        return false;
      }
      return ref.objectNumber === pageRef.objectNumber && ref.generationNumber === pageRef.generationNumber;
    });
    return index >= 0 ? index + 1 : null;
  } catch (error) {
    return null;
  }
}

async function inspectImportedContractPages(templateBytes) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(templateBytes);
  return pdfDoc.getPages().map((page, index) => ({
    pageNumber: index + 1,
    width: Math.max(1, Math.round(page.getWidth())),
    height: Math.max(1, Math.round(page.getHeight())),
  }));
}

function updateImportedContractUi() {
  const draft = state.importedContractDraft;
  const confirmed = Boolean(elements.importContractConfirmed?.checked);
  const contractName = sanitizeText(elements.importContractName?.value || draft?.contractName);

  if (!draft) {
    if (elements.btnSaveImportedContractTemplate) {
      elements.btnSaveImportedContractTemplate.disabled = true;
    }
    return;
  }

  draft.contractName = contractName || draft.contractName;
  draft.signatureFieldId = getImportedSignatureFieldId(draft);
  updateImportedContractSummary(draft);
  updateImportedSignatureFieldSelect(draft);
  renderImportedContractPreview(draft);
  renderImportedContractFieldRows(draft);

  if (elements.importContractPdfPreview) {
    elements.importContractPdfPreview.src = state.importedContractPdfUrl || '';
  }

  if (elements.btnSaveImportedContractTemplate) {
    const hasActiveFields = draft.fields.some((field) => !field.removed);
    elements.btnSaveImportedContractTemplate.disabled = !confirmed || !contractName || !hasActiveFields;
  }
}

function updateImportedSignatureFieldSelect(draft) {
  if (!elements.importContractSignatureField) {
    return;
  }

  const options = draft.fields
    .filter((field) => !field.removed)
    .map((field) => ({
      value: field.id,
      label: `${field.customName || field.originalName} (${field.originalName})`,
    }));
  const selectedId = getImportedSignatureFieldId(draft);
  elements.importContractSignatureField.innerHTML = [
    '<option value="">Nessun campo firma selezionato</option>',
    ...options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`),
  ].join('');
  elements.importContractSignatureField.value = selectedId;
}

function updateImportedContractSummary(draft) {
  const totalFields = draft.fields.length;
  const activeFields = draft.fields.filter((field) => !field.removed).length;
  elements.importContractFieldCount.textContent = String(totalFields);
  elements.importContractPageCount.textContent = String(draft.pageCount || draft.pages.length || 0);
  elements.importContractActiveFieldCount.textContent = String(activeFields);
}

function renderImportedContractPreview(draft) {
  if (!elements.importContractFieldPreview) {
    return;
  }

  if (!draft.pages.length) {
    elements.importContractFieldPreview.innerHTML = '<div class="text-secondary">Nessuna pagina rilevata.</div>';
    return;
  }

  elements.importContractFieldPreview.innerHTML = draft.pages.map((page) => {
    const pageFields = draft.fields.filter((field) => field.pageNumber === page.pageNumber);
    const aspectRatio = `${page.width} / ${page.height}`;
    const fieldMarkup = pageFields.map((field) => {
      const width = page.width ? (field.rect.width / page.width) * 100 : 0;
      const height = page.height ? (field.rect.height / page.height) * 100 : 0;
      const left = page.width ? (field.rect.x / page.width) * 100 : 0;
      const top = page.height ? 100 - ((field.rect.y + field.rect.height) / page.height) * 100 : 0;
      return `
        <div
          class="import-contract-page__field ${field.removed ? 'is-removed' : ''}"
          style="left:${left}%; top:${top}%; width:${Math.max(width, 3)}%; height:${Math.max(height, 2.2)}%;"
          title="${escapeHtml(field.customName || field.originalName)}"
        >
          <span class="import-contract-page__field-label">${escapeHtml(field.customName || field.originalName)}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="import-contract-page">
        <div class="import-contract-page__label">
          <span>Pagina ${page.pageNumber}</span>
          <span>${pageFields.length} campi</span>
        </div>
        <div class="import-contract-page__canvas" style="aspect-ratio:${aspectRatio};">
          ${fieldMarkup || '<span class="import-contract-page__field-label">Nessun campo in questa pagina</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function renderImportedContractFieldRows(draft) {
  if (!elements.importContractFieldsBody) {
    return;
  }

  if (!draft.fields.length) {
    elements.importContractFieldsBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-secondary">Il PDF non contiene campi modulo rilevabili.</td>
      </tr>
    `;
    return;
  }

  elements.importContractFieldsBody.innerHTML = draft.fields.map((field) => {
    const positionLabel = `Pag. ${field.pageNumber} • x:${Math.round(field.rect.x)} y:${Math.round(field.rect.y)} • ${Math.round(field.rect.width)}x${Math.round(field.rect.height)}`;
    return `
      <tr class="import-contract-table__row ${field.removed ? 'is-removed' : ''}" data-import-field-id="${escapeHtml(field.id)}">
        <td>
          <span class="import-contract-table__name">${escapeHtml(field.originalName)}</span>
          <span class="import-contract-table__meta">${escapeHtml(positionLabel)}</span>
        </td>
        <td>
          <input type="text" class="form-control form-control-sm" data-import-field-prop="customName" value="${escapeHtml(field.customName)}" ${field.removed ? 'disabled' : ''}>
        </td>
        <td>
          <select class="form-select form-select-sm" data-import-field-prop="type" ${field.removed ? 'disabled' : ''}>
            ${buildImportedFieldTypeOptions(field.type)}
          </select>
        </td>
        <td class="small text-secondary">${escapeHtml(positionLabel)}</td>
        <td>
          <input type="text" class="form-control form-control-sm" data-import-field-prop="category" value="${escapeHtml(field.category)}" ${field.removed ? 'disabled' : ''}>
        </td>
        <td>
          <input type="text" class="form-control form-control-sm" data-import-field-prop="description" value="${escapeHtml(field.description)}" ${field.removed ? 'disabled' : ''}>
        </td>
        <td>
          <button type="button" class="btn btn-sm ${field.removed ? 'btn-outline-success' : 'btn-outline-danger'}" data-import-field-toggle>
            ${field.removed ? 'Ripristina' : 'Escludi'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  elements.importContractFieldsBody.querySelectorAll('[data-import-field-id]').forEach((row) => {
    const fieldId = row.dataset.importFieldId;
    row.querySelectorAll('[data-import-field-prop]').forEach((input) => {
      const prop = input.dataset.importFieldProp;
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', () => updateImportedFieldDraft(fieldId, prop, input.value));
        return;
      }
      input.addEventListener('input', () => updateImportedFieldDraft(fieldId, prop, input.value, { rerender: false }));
      input.addEventListener('change', () => updateImportedFieldDraft(fieldId, prop, input.value));
    });
    row.querySelector('[data-import-field-toggle]')?.addEventListener('click', () => toggleImportedFieldRemoved(fieldId));
  });
}

function buildImportedFieldTypeOptions(selectedValue) {
  const types = ['text', 'checkbox', 'radio', 'dropdown', 'option-list', 'date', 'signature', 'button', 'unknown'];
  const selected = sanitizeText(selectedValue);
  return types.map((type) => `<option value="${escapeHtml(type)}"${type === selected ? ' selected' : ''}>${escapeHtml(type)}</option>`).join('');
}

function updateImportedFieldDraft(fieldId, prop, value, { rerender = true } = {}) {
  const draft = state.importedContractDraft;
  if (!draft) {
    return;
  }
  const field = draft.fields.find((item) => item.id === fieldId);
  if (!field) {
    return;
  }
  if (prop === 'type' && value === 'signature') {
    setImportedSignatureField(fieldId);
    if (rerender) {
      updateImportedContractUi();
    }
    return;
  }
  field[prop] = value;
  if (prop === 'type' && draft.signatureFieldId === fieldId && value !== 'signature') {
    draft.signatureFieldId = '';
  }
  if (rerender) {
    updateImportedContractUi();
  }
}

function toggleImportedFieldRemoved(fieldId) {
  const draft = state.importedContractDraft;
  if (!draft) {
    return;
  }
  const field = draft.fields.find((item) => item.id === fieldId);
  if (!field) {
    return;
  }
  field.removed = !field.removed;
  if (field.removed && draft.signatureFieldId === fieldId) {
    draft.signatureFieldId = '';
    field.type = getImportedFieldSourceType(field);
  }
  updateImportedContractUi();
}

function handleImportedSignatureFieldChange() {
  const fieldId = sanitizeText(elements.importContractSignatureField?.value);
  setImportedSignatureField(fieldId);
  updateImportedContractUi();
}

function setImportedSignatureField(fieldId) {
  const draft = state.importedContractDraft;
  if (!draft) {
    return;
  }

  draft.signatureFieldId = fieldId;
  draft.fields.forEach((field) => {
    if (field.id === fieldId) {
      field.removed = false;
      field.type = 'signature';
      if (!sanitizeText(field.category)) {
        field.category = 'firma';
      }
      return;
    }
    if (field.type === 'signature') {
      field.type = getImportedFieldSourceType(field);
    }
  });
}

function getImportedSignatureFieldId(draft) {
  if (!draft) {
    return '';
  }
  const explicit = sanitizeText(draft.signatureFieldId);
  if (explicit && draft.fields.some((field) => field.id === explicit && !field.removed)) {
    return explicit;
  }
  const detected = draft.fields.find((field) => field.type === 'signature' && !field.removed);
  return detected?.id || '';
}

function getImportedFieldSourceType(field) {
  const sourceType = sanitizeText(field?.sourceType || field?.type).toLowerCase();
  if (!sourceType || sourceType === 'signature') {
    return 'text';
  }
  return sourceType;
}

function isLocalDevelopmentHost() {
  const hostname = window.location.hostname || '';
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]'
    || hostname.endsWith('.local');
}

function shouldUseDirectBlobUpload(file) {
  return Boolean(file && file.size > SERVERLESS_DIRECT_UPLOAD_LIMIT_BYTES && !isLocalDevelopmentHost());
}

function buildImportedContractBlobPath(draft) {
  const contractType = (sanitizeText(draft?.contractType) || 'generic')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const templateHash = (sanitizeText(draft?.templateHash) || generateId())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return `imported-contracts/${contractType || 'generic'}/${templateHash || generateId()}.pdf`;
}

// #region debug-point A:blob-client-report
function reportUploadDebug(hypothesisId, msg, data) {
  fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'upload-stall',
      runId: 'pre-fix',
      hypothesisId,
      location: 'app.js:blob-upload',
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

function setImportContractUploadPhase(message) {
  if (elements.importContractStatus) {
    elements.importContractStatus.textContent = message;
  }
}

function buildBlobUploadClientPayload(draft) {
  return JSON.stringify({
    contractType: draft.contractType,
    templateHash: draft.templateHash,
    templateName: draft.fileName,
  });
}

async function fetchBlobClientToken(draft) {
  const pathname = buildImportedContractBlobPath(draft);
  const response = await fetch(BLOB_TOKEN_ROUTE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pathname,
      clientPayload: buildBlobUploadClientPayload(draft),
    }),
  });

  const body = await safeJson(response);
  return { ok: response.ok, status: response.status, body, pathname };
}

async function uploadImportedContractPdfViaBlob(draft) {
  if (!draft?.sourceFile) {
    throw new Error('File PDF originale non disponibile. Ricarica il contratto e riprova.');
  }

  let put;
  try {
    ({ put } = await import(BLOB_CLIENT_MODULE_URL));
  } catch (error) {
    console.error(error);
    throw new Error('Impossibile inizializzare l upload diretto del PDF. Verifica la connessione e riprova.');
  }

  try {
    setImportContractUploadPhase('Richiesta token upload Blob...');
    const probe = await fetchBlobClientToken(draft);
    // #region debug-point C:blob-client-probe
    reportUploadDebug('C', 'client token probe', {
      ok: probe.ok,
      status: probe.status,
      pathname: probe.pathname,
      hasToken: Boolean(sanitizeText(probe.body?.clientToken)),
      error: sanitizeText(probe.body?.error),
    });
    // #endregion
    if (!probe.ok) {
      throw new Error(`Endpoint token Blob non pronto (${probe.status}): ${sanitizeText(probe.body?.error) || 'errore sconosciuto'}`);
    }
    const clientToken = sanitizeText(probe.body?.clientToken);
    if (!clientToken) {
      throw new Error('Token upload Blob non ricevuto dal server.');
    }
    setImportContractUploadPhase('Token Blob ricevuto. Avvio upload diretto...');

    // #region debug-point A:blob-client-start
    reportUploadDebug('A', 'client upload start', {
      fileName: draft.fileName,
      fileSize: Number(draft.sourceFile?.size) || 0,
      contentType: draft.contentType || '',
      pathname: buildImportedContractBlobPath(draft),
    });
    // #endregion
    const blob = await put(buildImportedContractBlobPath(draft), draft.sourceFile, {
      access: 'public',
      token: clientToken,
      onUploadProgress: ({ loaded, total, percentage }) => {
        const resolvedTotal = Number(total) || Number(draft.sourceFile?.size) || 0;
        setImportContractUploadPhase(`Upload diretto in corso... ${Math.round(Number(percentage) || 0)}% (${loaded}/${resolvedTotal} byte)`);
      },
    });

    // #region debug-point B:blob-client-success
    reportUploadDebug('B', 'client upload success', {
      url: blob.url || '',
      pathname: blob.pathname || '',
      size: Number(blob.size) || 0,
      contentType: blob.contentType || '',
    });
    // #endregion

    return {
      storageMode: 'vercel-blob',
      url: blob.url,
      downloadUrl: blob.downloadUrl || blob.url,
      pathname: blob.pathname || buildImportedContractBlobPath(draft),
      size: Number(blob.size) || draft.sourceFile.size || 0,
      contentType: blob.contentType || draft.contentType || 'application/pdf',
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = sanitizeText(error?.message);
    // #region debug-point D:blob-client-error
    reportUploadDebug('D', 'client upload error', {
      message,
      name: sanitizeText(error?.name),
      stackTop: sanitizeText(String(error?.stack || '').split('\n')[0] || ''),
    });
    // #endregion
    if (message.includes('BLOB_READ_WRITE_TOKEN') || message.includes('BLOB_STORE_ID') || message.includes('Blob')) {
      throw new Error('Vercel Blob non e configurato correttamente. Verifica BLOB_READ_WRITE_TOKEN e, se presente nel progetto, anche BLOB_STORE_ID.');
    }
    throw new Error(message || 'Errore durante l upload diretto del PDF.');
  }
}

async function persistImportedContractSource(draft) {
  const sourceFile = draft?.sourceFile || null;
  if (!sourceFile && draft?.isExisting && draft?.metadata?.templateStorage) {
    return draft.metadata.templateStorage;
  }
  if (shouldUseDirectBlobUpload(sourceFile)) {
    setImportContractUploadPhase('Upload diretto del PDF su storage esterno...');
    return uploadImportedContractPdfViaBlob(draft);
  }

  setImportContractUploadPhase('Salvataggio del PDF originale nel database...');
  const params = new URLSearchParams({
    templateHash: draft.templateHash,
    contractType: draft.contractType,
    templateName: draft.fileName,
  });
  const templateResponse = await fetch(`/api/templates?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': draft.contentType || 'application/pdf',
      'x-template-hash': draft.templateHash,
    },
    body: draft.bytes,
  });
  if (!templateResponse.ok) {
    const body = await safeJson(templateResponse);
    throw new Error(body?.error || 'Errore salvataggio PDF originale nel database.');
  }

  return {
    storageMode: 'database',
    size: Number(draft.bytes?.byteLength) || Number(sourceFile?.size) || 0,
    contentType: draft.contentType || sourceFile?.type || 'application/pdf',
    uploadedAt: new Date().toISOString(),
  };
}

async function saveImportedContractTemplateFlow() {
  const draft = state.importedContractDraft;
  if (!draft) {
    return;
  }

  const contractName = sanitizeText(elements.importContractName?.value || draft.contractName);
  draft.contractName = contractName || draft.contractName;
  draft.contractType = resolveImportedDraftContractType(draft, contractName);
  draft.signatureFieldId = getImportedSignatureFieldId(draft);
  const approvedFields = draft.fields
    .filter((field) => !field.removed)
    .map((field) => ({
      originalName: sanitizeText(field.originalName),
      customName: sanitizeText(field.customName) || sanitizeText(field.originalName),
      type: sanitizeText(field.type) || 'unknown',
      pageNumber: Number(field.pageNumber) || 1,
      coordinates: {
        x: Number(field.rect.x) || 0,
        y: Number(field.rect.y) || 0,
        width: Number(field.rect.width) || 0,
        height: Number(field.rect.height) || 0,
      },
      category: sanitizeText(field.category),
      description: sanitizeText(field.description),
    }));

  if (!contractName) {
    setStatus('Inserisci il nome del contratto prima del salvataggio.', 'warning');
    return;
  }
  if (!approvedFields.length) {
    setStatus('Mantieni almeno un campo attivo prima del salvataggio.', 'warning');
    return;
  }
  if (!elements.importContractConfirmed?.checked) {
    setStatus('Conferma i campi rilevati prima del salvataggio.', 'warning');
    return;
  }

  try {
    const wasExisting = Boolean(draft.isExisting);
    elements.importContractStatus.textContent = 'Salvataggio del template importato...';
    const templateStorage = await persistImportedContractSource(draft);

    const metadata = {
      ...(draft.metadata && typeof draft.metadata === 'object' ? draft.metadata : {}),
      pageCount: draft.pageCount,
      fieldCount: approvedFields.length,
      originalFieldCount: draft.fields.length,
      sourceFileName: draft.fileName,
      sourceFileSize: Number(draft.sourceFile?.size) || Number(draft.bytes?.byteLength) || 0,
      sourceContentType: draft.contentType || draft.sourceFile?.type || 'application/pdf',
      templateStorage,
      signatureFieldName: approvedFields.find((field) => field.type === 'signature')?.originalName || '',
      importedAt: new Date().toISOString(),
    };
    const response = await fetch('/api/imported-contract-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: draft.id,
        contractType: draft.contractType,
        contractName,
        templateHash: draft.templateHash,
        templateName: draft.fileName,
        fields: approvedFields,
        metadata,
      }),
    });
    if (!response.ok) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore salvataggio configurazione template.');
    }

    const saved = await response.json();
    draft.id = sanitizeText(saved.id) || draft.id;
    draft.contractName = contractName;
    draft.contractType = sanitizeText(saved.contract_type) || draft.contractType;
    draft.isExisting = true;
    draft.metadata = metadata;
    await refreshContractTypeOptions({ preferredValue: draft.contractType, silentErrors: true });
    await refreshImportedContractsManagerList({ silentErrors: true });
    elements.contractType.value = draft.contractType;
    handleContractTypeChange({ suppressStatus: true });
    elements.importContractStatus.textContent = wasExisting
      ? 'Configurazione del contratto importato aggiornata correttamente.'
      : 'Configurazione salvata correttamente nel database.';
    setStatus(`Template importato salvato e disponibile nel menu Contratto: ${contractName}`, 'success');
  } catch (error) {
    elements.importContractStatus.textContent = error.message || 'Errore salvataggio template importato.';
    setStatus(elements.importContractStatus.textContent, 'danger');
  }
}

function resolveImportedDraftContractType(draft, contractName) {
  if (draft?.isExisting && sanitizeText(draft.contractType)) {
    return sanitizeText(draft.contractType);
  }
  return buildImportedContractType(contractName, draft?.templateHash || draft?.id);
}

async function openImportedContractsManagerModal() {
  await refreshImportedContractsManagerList({ silentErrors: true });
  const modal = window.bootstrap.Modal.getOrCreateInstance(elements.importedContractsManagerModal);
  modal.show();
}

async function refreshImportedContractsManagerList({ silentErrors = false } = {}) {
  if (!elements.importedContractsManagerList) {
    return;
  }

  try {
    elements.importedContractsManagerStatus.textContent = 'Caricamento contratti importati...';
    const response = await fetch('/api/imported-contract-templates');
    if (!response.ok) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore caricamento contratti importati.');
    }
    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    state.importedContractsManagerCache = items;
    state.importedContractTemplatesCache = items;
    renderImportedContractsManagerList(items);
    elements.importedContractsManagerStatus.textContent = `${items.length} contratti importati trovati.`;
  } catch (error) {
    state.importedContractsManagerCache = [];
    renderImportedContractsManagerList([]);
    elements.importedContractsManagerStatus.textContent = error.message || 'Errore caricamento contratti importati.';
    if (!silentErrors) {
      setStatus(elements.importedContractsManagerStatus.textContent, 'danger');
    }
  }
}

function renderImportedContractsManagerList(items) {
  if (!elements.importedContractsManagerList) {
    return;
  }
  const filter = sanitizeText(elements.importedContractsManagerFilter?.value).toLowerCase();
  const filtered = (items || []).filter((item) => {
    const haystack = [
      sanitizeText(item?.contract_name),
      sanitizeText(item?.template_name),
      sanitizeText(item?.contract_type),
    ].join(' ').toLowerCase();
    return !filter || haystack.includes(filter);
  });

  if (!filtered.length) {
    elements.importedContractsManagerList.innerHTML = '<div class="text-secondary">Nessun contratto importato trovato.</div>';
    return;
  }

  elements.importedContractsManagerList.innerHTML = filtered.map((item) => {
    const updated = item.updated_at ? formatTimestamp(item.updated_at) : '';
    const fieldCount = Array.isArray(item.fields) ? item.fields.length : Number(item.metadata?.fieldCount) || 0;
    return `
      <div class="list-group-item d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between">
        <div>
          <div class="fw-semibold">${escapeHtml(sanitizeText(item.contract_name) || 'Senza nome')}</div>
          <div class="small text-secondary">${escapeHtml([sanitizeText(item.template_name), updated ? `Aggiornato: ${updated}` : '', fieldCount ? `${fieldCount} campi` : ''].filter(Boolean).join(' | '))}</div>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-primary" data-imported-contract-action="edit" data-imported-contract-id="${escapeHtml(sanitizeText(item.id))}">Modifica campi</button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-imported-contract-action="delete" data-imported-contract-id="${escapeHtml(sanitizeText(item.id))}">Elimina</button>
        </div>
      </div>
    `;
  }).join('');
}

async function openImportedContractEditorById(id) {
  try {
    elements.importedContractsManagerStatus.textContent = 'Apertura contratto importato...';
    const response = await fetch(`/api/imported-contract-templates/${encodeURIComponent(id)}`);
    if (!response.ok) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore caricamento contratto importato.');
    }
    const row = await response.json();
    const draft = await buildImportedDraftFromSavedTemplate(row);
    revokeImportedContractPdfUrl();
    state.importedContractPdfUrl = URL.createObjectURL(new Blob([draft.bytes], { type: draft.contentType || 'application/pdf' }));
    state.importedContractDraft = draft;
    elements.importContractName.value = draft.contractName;
    if (elements.importContractFile) {
      elements.importContractFile.value = '';
    }
    if (elements.importContractConfirmed) {
      elements.importContractConfirmed.checked = true;
    }
    updateImportedContractUi();
    elements.importContractStatus.textContent = 'Modalita modifica: aggiorna i campi del contratto importato e salva di nuovo.';

    const managerModal = window.bootstrap.Modal.getOrCreateInstance(elements.importedContractsManagerModal);
    managerModal.hide();
    const importModal = window.bootstrap.Modal.getOrCreateInstance(elements.importContractModal);
    importModal.show();
  } catch (error) {
    elements.importedContractsManagerStatus.textContent = error.message || 'Errore apertura contratto importato.';
    setStatus(elements.importedContractsManagerStatus.textContent, 'danger');
  }
}

async function deleteImportedContractTemplateFromManager(id) {
  const item = (state.importedContractsManagerCache || []).find((entry) => sanitizeText(entry?.id) === sanitizeText(id));
  const contractName = sanitizeText(item?.contract_name) || 'questo contratto importato';
  const confirmed = window.confirm(`Vuoi eliminare ${contractName}?`);
  if (!confirmed) {
    return;
  }

  try {
    elements.importedContractsManagerStatus.textContent = 'Eliminazione contratto importato...';
    const response = await fetch(`/api/imported-contract-templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore eliminazione contratto importato.');
    }

    const removedContractType = sanitizeText(item?.contract_type);
    state.importedContractsManagerCache = (state.importedContractsManagerCache || [])
      .filter((entry) => sanitizeText(entry?.id) !== sanitizeText(id));
    state.importedContractTemplatesCache = (state.importedContractTemplatesCache || [])
      .filter((entry) => sanitizeText(entry?.id) !== sanitizeText(id));

    if (state.importedContractDraft && sanitizeText(state.importedContractDraft.id) === sanitizeText(id)) {
      resetImportedContractDraft({ preserveStatus: false });
    }

    const activeContractType = sanitizeText(elements.contractType?.value);
    const fallbackContractType = removedContractType && activeContractType === removedContractType ? 'pvr-vincitu' : activeContractType;
    await refreshContractTypeOptions({ preferredValue: fallbackContractType, silentErrors: true });
    if (removedContractType && activeContractType === removedContractType) {
      elements.contractType.value = 'pvr-vincitu';
      handleContractTypeChange({ suppressStatus: true });
    }

    renderImportedContractsManagerList(state.importedContractsManagerCache);
    elements.importedContractsManagerStatus.textContent = 'Contratto importato eliminato.';
    setStatus(`Contratto importato eliminato: ${contractName}`, 'secondary');
  } catch (error) {
    elements.importedContractsManagerStatus.textContent = error.message || 'Errore eliminazione contratto importato.';
    setStatus(elements.importedContractsManagerStatus.textContent, 'danger');
  }
}

async function buildImportedDraftFromSavedTemplate(row) {
  const importedAsset = await loadImportedTemplateAsset(row);
  const pages = await inspectImportedContractPages(importedAsset.bytes);
  const savedFields = Array.isArray(row?.fields) ? row.fields : [];
  const normalizedFields = savedFields.map((field, index) => {
    const originalName = sanitizeText(field?.originalName);
    const customName = sanitizeText(field?.customName) || originalName || `field_${index + 1}`;
    const type = sanitizeText(field?.type) || 'text';
    const coordinates = field?.coordinates && typeof field.coordinates === 'object' ? field.coordinates : {};
    return {
      id: `${originalName || customName}__saved_${index}`,
      originalName: originalName || customName,
      customName,
      type,
      sourceType: type === 'signature' ? 'text' : type,
      pageNumber: Number(field?.pageNumber) || 1,
      rect: {
        x: Number(coordinates.x) || 0,
        y: Number(coordinates.y) || 0,
        width: Number(coordinates.width) || 0,
        height: Number(coordinates.height) || 0,
      },
      description: sanitizeText(field?.description),
      category: sanitizeText(field?.category),
      removed: false,
    };
  });

  return {
    id: sanitizeText(row?.id) || generateId(),
    contractType: sanitizeText(row?.contract_type) || buildImportedContractType(sanitizeText(row?.contract_name), sanitizeText(row?.template_hash)),
    fileName: sanitizeText(row?.template_name) || 'template-importato.pdf',
    contractName: sanitizeText(row?.contract_name) || sanitizeText(row?.template_name) || 'Contratto importato',
    sourceFile: null,
    contentType: sanitizeText(row?.metadata?.sourceContentType) || 'application/pdf',
    bytes: importedAsset.bytes,
    templateHash: sanitizeText(row?.template_hash) || generateId(),
    fields: normalizedFields,
    pages,
    pageCount: pages.length,
    isExisting: true,
    signatureFieldId: normalizedFields.find((field) => field.type === 'signature')?.id || '',
    metadata: row?.metadata && typeof row.metadata === 'object' ? row.metadata : {},
  };
}

function renderStepper() {
  const activeSteps = getActiveStepIndices();
  elements.stepperNav.innerHTML = activeSteps.map((actualStepIndex, visualIndex) => {
    const step = getStepDefinition(actualStepIndex);
    return `
    <button type="button" class="step-nav" data-target-step="${actualStepIndex}">
      <span class="step-nav__index">${visualIndex + 1}</span>
      <span>
        <span class="step-nav__title">${escapeHtml(step.title)}</span>
        <span class="step-nav__status">Dopo</span>
      </span>
    </button>
  `;
  }).join('');

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

function getActiveStepIndices() {
  if (isNovapaySelected()) {
    return [...NOVAPAY_ACTIVE_STEPS];
  }
  return STEP_DEFINITIONS.map((_, index) => index);
}

function getStepDefinition(stepIndex) {
  const base = STEP_DEFINITIONS[stepIndex];
  if (!base) {
    return STEP_DEFINITIONS[0];
  }
  if (isNovapaySelected() && NOVAPAY_STEP_OVERRIDES[stepIndex]) {
    return { ...base, ...NOVAPAY_STEP_OVERRIDES[stepIndex] };
  }
  return base;
}

function getAdjacentActiveStep(currentStep, direction) {
  const activeSteps = getActiveStepIndices();
  const currentIndex = activeSteps.indexOf(clampStep(currentStep));
  if (currentIndex < 0) {
    return activeSteps[0] ?? null;
  }
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= activeSteps.length) {
    return null;
  }
  return activeSteps[targetIndex];
}

function handleFormInteraction(event) {
  const target = event.target;
  if (!target.name && target.id !== 'placeAndDate') {
    return;
  }

  if (target.matches('input, textarea, select')) {
    normalizeInputCase(target);
    if (target.name === 'salesContact' || target.name === 'presentedBy') {
      syncPresentedByFields({ sourceName: target.name });
    }
    if (target.name === 'operationalSameAsLegal' || isCompanyLegalField(target.name)) {
      syncOperationalAddressFields({ sourceName: target.name });
    }
    validateRelatedField(target, { silent: true });
    if (target.type !== 'file') {
      resetGeneratedPdf();
    }
    triggerAutosave();
    refreshUi();
  }
}

function syncPresentedByFields({ sourceName } = {}) {
  const salesField = elements.form.querySelector('[name="salesContact"]');
  const presentedField = elements.form.querySelector('[name="presentedBy"]');
  if (!salesField || !presentedField) {
    return;
  }

  const salesValue = salesField.value ?? '';
  const presentedValue = presentedField.value ?? '';

  if (sourceName === 'salesContact') {
    if (presentedValue !== salesValue) {
      presentedField.value = salesValue;
    }
    return;
  }

  if (sourceName === 'presentedBy') {
    if (salesValue !== presentedValue) {
      salesField.value = presentedValue;
    }
    return;
  }

  const trimmedSales = sanitizeText(salesValue);
  const trimmedPresented = sanitizeText(presentedValue);

  if (trimmedSales && !trimmedPresented) {
    presentedField.value = salesValue;
    return;
  }

  if (!trimmedSales && trimmedPresented) {
    salesField.value = presentedValue;
    return;
  }

  if (trimmedSales && trimmedPresented && salesValue !== presentedValue) {
    presentedField.value = salesValue;
  }
}

function isCompanyLegalField(fieldName) {
  return [
    'legalStreet',
    'legalNumber',
    'legalCap',
    'legalCity',
    'legalProvince',
  ].includes(fieldName);
}

function syncOperationalAddressFields() {
  const checkbox = document.getElementById('operationalSameAsLegal');
  if (!checkbox) {
    return;
  }

  const operationalFields = [
    'operationalStreet',
    'operationalNumber',
    'operationalCap',
    'operationalCity',
    'operationalProvince',
  ].map((name) => elements.form.querySelector(`[name="${CSS.escape(name)}"]`)).filter(Boolean);

  const locked = checkbox.checked;
  operationalFields.forEach((field) => {
    if (field.matches('select')) {
      field.style.pointerEvents = locked ? 'none' : '';
      field.setAttribute('aria-readonly', locked ? 'true' : 'false');
    } else {
      field.readOnly = locked;
    }
    field.classList.toggle('is-readonly', locked);
  });

  const operationalConfig = COMUNE_AUTOCOMPLETE_CONFIGS.find((config) => config.capField === 'operationalCap');
  if (!locked) {
    if (operationalConfig) {
      refreshProvinceOptions(operationalConfig, { preserveCurrentValue: true });
      refreshCityOptions(operationalConfig, { preserveCurrentValue: true });
      refreshCapOptions(operationalConfig, { preserveCurrentValue: true });
    }
    return;
  }

  [
    ['legalStreet', 'operationalStreet'],
    ['legalNumber', 'operationalNumber'],
  ].forEach(([legalName, operationalName]) => {
    const legalField = elements.form.querySelector(`[name="${CSS.escape(legalName)}"]`);
    const operationalField = elements.form.querySelector(`[name="${CSS.escape(operationalName)}"]`);
    if (!legalField || !operationalField) {
      return;
    }
    if (operationalField.value !== legalField.value) {
      operationalField.value = legalField.value;
      clearInvalid(operationalField);
    }
  });

  const legalProvinceField = elements.form.querySelector('[name="legalProvince"]');
  const operationalProvinceField = elements.form.querySelector('[name="operationalProvince"]');
  if (legalProvinceField && operationalProvinceField && operationalProvinceField.value !== legalProvinceField.value) {
    operationalProvinceField.value = legalProvinceField.value;
    clearInvalid(operationalProvinceField);
  }

  if (operationalConfig) {
    refreshProvinceOptions(operationalConfig, { preserveCurrentValue: true });
    refreshCityOptions(operationalConfig, { preserveCurrentValue: true });
  }

  const legalCityField = elements.form.querySelector('[name="legalCity"]');
  const operationalCityField = elements.form.querySelector('[name="operationalCity"]');
  if (legalCityField && operationalCityField && operationalCityField.value !== legalCityField.value) {
    operationalCityField.value = legalCityField.value;
    clearInvalid(operationalCityField);
  }

  if (operationalConfig) {
    refreshCapOptions(operationalConfig, { preserveCurrentValue: true, autoSelectSingle: true });
  }

  const legalCapField = elements.form.querySelector('[name="legalCap"]');
  const operationalCapField = elements.form.querySelector('[name="operationalCap"]');
  if (legalCapField && operationalCapField && operationalCapField.value !== legalCapField.value) {
    operationalCapField.value = legalCapField.value;
    clearInvalid(operationalCapField);
  }

  [
    ['legalStreet', 'operationalStreet'],
    ['legalNumber', 'operationalNumber'],
    ['legalProvince', 'operationalProvince'],
    ['legalCity', 'operationalCity'],
    ['legalCap', 'operationalCap'],
  ].forEach(([legalName, operationalName]) => {
    const legalField = elements.form.querySelector(`[name="${CSS.escape(legalName)}"]`);
    const operationalField = elements.form.querySelector(`[name="${CSS.escape(operationalName)}"]`);
    if (!legalField || !operationalField) {
      return;
    }
    if (operationalField.value !== legalField.value) {
      operationalField.value = legalField.value;
      clearInvalid(operationalField);
    }
  });
}

function handleContractTypeChange({ suppressStatus = false } = {}) {
  state.selectedTemplateFile = null;
  state.selectedTemplateName = '';
  state.selectedTemplateSource = 'auto';
  state.selectedTemplateDbHash = '';
  state.currentTemplateHash = '';
  state.currentTemplateBytes = null;
  state.templateMapping = null;
  state.mappingDraft = null;
  state.currentContractId = '';
  state.currentContractName = '';
  state.contractsCache = [];
  state.savedTemplatesCache = [];
  state.dynamicContractRenderKey = '';
  state.currentStep = clampStep(state.currentStep);
  resetGeneratedPdf();
  renderStepper();
  triggerAutosave();
  refreshUi();
  if (!suppressStatus) {
    setStatus(`Contratto selezionato: ${getCurrentContractConfig().label}.`, 'secondary');
  }
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

function initializeStaticAutocomplete() {
  const documentTypeField = document.getElementById('documentType');
  if (documentTypeField && documentTypeField.matches('input')) {
    ensureDatalistOptions(
      DOCUMENT_TYPE_DATALIST_ID,
      DOCUMENT_TYPE_OPTIONS.map((value) => ({ value }))
    );
    documentTypeField.setAttribute('list', DOCUMENT_TYPE_DATALIST_ID);
  }

  initializeLocationSelects();
  initializeCapSelects();
}

async function initializeComuneAutocomplete() {
  const cached = readComuniCache();
  if (cached.length) {
    hydrateComuneAutocomplete(cached);
    syncAllComuneDependentFields();
  }

  if (cached.length && Date.now() - readComuniCacheTimestamp() < COMUNI_CACHE_MAX_AGE_MS) {
    return;
  }

  try {
    const response = await fetch(COMUNI_DATASET_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const normalized = normalizeComuniDataset(payload);
    if (!normalized.length) {
      return;
    }

    writeComuniCache(normalized);
    hydrateComuneAutocomplete(normalized);
    syncAllComuneDependentFields();
  } catch (error) {
    console.warn('Autocomplete Comuni non disponibile.', error);
  }
}

function initializeLocationSelects() {
  COMUNE_AUTOCOMPLETE_CONFIGS.forEach((config) => {
    refreshProvinceOptions(config, { preserveCurrentValue: true });
    refreshCityOptions(config, { preserveCurrentValue: true });
    bindLocationSelects(config);
  });
}

function bindLocationSelects(config) {
  const cityField = document.getElementById(config.cityField);
  const provinceField = config.provinceField ? document.getElementById(config.provinceField) : null;
  if (!cityField || !provinceField) {
    return;
  }

  if (provinceField.dataset.locationSelectBound !== 'true') {
    provinceField.addEventListener('change', () => {
      refreshCityOptions(config, { preserveCurrentValue: false });
      refreshCapOptions(config, { preserveCurrentValue: false, autoSelectSingle: true });
    });
    provinceField.dataset.locationSelectBound = 'true';
  }

  if (cityField.dataset.locationSelectBound !== 'true') {
    cityField.addEventListener('change', () => {
      applyComuneSelection(config);
      refreshCapOptions(config, { preserveCurrentValue: false, autoSelectSingle: true });
    });
    cityField.dataset.locationSelectBound = 'true';
  }
}

function initializeCapSelects() {
  COMUNE_AUTOCOMPLETE_CONFIGS
    .filter((config) => config.capField)
    .forEach((config) => refreshCapOptions(config, { preserveCurrentValue: true }));
}

function refreshProvinceOptions(config, { preserveCurrentValue = true } = {}) {
  const provinceField = config.provinceField ? document.getElementById(config.provinceField) : null;
  if (!provinceField) {
    return;
  }

  const currentValue = preserveCurrentValue ? sanitizeText(provinceField.value) : '';
  const options = (autocompleteStore.provinces || []).map((item) => ({
    value: item.value,
    label: item.label,
  }));

  rebuildSelectOptions(provinceField, {
    placeholder: 'Seleziona provincia',
    options,
    selectedValue: currentValue,
  });
}

function refreshCityOptions(config, { preserveCurrentValue = true } = {}) {
  const cityField = document.getElementById(config.cityField);
  if (!cityField) {
    return;
  }

  const provinceField = config.provinceField ? document.getElementById(config.provinceField) : null;
  const provinceValue = sanitizeText(provinceField?.value);
  const currentValue = preserveCurrentValue ? sanitizeText(cityField.value) : '';
  const availableCities = provinceValue
    ? findComuniByProvince(provinceValue).map((item) => ({
      value: item.city,
      label: item.city,
    }))
    : [];

  rebuildSelectOptions(cityField, {
    placeholder: provinceValue ? 'Seleziona Comune' : 'Seleziona prima la provincia',
    options: availableCities,
    selectedValue: currentValue,
  });
}

function ensureDatalistOptions(id, options) {
  let datalist = document.getElementById(id);
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = id;
    document.body.appendChild(datalist);
  }

  datalist.innerHTML = options.map((option) => {
    const value = escapeHtml(option.value || '');
    const label = escapeHtml(option.label || '');
    const text = escapeHtml(option.text || '');
    return `<option value="${value}" label="${label}">${text}</option>`;
  }).join('');

  return datalist;
}

function readComuniCache() {
  try {
    const raw = localStorage.getItem(COMUNI_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch (error) {
    return [];
  }
}

function readComuniCacheTimestamp() {
  try {
    const raw = localStorage.getItem(COMUNI_CACHE_KEY);
    if (!raw) {
      return 0;
    }

    const parsed = JSON.parse(raw);
    return Number(parsed?.updatedAt) || 0;
  } catch (error) {
    return 0;
  }
}

function writeComuniCache(items) {
  try {
    localStorage.setItem(COMUNI_CACHE_KEY, JSON.stringify({
      updatedAt: Date.now(),
      items,
    }));
  } catch (error) {
    console.warn('Cache Comuni non salvata.', error);
  }
}

function normalizeComuniDataset(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const city = sanitizeText(item?.nome).toUpperCase();
    const provinceSigla = sanitizeText(item?.sigla).toUpperCase();
    const provinceName = sanitizeText(item?.provincia?.nome).toUpperCase();
    const regionName = sanitizeText(item?.regione?.nome).toUpperCase();
    const capList = Array.isArray(item?.cap)
      ? item.cap.map((cap) => sanitizeText(cap)).filter(Boolean)
      : [];

    return {
      city,
      cityKey: normalizeLookupKey(city),
      provinceSigla,
      provinceSiglaKey: normalizeLookupKey(provinceSigla),
      provinceName,
      provinceNameKey: normalizeLookupKey(provinceName),
      regionName,
      capList,
    };
  }).filter((item) => item.city && item.provinceSigla);
}

function hydrateComuneAutocomplete(items) {
  autocompleteStore.comuni = Array.isArray(items) ? items : [];
  autocompleteStore.provinces = buildProvinceOptions(autocompleteStore.comuni);
  autocompleteStore.loaded = autocompleteStore.comuni.length > 0;
}

function buildProvinceOptions(items) {
  const seen = new Set();
  return items.reduce((result, item) => {
    const key = `${item.provinceSigla}|${item.provinceName}`;
    if (!item.provinceSigla || seen.has(key)) {
      return result;
    }

    seen.add(key);
    result.push({
      value: item.provinceSigla,
      label: item.provinceName,
    });
    return result;
  }, []).sort((a, b) => a.value.localeCompare(b.value, 'it'));
}

function refreshCapOptions(config, { preserveCurrentValue = true, autoSelectSingle = false } = {}) {
  const capField = config.capField ? document.getElementById(config.capField) : null;
  if (!capField) {
    return;
  }

  const cityField = document.getElementById(config.cityField);
  const provinceField = config.provinceField ? document.getElementById(config.provinceField) : null;
  const currentValue = sanitizeText(capField.value);
  const match = findExactComune(cityField?.value || '', provinceField?.value || '');
  const availableCaps = Array.isArray(match?.capList)
    ? Array.from(new Set(match.capList.filter(Boolean)))
    : [];

  let selectedValue = preserveCurrentValue ? currentValue : '';
  if (!selectedValue && autoSelectSingle && availableCaps.length === 1) {
    selectedValue = availableCaps[0];
  }

  let placeholder = 'Seleziona CAP';
  if (!sanitizeText(provinceField?.value) || !sanitizeText(cityField?.value)) {
    placeholder = 'Seleziona prima provincia e Comune';
  } else if (!match) {
    placeholder = 'Seleziona Comune e Provincia';
  }

  rebuildSelectOptions(capField, {
    placeholder,
    options: availableCaps.map((cap) => ({ value: cap, label: cap })),
    selectedValue,
  });
}

function applyComuneSelection(config) {
  if (!autocompleteStore.loaded) {
    return;
  }

  const cityField = document.getElementById(config.cityField);
  if (!cityField) {
    return;
  }

  const provinceField = config.provinceField ? document.getElementById(config.provinceField) : null;
  const capField = config.capField ? document.getElementById(config.capField) : null;
  const match = findExactComune(cityField.value, provinceField?.value || '');
  if (!match) {
    return;
  }

  let updated = false;
  if (provinceField && !provinceMatchesComune(provinceField.value, match)) {
    provinceField.value = match.provinceSigla;
    clearInvalid(provinceField);
    updated = true;
  }

  if (capField && capField.matches('input') && !sanitizeText(capField.value) && match.capList.length === 1) {
    capField.value = match.capList[0];
    clearInvalid(capField);
    updated = true;
  }

  if (updated && isCompanyLegalField(config.cityField)) {
    syncOperationalAddressFields();
  }

  if (updated) {
    triggerAutosave();
  }
}

function syncAllComuneDependentFields() {
  COMUNE_AUTOCOMPLETE_CONFIGS.forEach((config) => refreshProvinceOptions(config, { preserveCurrentValue: true }));
  COMUNE_AUTOCOMPLETE_CONFIGS.forEach((config) => refreshCityOptions(config, { preserveCurrentValue: true }));
  COMUNE_AUTOCOMPLETE_CONFIGS.forEach((config) => {
    applyComuneSelection(config);
    refreshCapOptions(config, { preserveCurrentValue: true, autoSelectSingle: true });
  });
}

function findComuniByProvince(provinceValue) {
  const provinceKey = normalizeLookupKey(provinceValue);
  if (!provinceKey) {
    return [];
  }

  return autocompleteStore.comuni
    .filter((item) => item.provinceSiglaKey === provinceKey || item.provinceNameKey === provinceKey)
    .sort((a, b) => a.city.localeCompare(b.city, 'it'));
}

function rebuildSelectOptions(select, { placeholder, options, selectedValue } = {}) {
  const normalizedSelected = sanitizeText(selectedValue);
  const normalizedOptions = Array.isArray(options) ? options.filter((option) => sanitizeText(option?.value)) : [];

  if (
    normalizedSelected
    && !normalizedOptions.some((option) => sanitizeText(option.value) === normalizedSelected)
  ) {
    normalizedOptions.unshift({ value: normalizedSelected, label: normalizedSelected });
  }

  select.innerHTML = [
    `<option value="">${escapeHtml(placeholder || 'Seleziona')}</option>`,
    ...normalizedOptions.map((option) => {
      const value = sanitizeText(option.value);
      const label = sanitizeText(option.label || option.value);
      return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    }),
  ].join('');
  select.value = normalizedSelected;
}

function findExactComune(cityValue, provinceValue = '') {
  const cityKey = normalizeLookupKey(cityValue);
  if (!cityKey) {
    return null;
  }

  let matches = autocompleteStore.comuni.filter((item) => item.cityKey === cityKey);
  if (!matches.length) {
    return null;
  }

  const provinceKey = normalizeLookupKey(provinceValue);
  if (provinceKey) {
    const filtered = matches.filter((item) => (
      item.provinceSiglaKey === provinceKey
      || item.provinceNameKey === provinceKey
    ));
    if (filtered.length === 1) {
      return filtered[0];
    }
    if (filtered.length > 1) {
      matches = filtered;
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

function provinceMatchesComune(value, comune) {
  const provinceKey = normalizeLookupKey(value);
  if (!provinceKey) {
    return false;
  }

  return provinceKey === comune.provinceSiglaKey || provinceKey === comune.provinceNameKey;
}

function normalizeLookupKey(value) {
  return sanitizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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
  const preparedDataUrl = await getPreparedSignatureDataUrl(dataUrl);
  const image = await loadImageFromDataUrl(preparedDataUrl);
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
  elements.contractType.value = 'pvr-vincitu';
  document.getElementById('roleLegale').checked = true;
  setDefaultDates();
  updateDocumentUploadsMeta();
  clearValidation();
  clearSignatureCanvas({ silent: true });
  toggleCriminalFields();
  resetGeneratedPdf();
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
    state.selectedTemplateFile = null;
    state.selectedTemplateName = '';
    state.selectedTemplateSource = 'auto';
    state.selectedTemplateDbHash = '';
    state.currentTemplateHash = '';
    state.currentTemplateBytes = null;
    updateDocumentUploadsMeta();
    toggleCriminalFields();
    clearValidation();
    resetGeneratedPdf();
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
    const fieldEl = elements.form.querySelector(`[name="${CSS.escape(key)}"]`);
    if (!fieldEl || fieldEl.matches('select, input[type="checkbox"], input[type="radio"]') || fieldEl.type === 'date') {
      data[key] = value;
    } else {
      data[key] = normalizeValueCase(value, { key, inputType: fieldEl.type });
    }
  }

  elements.form.querySelectorAll('[data-imported-contract-input="true"]').forEach((field) => {
    if (!field.name) {
      return;
    }
    if (field.type === 'checkbox') {
      data[field.name] = Boolean(field.checked);
      return;
    }
    if (field.matches('select') || field.type === 'date') {
      data[field.name] = field.value ?? '';
      return;
    }
    data[field.name] = normalizeValueCase(field.value ?? '', { key: field.name, inputType: field.type });
  });

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

    if (firstField.matches('select')) {
      setSelectFieldValue(firstField, value ?? '');
      return;
    }

    firstField.value = value ?? '';
  });
}

function setSelectFieldValue(field, value) {
  const normalized = sanitizeText(value);
  if (
    normalized
    && !Array.from(field.options).some((option) => sanitizeText(option.value) === normalized)
  ) {
    field.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(normalized)}">${escapeHtml(normalized)}</option>`);
  }
  field.value = normalized;
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
  if (!elements.templateInfo) {
    return;
  }
  const contractConfig = getCurrentContractConfig();
  if (state.selectedTemplateSource === 'db' && state.selectedTemplateDbHash) {
    elements.templateInfo.textContent = `Template in uso: ${state.selectedTemplateName || state.selectedTemplateDbHash} (dal database per ${contractConfig.label}).`;
    return;
  }

  if (state.selectedTemplateFile) {
    elements.templateInfo.textContent = `Template in uso: ${state.selectedTemplateName} (selezione manuale per ${contractConfig.label}).`;
    return;
  }

  if (contractConfig.importedTemplate) {
    const sourceName = sanitizeText(contractConfig.importedTemplate.template_name) || 'template importato';
    elements.templateInfo.textContent = `Template automatico importato: ${sourceName} (${contractConfig.label}).`;
    return;
  }

  elements.templateInfo.textContent = `Template automatico da ${contractConfig.directory}: ${contractConfig.templateCandidates.join(', ')}.`;
}

async function refreshContractTypeOptions({ preferredValue, silentErrors = false } = {}) {
  const selectedValue = sanitizeText(preferredValue || elements.contractType?.value) || 'pvr-vincitu';
  renderContractTypeOptions(selectedValue);

  try {
    const response = await fetch('/api/imported-contract-templates');
    if (!response.ok) {
      const body = await safeJson(response);
      throw new Error(body?.error || 'Errore caricamento contratti importati.');
    }
    const data = await response.json();
    state.importedContractTemplatesCache = Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    state.importedContractTemplatesCache = [];
    if (!silentErrors) {
      setStatus(error.message || 'Errore caricamento contratti importati.', 'warning');
    }
  }

  renderContractTypeOptions(selectedValue);
}

function renderContractTypeOptions(selectedValue) {
  if (!elements.contractType) {
    return;
  }

  const staticOptions = Object.entries(CONTRACT_TEMPLATES).map(([value, config]) => ({
    value,
    label: sanitizeText(config?.label) || value,
  }));

  const knownValues = new Set(staticOptions.map((option) => option.value));
  const importedOptions = (state.importedContractTemplatesCache || [])
    .map((row) => {
      const value = sanitizeText(row?.contract_type);
      const label = sanitizeText(row?.contract_name) || sanitizeText(row?.template_name) || value;
      return value && label && !knownValues.has(value)
        ? { value, label: `${label} (importato)` }
        : null;
    })
    .filter(Boolean);

  importedOptions.forEach((option) => knownValues.add(option.value));

  const options = [...staticOptions, ...importedOptions];
  elements.contractType.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join('');

  const resolvedValue = knownValues.has(selectedValue) ? selectedValue : (staticOptions[0]?.value || 'pvr-vincitu');
  elements.contractType.value = resolvedValue;
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
  state.selectedTemplateFile = null;
  state.selectedTemplateName = '';
  state.selectedTemplateSource = 'auto';
  state.selectedTemplateDbHash = '';
  state.currentTemplateHash = '';
  state.currentTemplateBytes = null;
  state.templateMapping = null;
  state.mappingDraft = null;
  state.dynamicContractRenderKey = '';

  syncDynamicContractUi({ force: true });
  populateForm(payload);
  if (payload.signatureDataUrl) {
    restoreSignature(payload.signatureDataUrl);
    state.signatureDataUrl = payload.signatureDataUrl;
    elements.signatureInfo.textContent = 'Firma ripristinata dal contratto salvato.';
  }

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
  const activeSteps = getActiveStepIndices();
  if (!activeSteps.length) {
    return 0;
  }
  const normalized = Number.isFinite(stepIndex) ? stepIndex : activeSteps[0];
  if (activeSteps.includes(normalized)) {
    return normalized;
  }
  if (normalized <= activeSteps[0]) {
    return activeSteps[0];
  }
  const lastStep = activeSteps[activeSteps.length - 1];
  if (normalized >= lastStep) {
    return lastStep;
  }
  return activeSteps.reduce((closest, candidate) => (
    Math.abs(candidate - normalized) < Math.abs(closest - normalized) ? candidate : closest
  ), activeSteps[0]);
}

function scrollWizardTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function refreshUi() {
  syncPresentedByFields();
  initializeLocationSelects();
  syncOperationalAddressFields();
  initializeCapSelects();
  syncDynamicContractUi();
  applyContractSpecificUi();
  updateWizardUi();
  updateStepVisibility();
  updateReviewSummaries();
  updateChecklist();
  updateStepperStatus();
}

function updateWizardUi() {
  const activeSteps = getActiveStepIndices();
  const step = getStepDefinition(state.currentStep);
  const currentVisualIndex = Math.max(0, activeSteps.indexOf(state.currentStep));
  const progress = Math.round(((currentVisualIndex + 1) / activeSteps.length) * 100);

  elements.wizardTitle.textContent = step.title;
  elements.wizardDescription.textContent = step.description;
  elements.completionPercent.textContent = `${progress}%`;
  elements.wizardProgressBar.style.width = `${progress}%`;
  elements.wizardProgressBar.parentElement.setAttribute('aria-valuenow', String(progress));
  elements.btnPrev.disabled = currentVisualIndex === 0;
  elements.btnNext.disabled = currentVisualIndex === activeSteps.length - 1;
  elements.btnNext.textContent = currentVisualIndex === activeSteps.length - 2 ? 'Vai al riepilogo' : 'Continua';
}

function updateStepVisibility() {
  const activeSteps = new Set(getActiveStepIndices());
  elements.wizardSteps.forEach((step, index) => {
    const isActiveContractStep = activeSteps.has(index);
    step.classList.toggle('d-none', !isActiveContractStep);
    step.classList.toggle('active', isActiveContractStep && index === state.currentStep);
  });
}

function updateStepperStatus() {
  const buttons = elements.stepperNav.querySelectorAll('[data-target-step]');
  buttons.forEach((button) => {
    const targetStep = Number(button.dataset.targetStep);
    const valid = validateStep(targetStep, { silent: true });
    const status = button.querySelector('.step-nav__status');
    button.classList.toggle('is-current', targetStep === state.currentStep);
    button.classList.toggle('is-complete', valid);
    status.textContent = valid ? 'OK' : targetStep === state.currentStep ? 'Ora' : 'Dopo';
  });
}

function isNovapaySelected() {
  return sanitizeText(elements.contractType?.value) === 'novapay';
}

function applyContractSpecificUi() {
  const novapaySelected = isNovapaySelected();
  toggleElement(document.getElementById('pecGroup'), !novapaySelected);
  toggleElement(document.getElementById('mobileGroup'), !novapaySelected);
  toggleElement(elements.operationalAddressPanel, !novapaySelected);
  toggleElement(elements.novapayCompanyTypePanel, novapaySelected);
  toggleElement(elements.birthProvinceGroup, !novapaySelected);
  toggleElement(elements.residenceStreetGroup, !novapaySelected);
  toggleElement(elements.residenceNumberGroup, !novapaySelected);
  toggleElement(elements.residenceProvinceGroup, !novapaySelected);
  toggleElement(elements.documentStepDefaultFields, !novapaySelected);
  toggleElement(elements.presentedByPanel, !novapaySelected);

  if (elements.vatOrTaxCodeLabel) {
    elements.vatOrTaxCodeLabel.textContent = novapaySelected ? 'Partita IVA' : 'Partita IVA / Codice Fiscale';
  }

  const activeSteps = getActiveStepIndices();
  elements.wizardSteps.forEach((stepElement, index) => {
    const titleElement = stepElement.querySelector('.step-card__title');
    const copyElement = stepElement.querySelector('.step-card__copy');
    const eyebrowElement = stepElement.querySelector('.step-card__eyebrow');
    if (titleElement && !titleElement.dataset.defaultText) {
      titleElement.dataset.defaultText = titleElement.textContent;
    }
    if (copyElement && !copyElement.dataset.defaultText) {
      copyElement.dataset.defaultText = copyElement.textContent;
    }

    const override = novapaySelected ? NOVAPAY_STEP_OVERRIDES[index] : null;
    if (titleElement) {
      titleElement.textContent = override?.title || titleElement.dataset.defaultText || titleElement.textContent;
    }
    if (copyElement) {
      copyElement.textContent = override?.description || copyElement.dataset.defaultText || copyElement.textContent;
    }
    if (eyebrowElement) {
      const visualIndex = activeSteps.indexOf(index);
      eyebrowElement.textContent = visualIndex >= 0 ? `Fase ${visualIndex + 1} di ${activeSteps.length}` : '';
    }
  });
}

function toggleElement(element, visible) {
  if (!element) {
    return;
  }
  element.classList.toggle('d-none', !visible);
}

function updateReviewSummaries() {
  const data = collectFormData();
  if (isImportedContractSelected()) {
    renderImportedContractSummaries(data);
    return;
  }
  if (isNovapaySelected()) {
    renderNovapaySummaries(data);
    return;
  }

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

function renderImportedContractSummaries(data) {
  const importedFields = getImportedContractFieldDefinitions();
  const annexRows = importedFields
    .filter((field) => field.stepIndex <= 4)
    .slice(0, 6)
    .map((field) => [field.label, formatImportedSummaryValue(field, data[field.formName])]);
  const antimafiaRows = importedFields
    .filter((field) => field.stepIndex >= 5 && field.stepIndex <= 8)
    .slice(0, 6)
    .map((field) => [field.label, formatImportedSummaryValue(field, data[field.formName])]);
  const finalRows = importedFields
    .slice(0, 12)
    .map((field) => [field.label, formatImportedSummaryValue(field, data[field.formName])]);

  renderSummaryGrid(elements.annexASummary, annexRows.length ? annexRows : [['Contratto', getCurrentContractConfig().label]]);
  renderSummaryGrid(elements.antimafiaSummary, antimafiaRows.length ? antimafiaRows : [['Contratto', getCurrentContractConfig().label]]);
  renderSummaryGrid(elements.finalSummary, finalRows.length ? finalRows : [['Contratto', getCurrentContractConfig().label]]);
}

function renderNovapaySummaries(data) {
  renderSummaryGrid(elements.annexASummary, [
    ['Ragione Sociale', data.companyName],
    ['Partita IVA', data.vatOrTaxCode],
    ['Forma giuridica', getNovapayCompanyTypeLabel(data.novapayCompanyType)],
    ['Sede Legale', compactAddress(data.legalStreet, data.legalNumber, data.legalCap, data.legalCity, data.legalProvince)],
    ['Contatti', [data.email, data.phone].filter(Boolean).join(' | ')],
  ]);

  renderSummaryGrid(elements.antimafiaSummary, [
    ['Firmatario', compactName(data.representativeFirstName, data.representativeLastName)],
    ['Codice fiscale', data.representativeTaxCode],
    ['Data di nascita', formatDate(data.birthDate)],
    ['Luogo di nascita', data.birthCity],
    ['Citta di residenza', data.residenceCity],
  ]);

  renderSummaryGrid(elements.finalSummary, [
    ['Azienda', data.companyName],
    ['Partita IVA', data.vatOrTaxCode],
    ['Forma giuridica', getNovapayCompanyTypeLabel(data.novapayCompanyType)],
    ['Firmatario', compactName(data.representativeFirstName, data.representativeLastName)],
    ['Luogo e data', data.placeAndDate],
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
  if (isImportedContractSelected()) {
    const checks = [
      ['Campi anagrafici contratto', validateCompanyStep({ silent: true })],
      ['Dati soggetto / azienda', validateRepresentativeStep({ silent: true })],
      ['Documenti e scadenze', validateDocumentStep({ silent: true })],
      ['Campi operativi', validateActivityStep({ silent: true })],
      ['Campi fiscali / opzioni', validateFiscalStep({ silent: true })],
      ['Firma del contratto', validateSignatureStep({ silent: true })],
    ];

    elements.finalChecklist.innerHTML = checks.map(([label, ok]) => `
      <div class="checklist-item ${ok ? 'is-complete' : ''}">
        <span>${ok ? 'OK' : '...' } ${escapeHtml(label)}</span>
        <span class="checklist-item__icon">${ok ? 'Completato' : 'In attesa'}</span>
      </div>
    `).join('');
    return;
  }
  if (isNovapaySelected()) {
    const checks = [
      ['Dati azienda Novapay', validateCompanyStep({ silent: true })],
      ['Firmatario Novapay', validateRepresentativeStep({ silent: true })],
      ['Firma e luogo/data', validateSignatureStep({ silent: true })],
    ];

    elements.finalChecklist.innerHTML = checks.map(([label, ok]) => `
      <div class="checklist-item ${ok ? 'is-complete' : ''}">
        <span>${ok ? 'OK' : '...' } ${escapeHtml(label)}</span>
        <span class="checklist-item__icon">${ok ? 'Completato' : 'In attesa'}</span>
      </div>
    `).join('');
    return;
  }

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
  const definition = getStepDefinition(stepIndex);
  return definition?.validate ? definition.validate(options) : true;
}

function validateAllRequiredSteps() {
  return getActiveStepIndices().every((index) => validateStep(index, { silent: true }));
}

function goToFirstInvalidStep() {
  const invalidIndex = getActiveStepIndices().find((index) => !validateStep(index, { silent: true }));
  if (invalidIndex >= 0) {
    state.currentStep = invalidIndex;
    refreshUi();
    scrollWizardTop();
  }
}

function validateCompanyStep({ silent = false } = {}) {
  if (isImportedContractSelected()) {
    return validateImportedContractStep(0, { silent });
  }
  if (isNovapaySelected()) {
    let valid = [
      'companyName',
      'vatOrTaxCode',
      'email',
      'phone',
      'legalStreet',
      'legalNumber',
      'legalCap',
      'legalCity',
      'legalProvince',
    ].every((name) => validateNamedField(name, { silent }));
    valid = validateEmailField('email', { silent }) && valid;
    valid = validateRadioField('novapayCompanyType', { silent, message: 'Seleziona la forma giuridica Novapay.' }) && valid;
    return valid;
  }
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
  if (isImportedContractSelected()) {
    return validateImportedContractStep(1, { silent });
  }
  if (isNovapaySelected()) {
    return [
      'representativeFirstName',
      'representativeLastName',
      'representativeTaxCode',
      'birthDate',
      'birthCity',
      'residenceCity',
    ].every((name) => validateNamedField(name, { silent }));
  }
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
  if (isImportedContractSelected()) {
    return validateImportedContractStep(2, { silent });
  }
  if (isNovapaySelected()) {
    return true;
  }
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
  if (isImportedContractSelected()) {
    return validateImportedContractStep(3, { silent });
  }
  if (isNovapaySelected()) {
    return true;
  }
  return [
    'cciaaNumber',
    'cciaaChamber',
    'licenseScia',
    'publicIp',
    'salesContact',
  ].every((name) => validateNamedField(name, { silent }));
}

function validateFiscalStep({ silent = false } = {}) {
  if (isImportedContractSelected()) {
    return validateImportedContractStep(4, { silent });
  }
  if (isNovapaySelected()) {
    return true;
  }
  return Boolean(document.querySelector('input[name="fiscalRegime"]:checked'));
}

function validateAnnexAStep({ silent = false } = {}) {
  if (isImportedContractSelected()) {
    return validateImportedContractStep(5, { silent });
  }
  if (isNovapaySelected()) {
    return true;
  }
  const checked = document.getElementById('annexAConfirmed').checked;
  elements.annexAConfirmedError.textContent = silent || checked ? '' : 'Conferma i dati dell Allegato A per proseguire.';
  return checked;
}

function validateCriminalStep({ silent = false } = {}) {
  if (isImportedContractSelected()) {
    return validateImportedContractStep(6, { silent });
  }
  if (isNovapaySelected()) {
    return true;
  }
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
  if (isImportedContractSelected()) {
    return validateImportedContractStep(7, { silent });
  }
  if (isNovapaySelected()) {
    return true;
  }
  const checked = document.getElementById('antimafiaConfirmed').checked;
  elements.antimafiaConfirmedError.textContent = silent || checked ? '' : 'Conferma i dati dell autocertificazione antimafia per proseguire.';
  return checked;
}

function validateSignatureStep({ silent = false } = {}) {
  if (isImportedContractSelected()) {
    const hasSignatureField = getImportedContractFieldDefinitions().some((field) => field.type === 'signature');
    if (!hasSignatureField) {
      elements.signatureError.textContent = '';
      return true;
    }
  }
  if (isNovapaySelected()) {
    const hasSignature = Boolean(state.signatureDataUrl);
    const hasPlaceAndDate = validateNamedField('placeAndDate', {
      silent,
      customRequiredMessage: 'Compila luogo e data del contratto Novapay.',
    });
    elements.signatureError.textContent = silent || hasSignature ? '' : 'Acquisisci la firma prima di continuare.';
    return hasSignature && hasPlaceAndDate;
  }
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

function validateRadioField(fieldName, { silent = false, message = 'Seleziona una opzione.' } = {}) {
  const radios = Array.from(elements.form.querySelectorAll(`input[name="${CSS.escape(fieldName)}"]`));
  if (!radios.length) {
    return true;
  }
  const checked = radios.find((radio) => radio.checked);
  const firstRadio = radios[0];
  if (checked) {
    clearInvalid(firstRadio);
    return true;
  }
  if (!silent) {
    setInvalid(firstRadio, message);
  } else {
    clearInvalid(firstRadio);
  }
  return false;
}

function getNovapayCompanyTypeLabel(value) {
  const labels = {
    'ditta-individuale': 'Ditta individuale',
    sas: 'SAS',
    snc: 'SNC',
    srl: 'SRL',
    spa: 'SPA',
  };
  return labels[sanitizeText(value)] || 'Da selezionare';
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

  if (contractConfig.importedTemplate) {
    const importedTemplate = await loadImportedTemplateAsset(contractConfig.importedTemplate);
    state.selectedTemplateName = importedTemplate.templateName;
    updateTemplateInfo();
    await setTemplateContext(importedTemplate.bytes, importedTemplate.templateName);
    return importedTemplate.bytes;
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

async function loadImportedTemplateAsset(importedTemplate) {
  const metadata = importedTemplate?.metadata && typeof importedTemplate.metadata === 'object'
    ? importedTemplate.metadata
    : {};
  const templateStorage = metadata.templateStorage && typeof metadata.templateStorage === 'object'
    ? metadata.templateStorage
    : {};
  const templateName = sanitizeText(importedTemplate?.template_name)
    || sanitizeText(importedTemplate?.contract_name)
    || sanitizeText(importedTemplate?.template_hash)
    || 'template-importato.pdf';
  const templateHash = sanitizeText(importedTemplate?.template_hash);
  const blobUrl = sanitizeText(templateStorage.downloadUrl || templateStorage.url);
  const storageMode = sanitizeText(templateStorage.storageMode);

  if (storageMode === 'vercel-blob' && blobUrl) {
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error('Impossibile leggere il template importato da Vercel Blob.');
    }
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      templateName,
    };
  }

  if (templateHash) {
    const response = await fetch(`/api/templates/${encodeURIComponent(templateHash)}`);
    if (!response.ok) {
      throw new Error('Impossibile leggere il template importato dal database.');
    }
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      templateName,
    };
  }

  throw new Error('Template importato non disponibile.');
}

async function fillTemplate(templateBytes, data) {
  const { PDFDocument, StandardFonts } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const form = pdfDoc.getForm();
  const fields = new Map(form.getFields().map((field) => [field.getName(), field]));
  const importedTemplate = getSelectedImportedTemplate();

  if (importedTemplate) {
    await fillImportedContractTemplate(pdfDoc, form, fields, data, importedTemplate, font);
    form.flatten();
    return pdfDoc.save();
  }
  if (isNovapaySelected()) {
    await fillNovapayTemplate(pdfDoc, form, fields, data, font);
    form.flatten();
    return pdfDoc.save();
  }

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
    setTextWithAutoFit(field, normalizeTextCaseForField(value, { key: sourceKey, fieldName: trimmedFieldName }), font);
  });

  if (issueDateValue) {
    issueDateTargets.forEach((fieldName) => {
      setIssueDateField(fields, fieldName, issueDateValue, font);
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

async function fillNovapayTemplate(pdfDoc, form, fields, data, font) {
  const representativeFullName = compactName(data.representativeFirstName, data.representativeLastName);

  Object.entries(NOVAPAY_TEXT_FIELD_MAPPING).forEach(([sourceKey, fieldName]) => {
    const pdfField = fields.get(fieldName);
    if (!pdfField || typeof pdfField.setText !== 'function') {
      return;
    }
    const value = sourceKey === 'birthDate'
      ? formatDate(data[sourceKey])
      : sanitizeText(data[sourceKey]);
    setTextWithAutoFit(pdfField, normalizeTextCaseForField(value, { key: sourceKey, fieldName }), font);
  });

  const representativeField = fields.get('nome-e-cognome-titolare');
  if (representativeField && typeof representativeField.setText === 'function') {
    setTextWithAutoFit(
      representativeField,
      normalizeTextCaseForField(representativeFullName, { key: 'representativeFullName', fieldName: 'nome-e-cognome-titolare' }),
      font,
    );
  }

  NOVAPAY_COMPANY_TYPE_FIELDS.forEach((fieldName) => {
    setCheckboxValue(fields, fieldName, sanitizeText(data.novapayCompanyType) === fieldName);
  });

  if (state.signatureDataUrl) {
    await drawSignatureOnSignatureLines(pdfDoc, form, 'luogo-e-data');
  }
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

function isEmailLikeIdentifier(value) {
  const normalized = sanitizeText(value).toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized === 'email'
    || normalized.includes('email')
    || normalized === 'pec'
    || normalized.includes('pec');
}

function normalizeTextCaseForField(value, { key, fieldName } = {}) {
  const text = sanitizeText(value);
  if (!text) {
    return '';
  }
  if (isEmailLikeIdentifier(key) || isEmailLikeIdentifier(fieldName)) {
    return text.toLowerCase();
  }
  return text.toUpperCase();
}

function normalizeValueCase(value, { key, inputType, trim = true } = {}) {
  const rawText = String(value || '');
  const text = trim ? sanitizeText(rawText) : rawText;
  if (!text) {
    return '';
  }
  if (sanitizeText(inputType).toLowerCase() === 'date') {
    return text;
  }
  if (isEmailLikeIdentifier(key) || sanitizeText(inputType).toLowerCase() === 'email') {
    return text.toLowerCase();
  }
  return text.toUpperCase();
}

function normalizeInputCase(input) {
  if (!input || input.disabled) {
    return;
  }
  if (!input.matches('input, textarea')) {
    return;
  }
  if (input.type === 'file' || input.type === 'checkbox' || input.type === 'radio' || input.type === 'date') {
    return;
  }

  const normalized = normalizeValueCase(input.value, {
    key: input.name || input.id,
    inputType: input.type,
    trim: false,
  });
  if (normalized === input.value) {
    return;
  }

  const selectionStart = typeof input.selectionStart === 'number' ? input.selectionStart : null;
  const selectionEnd = typeof input.selectionEnd === 'number' ? input.selectionEnd : null;
  input.value = normalized;
  if (selectionStart !== null && selectionEnd !== null && typeof input.setSelectionRange === 'function') {
    input.setSelectionRange(selectionStart, selectionEnd);
  }
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

function setIssueDateField(fields, fieldName, fullDateValue, font) {
  const trimmedName = sanitizeText(fieldName);
  if (!trimmedName) {
    return;
  }

  const field = fields.get(trimmedName);
  if (!field || typeof field.setText !== 'function') {
    return;
  }

  const primaryValue = fullDateValue;
  const shortValue = formatDateShortYear(fullDateValue);
  const minWidgetWidth = getMinWidgetWidth(field);

  const preferredValue = minWidgetWidth && minWidgetWidth < 60 ? shortValue : primaryValue;
  const fallbackValue = preferredValue === primaryValue ? shortValue : primaryValue;
  const applied = setTextWithAutoFit(field, preferredValue, font, { minFontSize: 3, maxFontSize: 10, allowTruncate: false });
  if (!applied && fallbackValue && fallbackValue !== preferredValue) {
    setTextWithAutoFit(field, fallbackValue, font, { minFontSize: 3, maxFontSize: 10, allowTruncate: false });
  }
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

function setTextWithAutoFit(field, value, font, options = {}) {
  const text = sanitizeText(value);
  if (!text) {
    field.setText('');
    return true;
  }

  const maxFontSize = Number.isFinite(options.maxFontSize) ? options.maxFontSize : 10;
  const minFontSize = Number.isFinite(options.minFontSize) ? options.minFontSize : 3;
  const allowTruncate = options.allowTruncate === true;
  const minWidgetWidth = getMinWidgetWidth(field);
  const usableWidth = typeof minWidgetWidth === 'number' ? Math.max(0, minWidgetWidth - 6) : null;

  if (!usableWidth || !font || typeof font.widthOfTextAtSize !== 'function' || typeof field.setFontSize !== 'function') {
    field.setText(text);
    if (font && typeof field.updateAppearances === 'function') {
      field.updateAppearances(font);
    }
    return true;
  }

  let chosenSize = maxFontSize;
  while (chosenSize > minFontSize && font.widthOfTextAtSize(text, chosenSize) > usableWidth) {
    chosenSize -= 0.25;
  }

  let finalText = text;
  if (font.widthOfTextAtSize(finalText, chosenSize) > usableWidth) {
    chosenSize = minFontSize;
    if (allowTruncate) {
      const ellipsis = '…';
      let trimmed = finalText;
      while (trimmed.length > 0 && font.widthOfTextAtSize(`${trimmed}${ellipsis}`, minFontSize) > usableWidth) {
        trimmed = trimmed.slice(0, -1);
      }
      finalText = trimmed ? `${trimmed}${ellipsis}` : '';
    }
  }

  const fits = font.widthOfTextAtSize(finalText, chosenSize) <= usableWidth;
  field.setFontSize(chosenSize);
  field.setText(finalText);
  if (typeof field.updateAppearances === 'function') {
    field.updateAppearances(font);
  }
  return fits;
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

function setRadioGroupValue(fields, fieldName, selectedValue) {
  const field = fields.get(fieldName);
  const value = sanitizeText(selectedValue);
  if (!field || typeof field.select !== 'function' || !value) {
    return;
  }
  try {
    field.select(value);
  } catch (_error) {
    // Ignore invalid export value if the PDF radio options differ.
  }
}

async function drawSignatureOnSignatureLines(pdfDoc, form, anchorTextFieldName) {
  const signatureFieldName = sanitizeText(anchorTextFieldName) || 'luogo-e-data';
  const signatureField = form.getTextField(signatureFieldName);
  const trimmedSignatureDataUrl = await getTrimmedSignatureDataUrl(state.signatureDataUrl);
  const signatureSourceImage = await loadImageFromDataUrl(trimmedSignatureDataUrl);
  const signatureBytes = await fetch(trimmedSignatureDataUrl).then((response) => response.arrayBuffer());
  const signatureImage = await pdfDoc.embedPng(signatureBytes);
  const pages = pdfDoc.getPages();
  const widgets = signatureField.acroField.getWidgets();

  widgets.forEach((widget, widgetIndex) => {
    const rect = widget.getRectangle();
    const pageIndex = pages.findIndex((page) => page.ref === widget.P());
    if (pageIndex < 0) {
      return;
    }

    const page = pages[pageIndex];
    const pageNumber = pageIndex + 1;
    const layout = SIGNATURE_LAYOUTS[pageNumber] || SIGNATURE_LAYOUTS.default;
    const maxWidth = layout.fixedWidth || Math.min(layout.maxWidth, rect.width + layout.extraWidth);
    const maxHeight = layout.maxHeight || layout.height;
    const { width, height } = fitImageWithinBox(signatureSourceImage.width, signatureSourceImage.height, maxWidth, maxHeight);
    const x = layout.anchor === 'absolute'
      ? layout.absoluteX
      : layout.anchor === 'field-left'
        ? rect.x + layout.xOffset
        : rect.x + rect.width + layout.xOffset;
    const y = rect.y + layout.yOffset - Math.max(0, (height - layout.height) / 2);
    page.drawImage(signatureImage, {
      x,
      y,
      width,
      height,
    });
  });
}

async function fillImportedContractTemplate(pdfDoc, form, fields, data, importedTemplate, font) {
  const importedFields = getImportedContractFieldDefinitions(importedTemplate);
  for (const field of importedFields) {
    const pdfField = fields.get(field.originalName);
    if (!pdfField || field.type === 'signature') {
      continue;
    }

    const rawValue = data[field.formName];
    await applyImportedPdfFieldValue(pdfField, field, rawValue, font);
  }

  if (state.signatureDataUrl) {
    const signatureFields = importedFields.filter((field) => field.type === 'signature');
    for (const field of signatureFields) {
      await drawSignatureOnNamedField(pdfDoc, form, field.originalName);
    }
  }
}

async function applyImportedPdfFieldValue(pdfField, field, rawValue, font) {
  if (field.type === 'checkbox' && typeof pdfField.check === 'function') {
    if (normalizeImportedCheckboxValue(rawValue)) {
      pdfField.check();
    } else if (typeof pdfField.uncheck === 'function') {
      pdfField.uncheck();
    }
    return;
  }

  const textValue = field.type === 'date'
    ? formatDate(rawValue)
    : sanitizeText(rawValue);

  if ((field.type === 'dropdown' || field.type === 'option-list' || field.type === 'radio') && typeof pdfField.select === 'function') {
    if (!textValue) {
      return;
    }
    try {
      pdfField.select(textValue);
      return;
    } catch (_error) {
      // Fallback to text assignment when the exported value is not available.
    }
  }

  if (typeof pdfField.setText === 'function') {
    const normalized = field.type === 'date'
      ? textValue
      : normalizeTextCaseForField(textValue, { key: field.formName, fieldName: field.originalName });
    setTextWithAutoFit(pdfField, normalized, font);
  }
}

async function drawSignatureOnNamedField(pdfDoc, form, fieldName) {
  const trimmedName = sanitizeText(fieldName);
  if (!trimmedName) {
    return;
  }

  let signatureField = null;
  try {
    signatureField = form.getField(trimmedName);
  } catch (_error) {
    return;
  }

  if (!signatureField?.acroField?.getWidgets) {
    return;
  }

  const trimmedSignatureDataUrl = await getTrimmedSignatureDataUrl(state.signatureDataUrl);
  const signatureSourceImage = await loadImageFromDataUrl(trimmedSignatureDataUrl);
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
    const padding = 4;
    const availableWidth = Math.max(16, rect.width - padding * 2);
    const availableHeight = Math.max(12, rect.height - padding * 2);
    const { width, height } = fitImageWithinBox(
      signatureSourceImage.width,
      signatureSourceImage.height,
      availableWidth,
      availableHeight,
    );
    page.drawImage(signatureImage, {
      x: rect.x + padding + Math.max(0, (availableWidth - width) / 2),
      y: rect.y + padding + Math.max(0, (availableHeight - height) / 2),
      width,
      height,
    });
  });
}

function fitImageWithinBox(sourceWidth, sourceHeight, maxWidth, maxHeight) {
  const safeWidth = Math.max(1, Number(sourceWidth) || 1);
  const safeHeight = Math.max(1, Number(sourceHeight) || 1);
  const safeMaxWidth = Math.max(1, Number(maxWidth) || 1);
  const safeMaxHeight = Math.max(1, Number(maxHeight) || 1);
  const scale = Math.min(safeMaxWidth / safeWidth, safeMaxHeight / safeHeight);

  return {
    width: Math.max(1, safeWidth * scale),
    height: Math.max(1, safeHeight * scale),
  };
}

async function getTrimmedSignatureDataUrl(dataUrl) {
  const preparedDataUrl = await getPreparedSignatureDataUrl(dataUrl);
  const image = await loadImageFromDataUrl(preparedDataUrl);
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

async function getPreparedSignatureDataUrl(dataUrl) {
  const image = await loadImageFromDataUrl(dataUrl);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);

  removeLightBackgroundFromCanvas(sourceCtx, sourceCanvas.width, sourceCanvas.height);
  return sourceCanvas.toDataURL('image/png');
}

function removeLightBackgroundFromCanvas(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];

    if (alpha === 0) {
      continue;
    }

    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const brightness = (red + green + blue) / 3;
    const chroma = maxChannel - minChannel;

    if (brightness >= 248 && chroma <= 18) {
      data[index + 3] = 0;
      continue;
    }

    if (brightness >= 238 && chroma <= 28) {
      const fade = Math.max(0, Math.min(1, (248 - brightness) / 10));
      data[index + 3] = Math.round(alpha * fade);
    }
  }

  ctx.putImageData(imageData, 0, 0);
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
  if (!elements.statusBox) {
    return;
  }
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
  const importedTemplate = (state.importedContractTemplatesCache || [])
    .find((row) => sanitizeText(row?.contract_type) === sanitizeText(contractType));
  if (importedTemplate) {
    const label = sanitizeText(importedTemplate.contract_name)
      || sanitizeText(importedTemplate.template_name)
      || contractType;
    return {
      label,
      directory: 'storage importato',
      templateCandidates: [sanitizeText(importedTemplate.template_name) || 'template-importato.pdf'],
      importedTemplate,
    };
  }
  return CONTRACT_TEMPLATES[contractType] || CONTRACT_TEMPLATES['pvr-vincitu'];
}

function buildImportedContractType(contractName, fallbackId) {
  const normalizedName = sanitizeText(contractName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const normalizedSuffix = sanitizeText(fallbackId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 10);
  const namePart = normalizedName || 'contratto';
  const suffixPart = normalizedSuffix || generateId().replace(/[^a-z0-9]+/g, '').slice(0, 10);
  return `imported-${namePart}-${suffixPart}`;
}

function syncDynamicContractUi({ force = false } = {}) {
  ensureDynamicContractSlots();
  const importedTemplate = getSelectedImportedTemplate();
  const renderKey = importedTemplate ? sanitizeText(importedTemplate.id || importedTemplate.contract_type) : 'default';
  if (!force && state.dynamicContractRenderKey === renderKey) {
    return;
  }

  state.dynamicContractRenderKey = renderKey;
  elements.wizardSteps.forEach((stepElement, stepIndex) => {
    const staticContainer = stepElement.querySelector('[data-static-step-content="true"]');
    const dynamicSlot = stepElement.querySelector(`[data-dynamic-contract-slot="${stepIndex}"]`);
    if (!dynamicSlot) {
      return;
    }

    if (!importedTemplate) {
      if (staticContainer) {
        staticContainer.classList.remove('d-none');
      }
      dynamicSlot.innerHTML = '';
      dynamicSlot.classList.add('d-none');
      return;
    }

    if (staticContainer) {
      staticContainer.classList.toggle('d-none', stepIndex <= 7);
    }
    if (stepIndex >= 9) {
      dynamicSlot.innerHTML = '';
      dynamicSlot.classList.add('d-none');
      return;
    }

    dynamicSlot.classList.remove('d-none');
    dynamicSlot.innerHTML = buildDynamicContractStepMarkup(stepIndex, importedTemplate);
  });
}

function ensureDynamicContractSlots() {
  elements.wizardSteps.forEach((stepElement, stepIndex) => {
    const body = stepElement.querySelector('.step-card__body');
    if (!body) {
      return;
    }

    let staticContainer = body.querySelector('[data-static-step-content="true"]');
    if (!staticContainer) {
      staticContainer = document.createElement('div');
      staticContainer.dataset.staticStepContent = 'true';
      while (body.firstChild) {
        staticContainer.appendChild(body.firstChild);
      }
      body.appendChild(staticContainer);
    }

    if (!body.querySelector(`[data-dynamic-contract-slot="${stepIndex}"]`)) {
      const slot = document.createElement('div');
      slot.dataset.dynamicContractSlot = String(stepIndex);
      slot.className = 'dynamic-contract-slot d-none';
      body.appendChild(slot);
    }
  });
}

function buildDynamicContractStepMarkup(stepIndex, importedTemplate) {
  const fields = getImportedContractFieldDefinitions(importedTemplate)
    .filter((field) => field.stepIndex === stepIndex);
  const title = sanitizeText(importedTemplate?.contract_name) || 'contratto importato';

  if (!fields.length) {
    return `
      <div class="surface-panel">
        <div class="section-heading">Campi del contratto selezionato</div>
        <div class="text-secondary">Nessun campo personalizzato richiesto in questa fase per ${escapeHtml(title)}.</div>
      </div>
    `;
  }

  return `
    <div class="surface-panel">
      <div class="section-heading">Campi del contratto selezionato</div>
      <div class="row g-3">
        ${fields.map((field) => buildDynamicContractFieldMarkup(field)).join('')}
      </div>
    </div>
  `;
}

function buildDynamicContractFieldMarkup(field) {
  const fieldId = `importedField_${sanitizeForDomId(field.formName)}`;
  const helpParts = [
    sanitizeText(field.description),
    sanitizeText(field.originalName) ? `Campo PDF: ${sanitizeText(field.originalName)}` : '',
  ].filter(Boolean);
  const helpText = helpParts.join(' | ');

  if (field.type === 'signature') {
    return `
      <div class="col-12">
        <div class="border rounded-3 p-3 bg-light">
          <div class="fw-semibold">${escapeHtml(field.label)}</div>
          <div class="small text-secondary">${helpText ? escapeHtml(helpText) : 'Questo campo usa la firma acquisita nella fase Firma.'}</div>
        </div>
      </div>
    `;
  }

  if (field.type === 'checkbox') {
    return `
      <div class="col-12">
        <div class="form-check form-switch border rounded-3 p-3">
          <input class="form-check-input" type="checkbox" id="${escapeHtml(fieldId)}" name="${escapeHtml(field.formName)}" data-imported-contract-input="true">
          <label class="form-check-label fw-semibold" for="${escapeHtml(fieldId)}">${escapeHtml(field.label)}</label>
          ${helpText ? `<div class="small text-secondary mt-2">${escapeHtml(helpText)}</div>` : ''}
          <div class="invalid-feedback d-block"></div>
        </div>
      </div>
    `;
  }

  const inputType = field.type === 'date' ? 'date' : 'text';
  return `
    <div class="col-md-6">
      <label for="${escapeHtml(fieldId)}" class="form-label required">${escapeHtml(field.label)}</label>
      <input type="${escapeHtml(inputType)}" class="form-control" id="${escapeHtml(fieldId)}" name="${escapeHtml(field.formName)}" data-imported-contract-input="true" data-required="true">
      ${helpText ? `<div class="form-text">${escapeHtml(helpText)}</div>` : ''}
      <div class="invalid-feedback"></div>
    </div>
  `;
}

function validateImportedContractStep(stepIndex, { silent = false } = {}) {
  const fields = getImportedContractFieldDefinitions()
    .filter((field) => field.stepIndex === stepIndex && field.type !== 'signature');
  if (!fields.length) {
    return true;
  }
  return fields.every((field) => validateImportedContractField(field, { silent }));
}

function validateImportedContractField(field, { silent = false } = {}) {
  const input = elements.form.querySelector(`[name="${CSS.escape(field.formName)}"]`);
  if (!input || input.disabled) {
    return true;
  }

  if (field.type === 'checkbox') {
    clearInvalid(input);
    return true;
  }

  return validateNamedField(field.formName, {
    silent,
    customRequiredMessage: `Compila il campo ${field.label}.`,
  });
}

function getSelectedImportedTemplate() {
  const contractType = sanitizeText(elements.contractType?.value);
  return (state.importedContractTemplatesCache || [])
    .find((row) => sanitizeText(row?.contract_type) === contractType) || null;
}

function isImportedContractSelected() {
  return Boolean(getSelectedImportedTemplate());
}

function getImportedContractFieldDefinitions(importedTemplate = getSelectedImportedTemplate()) {
  const rawFields = Array.isArray(importedTemplate?.fields) ? importedTemplate.fields : [];
  return rawFields
    .map((field) => {
      const originalName = sanitizeText(field?.originalName);
      const customName = sanitizeText(field?.customName) || originalName;
      const type = sanitizeText(field?.type).toLowerCase() || 'text';
      const label = sanitizeText(field?.description)
        || humanizeFieldName(customName)
        || humanizeFieldName(originalName)
        || 'Campo';
      return {
        originalName,
        formName: customName,
        type,
        label,
        description: sanitizeText(field?.description),
        category: sanitizeText(field?.category),
        stepIndex: resolveImportedContractFieldStep({
          originalName,
          customName,
          type,
          category: sanitizeText(field?.category),
          description: sanitizeText(field?.description),
        }),
      };
    })
    .filter((field) => field.originalName && field.formName);
}

function resolveImportedContractFieldStep(field) {
  const type = sanitizeText(field?.type).toLowerCase();
  const category = sanitizeText(field?.category).toLowerCase();
  const searchable = [
    category,
    sanitizeText(field?.customName).toLowerCase(),
    sanitizeText(field?.originalName).toLowerCase(),
    sanitizeText(field?.description).toLowerCase(),
  ].join(' ');

  if (type === 'signature' || /firma|signature/.test(searchable)) {
    return 8;
  }
  if (/azienda|company|societa|ragione|indirizzo|sede|pec|email|telefono|cellulare|cap|comune|provincia/.test(searchable)) {
    return 0;
  }
  if (/rappresentante|titolare|nome|cognome|nascita|residenza|codice-fiscale|tax|owner/.test(searchable)) {
    return 1;
  }
  if (/document|identita|rilascio|scadenza|issuer|allegat|uploads|carta/.test(searchable) || type === 'date') {
    return 2;
  }
  if (/attivita|cciaa|licenza|scia|ip|commerciale|operativ/.test(searchable)) {
    return 3;
  }
  if (/fiscal|regime|iva|vat|checkbox|dropdown|option-list|radio/.test(searchable) || ['checkbox', 'radio', 'dropdown', 'option-list'].includes(type)) {
    return 4;
  }
  if (/allegato a|annex/.test(searchable)) {
    return 5;
  }
  if (/casellario|carichi|pendenti|tribunale|criminal/.test(searchable)) {
    return 6;
  }
  if (/antimafia/.test(searchable)) {
    return 7;
  }
  return 3;
}

function formatImportedSummaryValue(field, rawValue) {
  if (field.type === 'signature') {
    return state.signatureDataUrl ? 'Presente' : 'Da acquisire';
  }
  if (field.type === 'checkbox') {
    return normalizeImportedCheckboxValue(rawValue) ? 'Si' : 'No';
  }
  if (field.type === 'date') {
    return formatDate(rawValue);
  }
  return normalizeTextCaseForField(rawValue, { key: field.formName, fieldName: field.originalName });
}

function normalizeImportedCheckboxValue(value) {
  if (value === true || value === false) {
    return value;
  }
  const normalized = sanitizeText(value).toLowerCase();
  return ['true', '1', 'on', 'yes', 'si', 'x', 'checked'].includes(normalized);
}

function humanizeFieldName(value) {
  return sanitizeText(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sanitizeForDomId(value) {
  return sanitizeText(value).replace(/[^a-zA-Z0-9_-]+/g, '-');
}
