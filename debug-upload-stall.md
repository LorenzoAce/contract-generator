# Debug Session: upload-stall

Status: OPEN

## Symptom
- L'upload del PDF grande si blocca ancora durante il salvataggio del template importato.

## Hypotheses
- H1: La route `api/blob-upload` non riceve il body nel formato atteso.
- H2: Il flusso multipart di Blob non completa correttamente il token exchange o il completion callback.
- H3: La configurazione ambiente Blob e' incoerente rispetto allo store collegato.
- H4: Il client fallisce nella chiamata a `/api/blob-upload` o nell'import dinamico del modulo Blob.
- H5: La function serverless risponde con un payload/headers non compatibili con `handleUpload`.

## Evidence Log
- Debug collector fallback Node avviato su `http://127.0.0.1:7777/event`.
- Harness locale eseguito contro `api/blob-upload` con body `blob.generate-client-token`.
- Evidenza 1: la route entra correttamente e il body viene parsato (`bodyType=blob.generate-client-token`, payload presente).
- Evidenza 2: prima del fix compariva il warning runtime di Blob su `onUploadCompleted` senza callback URL determinabile.
- Evidenza 3: dopo la rimozione di `onUploadCompleted`, il warning sparisce; resta solo l'errore atteso `Invalid token parameter` dovuto al token fittizio usato nel test.
- Evidenza 4: aggiunto un probe esplicito lato client verso `/api/blob-upload` prima dell'upload reale e uno stato di avanzamento percentuale per distinguere fra blocco nel token exchange e blocco nel trasferimento verso Blob.
- Evidenza 5: il probe passa in produzione e l'interfaccia resta ferma su `Endpoint Blob verificato. Avvio upload diretto...`, quindi il blocco e' dopo il token exchange e prima dell'avanzamento trasferimento. Fix minimo applicato: disattivazione del ramo `multipart` lato client per usare upload diretto standard verso Blob.
- Evidenza 6: anche senza multipart il trasferimento arriva a `99%` e si ferma durante la finalizzazione dell'operazione `upload()`. Nuovo fix basato sulle prove: migrazione al flusso `generateClientTokenFromReadWriteToken()` + `put()` client, che evita il percorso `upload()/handleUpload` sospetto nella fase finale.

## Hypothesis Status
- H1: Respinta. Il body arriva nel formato atteso.
- H2: Parzialmente confermata. Il completion callback non usato introduceva dipendenza non necessaria nel token exchange.
- H3: Non ancora determinata con prova locale reale; richiede test con token Blob valido in deploy.
- H4: Non supportata dalle prove raccolte finora.
- H5: Confermata in parte. La fase critica era il callback automatico di completion, non il parsing iniziale della request.
- H2: Rafforzata. Le prove puntano ora al ramo multipart del trasferimento client → Blob come causa piu probabile del blocco.
- H2: Aggiornata. Il blocco non dipende solo dal multipart; le prove puntano alla fase finale del flusso `upload()` stesso. Il nuovo esperimento isola quella fase passando a `put()` con client token.
